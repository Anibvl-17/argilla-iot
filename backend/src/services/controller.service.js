import { prisma } from "../config/prisma.js";
import { CONTROLLER_LINK_STATUS } from "../constants/controller.constants.js";
import crypto from "crypto";
import bcrypt from "bcrypt";
import {
  clearRelayState,
  normalizeControllerInput,
  presentController,
  setRelayState,
} from "../utils/legacyCompatibility.js";

const HASH_ROUNDS = 10;
const PAIRING_PIN_TTL_MS = 15 * 60 * 1000;

function getControllerLinkStatus(controller) {
  if (controller.kiln && controller.user) {
    return CONTROLLER_LINK_STATUS.LINKED_TO_KILN_AND_USER;
  }

  if (controller.kiln) {
    return CONTROLLER_LINK_STATUS.LINKED_TO_KILN;
  }

  if (controller.user) {
    return CONTROLLER_LINK_STATUS.LINKED_TO_USER;
  }

  return CONTROLLER_LINK_STATUS.UNLINKED;
}

function decorateController(controller) {
  if (!controller) {
    return controller;
  }

  const linkStatus = getControllerLinkStatus(controller);

  return {
    ...presentController(controller),
    linkStatus,
    status: linkStatus,
  };
}

function decorateControllers(controllers) {
  return controllers.map((controller) => decorateController(controller));
}

/**
 * Crea un controlador de forma lógica. El UUID generado se asigna al
 * controlador físico para ser vinculado posteriormente.
 */
export async function create(data) {
  const deviceSecret = crypto.randomBytes(32).toString("base64url");
  const deviceSecretHash = await bcrypt.hash(deviceSecret, HASH_ROUNDS);
  const controller = await prisma.controller.create({
    data: {
      ...normalizeControllerInput(data),
      deviceSecretHash,
    },
  });

  return { ...decorateController(controller), deviceSecret };
}

export async function edit(controllerId, data) {
  const normalizedData = normalizeControllerInput(data);
  const currentController = await prisma.controller.findUnique({
    where: { controllerId },
    include: { kiln: { select: { nominalCurrent: true } } },
  });

  if (!currentController) {
    const error = new Error("Controlador no encontrado");
    error.code = "P2025";
    throw error;
  }

  if (
    currentController.kiln &&
    normalizedData.switchCurrentCapacity != null &&
    normalizedData.switchCurrentCapacity < currentController.kiln.nominalCurrent
  ) {
    const error = new Error(
      `El horno vinculado requiere al menos ${currentController.kiln.nominalCurrent}A. Desvincula el controlador del horno antes de reducir su amperaje.`,
    );
    error.code = "INCOMPATIBLE_KILN_AMPERAGE";
    throw error;
  }

  const controller = await prisma.controller.update({
    where: { controllerId },
    data: normalizedData,
  });

  return decorateController(controller);
}

export async function remove(controllerId) {
  const controllerToRemove = await prisma.controller.findUnique({
    where: { controllerId },
    include: { kiln: true },
  });

  if (!controllerToRemove) return false;

  if (controllerToRemove.kiln) {
    await prisma.kiln.update({
      where: { kilnId: controllerToRemove.kiln.kilnId },
      data: {
        controller: { disconnect: true },
      },
    });
  }

  await prisma.controller.delete({
    where: { controllerId },
  });
  clearRelayState(controllerId);

  return true;
}

/**
 * Genera un pin de 6 digitos
 *
 * @param {string} uuid UUID del controlador
 * @returns PIN aleatorio
 */
export async function generatePin(uuid) {
  const pin = crypto.randomInt(100000, 1000000);
  const pairingPinHash = await bcrypt.hash(String(pin), HASH_ROUNDS);

  await prisma.controller.update({
    where: { controllerId: uuid },
    data: {
      pairingPinHash,
      pairingPinExpiresAt: new Date(Date.now() + PAIRING_PIN_TTL_MS),
    },
  });

  return pin;
}

/**
 * Limpia el PIN temporal del controlador una vez consumido.
 *
 * @param {string} id UUID del Controlador
 * @returns El Controlador actualizado
 */
export async function clearPin(id) {
  const controller = await prisma.controller.update({
    where: { controllerId: id },
    data: {
      pairingPinHash: null,
      pairingPinExpiresAt: null,
    },
  });

  return presentController(controller);
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

  if (data.relayState) setRelayState(controllerId, data.relayState);
  // la telemetria ahora corresponde a un ciclo de quema, la persistencia se 
  // implementará más adelante
  return { ...presentController(controller), telemetrySaved: false };
}

