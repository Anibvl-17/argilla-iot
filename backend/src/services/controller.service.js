import crypto from "crypto";
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";
import { CONTROLLER_LINK_STATUS } from "../constants/controller.constants.js";
import {
  clearSwitchState,
  presentController,
  setSwitchState,
} from "../utils/entityPresentation.js";

const HASH_ROUNDS = 10;
const PIN_TTL_MS = 15 * 60 * 1000;
const BLOCK_MS = 2 * 60 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 10;

function serviceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function normalizeDates(data) {
  return {
    ...data,
    ...(data.manufacturedAt !== undefined
      ? { manufacturedAt: new Date(data.manufacturedAt) }
      : {}),
    ...(data.deliveredAt !== undefined
      ? { deliveredAt: data.deliveredAt ? new Date(data.deliveredAt) : null }
      : {}),
    ...(data.firmwareUpdatedAt !== undefined
      ? {
          firmwareUpdatedAt: data.firmwareUpdatedAt
            ? new Date(data.firmwareUpdatedAt)
            : null,
        }
      : {}),
  };
}

function decorateController(controller) {
  if (!controller) return controller;
  const linkStatus = controller.kiln && controller.user
    ? CONTROLLER_LINK_STATUS.LINKED_TO_KILN_AND_USER
    : controller.kiln
      ? CONTROLLER_LINK_STATUS.LINKED_TO_KILN
      : controller.user
        ? CONTROLLER_LINK_STATUS.LINKED_TO_USER
        : CONTROLLER_LINK_STATUS.UNLINKED;
  return { ...presentController(controller), linkStatus };
}

export async function create(data) {
  const deviceSecret = crypto.randomBytes(32).toString("base64url");
  const deviceSecretHash = await bcrypt.hash(deviceSecret, HASH_ROUNDS);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const controller = await prisma.controller.create({
        data: {
          controllerId: crypto.randomUUID(),
          ...normalizeDates(data),
          deviceSecretHash,
        },
        include: { kiln: true, user: true },
      });
      return { ...decorateController(controller), deviceSecret };
    } catch (error) {
      if (error.code !== "P2002" || attempt === 4) throw error;
    }
  }
}

export async function edit(controllerId, data) {
  const normalizedData = normalizeDates(data);
  const current = await prisma.controller.findUnique({
    where: { controllerId },
    include: { kiln: { select: { nominalCurrent: true } } },
  });
  if (!current) throw serviceError("P2025", "Controlador no encontrado");
  if (
    current.kiln &&
    normalizedData.switchCurrentCapacity != null &&
    normalizedData.switchCurrentCapacity < current.kiln.nominalCurrent
  ) {
    throw serviceError(
      "INCOMPATIBLE_KILN_AMPERAGE",
      `El horno vinculado requiere al menos ${current.kiln.nominalCurrent}A`,
    );
  }
  return decorateController(
    await prisma.controller.update({
      where: { controllerId },
      data: normalizedData,
      include: { kiln: true, user: true },
    }),
  );
}

export async function remove(controllerId) {
  const controller = await prisma.controller.findUnique({ where: { controllerId } });
  if (!controller) return false;
  await prisma.controller.delete({ where: { controllerId } });
  clearSwitchState(controllerId);
  return true;
}

