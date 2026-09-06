import { prisma } from "../config/prisma.js";
import {
  presentController as presentControllerEntity,
  presentKiln as presentKilnEntity,
} from "../utils/entityPresentation.js";

function normalizeDates(data) {
  return {
    ...data,
    ...(data.manufacturedAt !== undefined
      ? { manufacturedAt: new Date(data.manufacturedAt) }
      : {}),
    ...(data.deliveredAt !== undefined
      ? { deliveredAt: data.deliveredAt ? new Date(data.deliveredAt) : null }
      : {}),
  };
}

export async function createKiln(kilnData) {
  const kiln = await prisma.kiln.create({
    data: normalizeDates(kilnData),
  });

  return presentKilnEntity(kiln);
}

/** Actualiza únicamente los metadatos canónicos editables de un horno. */
export async function edit(kilnId, data) {
  const normalizedData = normalizeDates(data);
  const currentKiln = await prisma.kiln.findUnique({
    where: { kilnId },
    include: { controller: { select: { switchCurrentCapacity: true } } },
  });

  if (!currentKiln) {
    const error = new Error("Horno no encontrado");
    error.code = "P2025";
    throw error;
  }

  if (
    currentKiln.controller &&
    normalizedData.nominalCurrent != null &&
    normalizedData.nominalCurrent >
      currentKiln.controller.switchCurrentCapacity
  ) {
    const error = new Error(
      `El controlador vinculado soporta hasta ${currentKiln.controller.switchCurrentCapacity}A. Desvincula el controlador del horno antes de aumentar su amperaje.`,
    );
    error.code = "INCOMPATIBLE_CONTROLLER_AMPERAGE";
    throw error;
  }

  const kiln = await prisma.kiln.update({
    where: {
      kilnId,
    },
    data: normalizedData,
  });

  return presentKilnEntity(kiln);
}

/**
 * Elimina un Horno de la base de datos. Al eliminarse, se desvincula del
 * usuario y/o controlador si estuviera enlazado, y elimina la telemetría si
 * existiera.
 *
 * @param {number} kilnId El ID del Horno
 * @returns true si se elimina exitosamente, false si no se encuentra el Horno.
 */
export async function remove(kilnId) {
  const kilnToRemove = await prisma.kiln.findUnique({
    where: { kilnId },
    include: { controller: true },
  });

  if (!kilnToRemove) {
    return false;
  }

  if (kilnToRemove.controller) {
    await prisma.kiln.update({
      where: { kilnId },
      data: {
        controller: {
          disconnect: true,
        },
      },
    });
  }

  await prisma.kiln.delete({ where: { kilnId } });

  return true;
}

export async function getAllKilns() {
  const kilns = await prisma.kiln.findMany({
    include: { user: true, controller: true },
  });

  return kilns.map(presentKilnEntity);
}

export async function getKilnsPage({
  page = 1,
  pageSize = 10,
  search = "",
  operationalStatusFilter,
} = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 10));
  const normalizedSearch = String(search || "").trim();
  const numericSearch = Number(normalizedSearch);
  const allowedOperationalStatuses = [
    "OPERATIONAL",
    "MAINTENANCE",
    "OUT_OF_SERVICE",
  ];
  const normalizedOperationalStatus = allowedOperationalStatuses.includes(
    operationalStatusFilter,
  )
    ? operationalStatusFilter
    : undefined;
  const filterWhere = normalizedOperationalStatus
    ? { operationalStatus: normalizedOperationalStatus }
    : {};
  const where = {
    ...filterWhere,
    ...(normalizedSearch
      ? {
          OR: [
          ...(Number.isInteger(numericSearch)
            ? [{ kilnId: numericSearch }]
            : []),
          {
            manufacturer: {
              contains: normalizedSearch,
              mode: "insensitive",
            },
          },
          {
            user: {
              is: {
                OR: [
                  { name: { contains: normalizedSearch, mode: "insensitive" } },
                  {
                    email: { contains: normalizedSearch, mode: "insensitive" },
                  },
                ],
              },
            },
          },
          {
            controller: {
              is: {
                controllerId: {
                  contains: normalizedSearch,
                  mode: "insensitive",
                },
              },
            },
          },
          ],
        }
      : {}),
  };

  const [items, total, scopeTotal, withoutController, withoutOwner] =
    await prisma.$transaction([
      prisma.kiln.findMany({
        where,
        include: { user: true, controller: true },
        orderBy: { kilnId: "asc" },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
      }),
      prisma.kiln.count({ where }),
      prisma.kiln.count({ where: filterWhere }),
      prisma.kiln.count({
        where: { ...filterWhere, controller: { is: null } },
      }),
      prisma.kiln.count({ where: { ...filterWhere, user: { is: null } } }),
    ]);

  return {
    items: items.map(presentKilnEntity),
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    },
    summary: { total: scopeTotal, withoutController, withoutOwner },
  };
}