export async function updateControllerConnectionStatus(
  controllerId,
  connectionStatus,
) {
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

export async function updateControllerOperativeStatus(
  controllerId,
  operativeStatus,
) {
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

  setRelayState(controllerId, operativeStatus);
  return presentController(controller);
}

export async function getControllerCommandTarget(controllerId) {
  return await prisma.controller.findUnique({
    where: { controllerId },
    select: {
      controllerId: true,
      userId: true,
      connectionStatus: true,
      kiln: { select: { kilnId: true } },
    },
  });
}

export async function getAllControllers() {
  const controllers = await prisma.controller.findMany({
    include: { kiln: true, user: true },
  });

  return decorateControllers(controllers);
}

export async function getControllersForUser(userId) {
  const controllers = await prisma.controller.findMany({
    where: { userId },
    include: { kiln: true, user: true },
  });

  return decorateControllers(controllers);
}

export async function getControllersPage({
  userId,
  page = 1,
  pageSize = 10,
  search = "",
  connectionStatus,
  operativeStatus,
  kilnStatus,
} = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 10));
  const normalizedSearch = String(search || "").trim();
  const safeConnectionStatus = ["ONLINE", "OFFLINE"].includes(connectionStatus)
    ? connectionStatus
    : undefined;
  const safeOperativeStatus = ["ON", "OFF"].includes(operativeStatus)
    ? operativeStatus
    : undefined;
  const where = {
    ...(userId != null ? { userId } : {}),
    ...(normalizedSearch
      ? {
          controllerId: {
            contains: normalizedSearch,
            mode: "insensitive",
          },
        }
      : {}),
    ...(safeOperativeStatus
      ? { connectionStatus: "ONLINE" }
      : safeConnectionStatus
        ? { connectionStatus: safeConnectionStatus }
        : {}),
    ...(kilnStatus === "linked" ? { kiln: { isNot: null } } : {}),
    ...(kilnStatus === "unlinked" ? { kiln: { is: null } } : {}),
  };
  const scopeWhere = userId != null ? { userId } : {};

  const [items, total, scopeTotal, linkedToKiln, linkedToUser, fullyLinked] =
    await prisma.$transaction([
      prisma.controller.findMany({
        where,
        include: { kiln: true, user: true },
        orderBy: { controllerId: "asc" },
        ...(safeOperativeStatus
          ? {}
          : {
              skip: (safePage - 1) * safePageSize,
              take: safePageSize,
            }),
      }),
      prisma.controller.count({ where }),
      prisma.controller.count({ where: scopeWhere }),
      prisma.controller.count({
        where: { ...scopeWhere, kiln: { isNot: null } },
      }),
      prisma.controller.count({
        where: { ...scopeWhere, user: { isNot: null } },
      }),
      prisma.controller.count({
        where: {
          ...scopeWhere,
          kiln: { isNot: null },
          user: { isNot: null },
        },
      }),
    ]);

  const decoratedItems = decorateControllers(items);
  const statusFilteredItems = safeOperativeStatus
    ? decoratedItems.filter(
        (controller) => controller.operativeStatus === safeOperativeStatus,
      )
    : decoratedItems;
  const filteredTotal = safeOperativeStatus ? statusFilteredItems.length : total;
  const visibleItems = safeOperativeStatus
    ? statusFilteredItems.slice(
        (safePage - 1) * safePageSize,
        safePage * safePageSize,
      )
    : statusFilteredItems;

  return {
    items: visibleItems,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total: filteredTotal,
      totalPages: Math.max(1, Math.ceil(filteredTotal / safePageSize)),
    },
    summary: { total: scopeTotal, linkedToKiln, linkedToUser, fullyLinked },
  };
}

/**
 * Vincula un Usuario a un Controlador. Utiliza los últimos 6 caracteres del
 * UUID del controlador para identificarlo. Debe existir un PIN.
 *
 * @param {number} userId
 * @param {string} partialControllerId
 * @param {number} pin
 * @returns El Controlador actualizado
 */
export async function linkControllerToUser(partialControllerId, userId, pin) {
  return await prisma.$transaction(async (tx) => {
    const controller = await tx.controller.findFirst({
      where: { controllerId: { endsWith: partialControllerId } },
      include: { kiln: true },
    });

    const pairingIsValid =
      controller?.pairingPinHash &&
      controller.pairingPinExpiresAt &&
      controller.pairingPinExpiresAt.getTime() > Date.now() &&
      (await bcrypt.compare(String(pin), controller.pairingPinHash));

    if (!pairingIsValid) {
      throw new Error("Credenciales incorrectas");
    }

    const user = await tx.user.findUnique({ where: { userId } });

    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    // ---- Clausulas de Guarda ----
    if (controller.userId !== null) {
      throw new Error("El controlador ya tiene un propietario");
    }

    if (
      controller.kiln &&
      controller.kiln.userId !== null &&
      controller.kiln.userId !== userId
    ) {
      throw new Error("El horno asociado pertenece a otro usuario");
    }

    // ---- Fin Clausulas de Guarda ----

    const claimedController = await tx.controller.update({
      where: { controllerId: controller.controllerId },
      data: {
        user: { connect: { userId } },
        pairingPinHash: null,
        pairingPinExpiresAt: null,
      },
    });

    if (controller.kiln) {
      await tx.kiln.update({
        where: { kilnId: controller.kiln.kilnId },
        data: { user: { connect: { userId } } },
      });
    }

    return presentController(claimedController);
  });
}

/**
 * Desvincula un Controlador de un Usuario.
 *
 * @param {number} userId
 * @param {number} controllerId
 * @returns El controlador actualizado
 */
export async function unlinkUserFromController(userId, controllerId) {
  return await prisma.$transaction(async (tx) => {
    const controller = await tx.controller.findUnique({
      where: { controllerId },
      include: { kiln: true },
    });

    if (!controller) {
      throw new Error("Controlador no encontrado");
    }

    if (controller.userId !== userId) {
      throw new Error("El controlador no pertenece a este usuario");
    }

    const updatedController = await tx.controller.update({
      where: { controllerId },
      data: { user: { disconnect: true } },
    });

    if (controller.kiln && controller.kiln.userId === userId) {
      await tx.kiln.update({
        where: { kilnId: controller.kiln.kilnId },
        data: { user: { disconnect: true } },
      });
    }

    return presentController(updatedController);
  });
}