export async function receivePairingPin(controllerId, pin, deviceSecret) {
  const authenticated = await prisma.controller.findUnique({
    where: { controllerId },
    select: { deviceSecretHash: true },
  });
  if (!authenticated || !(await bcrypt.compare(deviceSecret, authenticated.deviceSecretHash))) {
    throw serviceError("PAIRING_AUTH_FAILED", "Credencial de dispositivo inválida");
  }
  const pairingPinHash = await bcrypt.hash(pin, HASH_ROUNDS);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "controllerId" FROM "Controller" WHERE "controllerId" = ${controllerId} FOR UPDATE`;
    const controller = await tx.controller.findUnique({ where: { controllerId } });
    if (controller.operationalStatus !== "OPERATIONAL") {
      throw serviceError("PAIRING_NOT_OPERATIONAL", "El controlador no está operacional");
    }
    const now = new Date();
    if (controller.pairingBlockedUntil && controller.pairingBlockedUntil > now) {
      const error = serviceError("PAIRING_BLOCKED", "La vinculación está bloqueada");
      error.blockedUntil = controller.pairingBlockedUntil;
      throw error;
    }
    const expiresAt = new Date(now.getTime() + PIN_TTL_MS);
    await tx.controller.update({
      where: { controllerId },
      data: {
        pairingPinHash,
        pairingPinExpiresAt: expiresAt,
        ...(controller.pairingBlockedUntil && controller.pairingBlockedUntil <= now
          ? { pairingFailedAttempts: 0, pairingBlockedUntil: null }
          : {}),
      },
    });
    return { status: "READY", expiresAt };
  });
}

export async function claimControllerBundle(partialControllerId, userId, pin) {
  const result = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw`
      SELECT "controllerId" FROM "Controller"
      WHERE RIGHT("controllerId", 6) = ${partialControllerId}
      FOR UPDATE
    `;
    if (locked.length !== 1) {
      throw serviceError("PAIRING_NOT_FOUND", "Controlador no encontrado");
    }
    const controller = await tx.controller.findUnique({
      where: { controllerId: locked[0].controllerId },
      include: { kiln: true },
    });
    const now = new Date();
    if (controller.pairingBlockedUntil && controller.pairingBlockedUntil > now) {
      const error = serviceError("PAIRING_BLOCKED", "La vinculación está bloqueada temporalmente");
      error.blockedUntil = controller.pairingBlockedUntil;
      error.controllerId = controller.controllerId;
      throw error;
    }
    if (!controller.pairingPinHash || !controller.pairingPinExpiresAt || controller.pairingPinExpiresAt <= now) {
      throw serviceError("PAIRING_PIN_EXPIRED", "El PIN no existe o está vencido");
    }
    const matches = await bcrypt.compare(pin, controller.pairingPinHash);
    if (!matches) {
      const failedAttempts = controller.pairingFailedAttempts + 1;
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        const blockedUntil = new Date(now.getTime() + BLOCK_MS);
        await tx.controller.update({
          where: { controllerId: controller.controllerId },
          data: {
            pairingFailedAttempts: failedAttempts,
            pairingBlockedUntil: blockedUntil,
            pairingPinHash: null,
            pairingPinExpiresAt: null,
          },
        });
        const error = serviceError("PAIRING_BLOCKED", "Se alcanzó el límite de intentos");
        error.blockedUntil = blockedUntil;
        error.controllerId = controller.controllerId;
        return { error };
      }
      await tx.controller.update({
        where: { controllerId: controller.controllerId },
        data: { pairingFailedAttempts: { increment: 1 } },
      });
      return { error: serviceError("PAIRING_PIN_INVALID", "PIN incorrecto") };
    }
    if (!controller.kiln) {
      throw serviceError("PAIRING_KILN_REQUIRED", "El controlador no tiene un horno asociado");
    }
    if (![null, userId].includes(controller.userId) || ![null, userId].includes(controller.kiln.userId)) {
      throw serviceError("PAIRING_OWNED", "Los equipos pertenecen a otro usuario");
    }
    const user = await tx.user.findUnique({ where: { userId } });
    if (!user || !user.isActive || user.anonymizedAt || user.role !== "CLIENT") {
      throw serviceError("PAIRING_USER_INVALID", "El cliente no está habilitado");
    }
    await tx.kiln.update({ where: { kilnId: controller.kiln.kilnId }, data: { userId } });
    const claimed = await tx.controller.update({
      where: { controllerId: controller.controllerId },
      data: {
        userId,
        pairingPinHash: null,
        pairingPinExpiresAt: null,
        pairingFailedAttempts: 0,
        pairingBlockedUntil: null,
      },
      include: { kiln: true, user: true },
    });
    return { controller: decorateController(claimed) };
  });
  if (result.error) throw result.error;
  return result.controller;
}

export async function updateControllerTelemetry(controllerId, data) {
  const controller = await prisma.controller.update({
    where: { controllerId },
    data: { temperature: data.temperature },
    select: {
      controllerId: true,
      userId: true,
      connectionStatus: true,
      temperature: true,
      switchCurrentCapacity: true,
      kiln: { select: { kilnId: true } },
    },
  });
  if (data.relayState) setSwitchState(controllerId, data.relayState);
  return { ...presentController(controller), telemetrySaved: false };
}

export async function updateControllerConnectionStatus(controllerId, connectionStatus) {
  const controller = await prisma.controller.update({
    where: { controllerId },
    data: { connectionStatus },
    select: {
      controllerId: true,
      userId: true,
      connectionStatus: true,
      temperature: true,
      switchCurrentCapacity: true,
      kiln: { select: { kilnId: true } },
    },
  });
  return presentController(controller);
}

export async function updateControllerSwitchState(controllerId, switchState) {
  const controller = await prisma.controller.findUniqueOrThrow({
    where: { controllerId },
    select: {
      controllerId: true,
      userId: true,
      connectionStatus: true,
      temperature: true,
      switchCurrentCapacity: true,
      kiln: { select: { kilnId: true } },
    },
  });
  setSwitchState(controllerId, switchState);
  return presentController(controller);
}

export function getControllerCommandTarget(controllerId) {
  return prisma.controller.findUnique({
    where: { controllerId },
    select: { controllerId: true, userId: true, connectionStatus: true, kiln: { select: { kilnId: true } } },
  });
}

export async function getControllersPage({
  userId,
  page = 1,
  pageSize = 10,
  search = "",
  connectionStatus,
  kilnStatus,
  operationalStatusFilter,
} = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 10));
  const normalizedSearch = String(search || "").trim();
  const normalizedControllerSearch = normalizedSearch.replace(/^\.\.\./, "");
  const kilnIdSearch = normalizedSearch.startsWith("#")
    ? Number(normalizedSearch.slice(1).trim())
    : null;
  const normalizedOperationalStatus = [
    "OPERATIONAL",
    "MAINTENANCE",
    "OUT_OF_SERVICE",
  ].includes(operationalStatusFilter)
    ? operationalStatusFilter
    : undefined;
  const scopeWhere = {
    ...(userId != null ? { userId } : {}),
    ...(normalizedOperationalStatus
      ? { operationalStatus: normalizedOperationalStatus }
      : {}),
  };
  const searchWhere = normalizedSearch
    ? normalizedSearch.startsWith("#")
      ? {
          kiln: {
            is: {
              kilnId:
                Number.isInteger(kilnIdSearch) && kilnIdSearch > 0
                  ? kilnIdSearch
                  : -1,
            },
          },
        }
      : {
          OR: [
            ...(normalizedControllerSearch
              ? [
                  {
                    controllerId: {
                      endsWith: normalizedControllerSearch,
                      mode: "insensitive",
                    },
                  },
                ]
              : []),
            {
              user: {
                is: {
                  OR: [
                    {
                      name: {
                        contains: normalizedSearch,
                        mode: "insensitive",
                      },
                    },
                    {
                      email: {
                        contains: normalizedSearch,
                        mode: "insensitive",
                      },
                    },
                  ],
                },
              },
            },
          ],
        }
    : {};
  const where = {
    ...scopeWhere,
    ...searchWhere,
    ...(["ONLINE", "OFFLINE"].includes(connectionStatus) ? { connectionStatus } : {}),
    ...(kilnStatus === "linked" ? { kiln: { isNot: null } } : {}),
    ...(kilnStatus === "unlinked" ? { kiln: { is: null } } : {}),
  };
  const [items, total, scopeTotal, linkedToKiln, linkedToUser, fullyLinked] = await prisma.$transaction([
    prisma.controller.findMany({ where, include: { kiln: true, user: true }, orderBy: { controllerId: "asc" }, skip: (safePage - 1) * safePageSize, take: safePageSize }),
    prisma.controller.count({ where }),
    prisma.controller.count({ where: scopeWhere }),
    prisma.controller.count({ where: { ...scopeWhere, kiln: { isNot: null } } }),
    prisma.controller.count({ where: { ...scopeWhere, user: { isNot: null } } }),
    prisma.controller.count({ where: { ...scopeWhere, kiln: { isNot: null }, user: { isNot: null } } }),
  ]);
  return {
    items: items.map(decorateController),
    pagination: { page: safePage, pageSize: safePageSize, total, totalPages: Math.max(1, Math.ceil(total / safePageSize)) },
    summary: { total: scopeTotal, linkedToKiln, linkedToUser, fullyLinked },
  };
}