const controllerSelection = {
  controllerId: true,
  temperature: true,
  connectionStatus: true,
  activityStatus: true,
  operationalStatus: true,
  switchType: true,
  switchCurrentCapacity: true,
  manufacturedAt: true,
  deliveredAt: true,
  firmwareVersion: true,
  firmwareUpdatedAt: true,
};

function presentController(controller) {
  if (!controller) return null;

  const { controllerId } = controller;
  return {
    ...presentControllerEntity(controller, { hideControllerId: true }),
    controllerCode: controllerId.slice(-6),
  };
}

function presentKiln(kiln) {
  const { controller, ...kilnWithoutController } = kiln;
  return {
    ...presentKilnEntity(kilnWithoutController),
    controller: presentController(controller),
  };
}

export async function getKilnsByUserId(userId) {
  const [kilns, unlinkedControllers] = await prisma.$transaction([
    prisma.kiln.findMany({
      where: { userId },
      select: {
        kilnId: true,
        name: true,
        liters: true,
        phaseCount: true,
        nominalVoltage: true,
        nominalCurrent: true,
        manufacturedAt: true,
        deliveredAt: true,
        operationalStatus: true,
        manufacturer: true,
        heatingCircuitConfiguration: true,
        controller: { select: controllerSelection },
      },
      orderBy: { kilnId: "asc" },
    }),
    prisma.controller.findMany({
      where: { userId, kiln: null },
      select: controllerSelection,
      orderBy: { controllerId: "asc" },
    }),
  ]);

  return {
    kilns: kilns.map(presentKiln),
    unlinkedControllers: unlinkedControllers.map(presentController),
  };
}

export async function getUserKilnById(userId, kilnId) {
  const kiln = await prisma.kiln.findFirst({
    where: { kilnId, userId },
    select: {
      kilnId: true,
      name: true,
      liters: true,
      phaseCount: true,
      nominalVoltage: true,
      nominalCurrent: true,
      manufacturedAt: true,
      deliveredAt: true,
      operationalStatus: true,
      manufacturer: true,
      heatingCircuitConfiguration: true,
      controller: { select: controllerSelection },
    },
  });

  return kiln ? presentKiln(kiln) : null;
}

export async function renameUserKiln(userId, kilnId, name) {
  const ownedKiln = await prisma.kiln.findFirst({
    where: { kilnId, userId },
    select: { kilnId: true },
  });

  if (!ownedKiln) return null;

  const kiln = await prisma.kiln.update({
    where: { kilnId },
    data: { name },
    select: {
      kilnId: true,
      name: true,
      liters: true,
      phaseCount: true,
      nominalVoltage: true,
      nominalCurrent: true,
      manufacturedAt: true,
      deliveredAt: true,
      operationalStatus: true,
      manufacturer: true,
      heatingCircuitConfiguration: true,
      controller: { select: controllerSelection },
    },
  });

  return presentKiln(kiln);
}

export async function getOwnedKilnController(userId, kilnId) {
  const kiln = await prisma.kiln.findFirst({
    where: { kilnId, userId },
    select: {
      kilnId: true,
      controller: {
        select: {
          controllerId: true,
          temperature: true,
          connectionStatus: true,
          switchCurrentCapacity: true,
        },
      },
    },
  });

  if (!kiln || !kiln.controller) return null;

  return presentControllerEntity(kiln.controller);
}

export async function getOwnedKilnTelemetry(
  userId,
  kilnId,
  page = 1,
  pageSize = 10,
) {
  const kiln = await prisma.kiln.findFirst({
    where: { kilnId, userId },
    select: { kilnId: true },
  });

  if (!kiln) return null;

  const safePage = Math.max(1, page);
  const safePageSize = Math.min(50, Math.max(1, pageSize));
  const skip = (safePage - 1) * safePageSize;

  const [items, total] = await prisma.$transaction([
    prisma.telemetry.findMany({
      where: { firingCycle: { kilnId } },
      orderBy: { timestamp: "desc" },
      skip,
      take: safePageSize,
    }),
    prisma.telemetry.count({ where: { firingCycle: { kilnId } } }),
  ]);

  return {
    items,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    },
  };
}

export async function getAdminKilnById(kilnId) {
  const kiln = await prisma.kiln.findUnique({
    where: { kilnId },
    include: { user: true, controller: true },
  });

  return presentKilnEntity(kiln);
}

export async function getAdminKilnTelemetry(kilnId, page = 1, pageSize = 10) {
  const kiln = await prisma.kiln.findUnique({
    where: { kilnId },
    select: { kilnId: true },
  });

  if (!kiln) return null;

  const safePage = Math.max(1, page);
  const safePageSize = Math.min(50, Math.max(1, pageSize));
  const [items, total] = await prisma.$transaction([
    prisma.telemetry.findMany({
      where: { firingCycle: { kilnId } },
      orderBy: { timestamp: "desc" },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    }),
    prisma.telemetry.count({ where: { firingCycle: { kilnId } } }),
  ]);

  return {
    items,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    },
  };
}

export async function linkControllerToKiln(kilnId, controllerId) {
  return prisma.$transaction(async (tx) => {
    const [kiln, controller] = await Promise.all([
      tx.kiln.findUnique({ where: { kilnId } }),
      tx.controller.findUnique({ where: { controllerId }, include: { kiln: true } }),
    ]);
    if (!kiln) throw new Error("Horno no encontrado");
    if (!controller) throw new Error("Controlador no encontrado");
    if (kiln.controllerId && kiln.controllerId !== controllerId) {
      throw new Error("El horno ya tiene un controlador vinculado");
    }
    if (controller.kiln && controller.kiln.kilnId !== kilnId) {
      throw new Error("El controlador ya está vinculado a otro horno");
    }
    if (kiln.userId !== controller.userId) {
      throw new Error("El horno y el controlador deben tener el mismo propietario");
    }
    if (controller.switchCurrentCapacity < kiln.nominalCurrent) {
      throw new Error("La capacidad del controlador es inferior al amperaje del horno");
    }
    const updated = await tx.kiln.update({
      where: { kilnId },
      data: { controllerId },
      include: { controller: true, user: true },
    });
    return presentKilnEntity(updated);
  });
}

export async function unlinkControllerFromKiln(kilnId) {
  return await prisma.$transaction(async (tx) => {
    const kiln = await tx.kiln.findUnique({
      where: { kilnId },
      include: { controller: true },
    });

    if (!kiln) {
      throw new Error("Horno no encontrado");
    }

    if (!kiln.controllerId) {
      return presentKilnEntity(kiln);
    }

    const updatedKiln = await tx.kiln.update({
      where: { kilnId },
      data: { controller: { disconnect: true } },
      include: { controller: true },
    });

    return presentKilnEntity(updatedKiln);
  });
}

export async function linkUserToKiln(kilnId, userId) {
  return prisma.$transaction(async (tx) => {
    const kiln = await tx.kiln.findUnique({
      where: { kilnId },
      include: { controller: true },
    });
    if (!kiln) throw new Error("Horno no encontrado");
    const user = await tx.user.findUnique({ where: { userId } });
    if (!user) throw new Error("Usuario no encontrado");
    if (!user.isActive || user.anonymizedAt || user.role !== "CLIENT") {
      throw new Error("El propietario debe ser un cliente activo");
    }
    if (!kiln.controller) throw new Error("El horno debe tener un controlador asociado");
    if (![null, userId].includes(kiln.userId) || ![null, userId].includes(kiln.controller.userId)) {
      throw new Error("Los equipos pertenecen a otro usuario");
    }
    await tx.controller.update({
      where: { controllerId: kiln.controllerId },
      data: { userId },
    });
    const updated = await tx.kiln.update({
      where: { kilnId },
      data: { userId },
      include: { controller: true, user: true },
    });
    return presentKilnEntity(updated);
  });
}

export async function unlinkUserFromKiln(kilnId) {
  return prisma.$transaction(async (tx) => {
    const kiln = await tx.kiln.findUnique({
      where: { kilnId },
      include: { controller: true },
    });
    if (!kiln) throw new Error("Horno no encontrado");
    if (kiln.controller) {
      await tx.controller.update({
        where: { controllerId: kiln.controllerId },
        data: { userId: null },
      });
    }
    const updatedKiln = await tx.kiln.update({
      where: { kilnId },
      data: { userId: null },
      include: { controller: true },
    });
    return presentKilnEntity(updatedKiln);
  });
}
