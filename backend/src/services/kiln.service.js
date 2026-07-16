import { prisma } from "../config/prisma.js";

export async function createKiln(kilnData) {
  return await prisma.kiln.create({
    data: {
      name: kilnData.name,
      liters: kilnData.liters,
      phases: kilnData.phases,
      volts: kilnData.volts,
      amps: kilnData.amps,
    },
  });
}

/**
 * Actualiza los datos propios de un Horno, es decir: nombre, litros, fases,
 * voltaje, amperaje
 *
 * @param {number} kilnId El ID del Horno
 * @param {object} data Los datos que se actualizaran (name, liters, phases,
 *                      volts, amps)
 * @returns El Horno con los datos actualizados
 */
export async function edit(kilnId, data) {
  return await prisma.kiln.update({
    where: {
      kilnId,
    },
    data, // liters, phases, volts, amps
  });
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
  return await prisma.kiln.findMany({
    include: { user: true, controller: true },
  });
}

export async function getKilnsPage({
  page = 1,
  pageSize = 10,
  search = "",
} = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 10));
  const normalizedSearch = String(search || "").trim();
  const numericSearch = Number(normalizedSearch);
  const where = normalizedSearch
    ? {
        OR: [
          ...(Number.isInteger(numericSearch)
            ? [{ kilnId: numericSearch }]
            : []),
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
    : {};

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
      prisma.kiln.count(),
      prisma.kiln.count({ where: { controller: { is: null } } }),
      prisma.kiln.count({ where: { user: { is: null } } }),
    ]);

  return {
    items,
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
  temp: true,
  operativeStatus: true,
  connectionStatus: true,
  switchType: true,
  switchAmps: true,
};

function presentController(controller) {
  if (!controller) return null;

  const { controllerId, ...safeController } = controller;
  return {
    ...safeController,
    controllerCode: controllerId.slice(-6),
  };
}

function presentKiln(kiln) {
  return {
    ...kiln,
    controller: presentController(kiln.controller),
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
        phases: true,
        volts: true,
        amps: true,
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
      phases: true,
      volts: true,
      amps: true,
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
      phases: true,
      volts: true,
      amps: true,
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
          temp: true,
          operativeStatus: true,
          connectionStatus: true,
        },
      },
    },
  });

  if (!kiln || !kiln.controller) return null;

  return kiln.controller;
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
      where: { kilnId },
      orderBy: { timestamp: "desc" },
      skip,
      take: safePageSize,
    }),
    prisma.telemetry.count({ where: { kilnId } }),
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
  return await prisma.kiln.findUnique({
    where: { kilnId },
    include: { user: true, controller: true },
  });
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
      where: { kilnId },
      orderBy: { timestamp: "desc" },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    }),
    prisma.telemetry.count({ where: { kilnId } }),
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

/**
 * Vincula un Controlador a un Horno, asociando la UUID del Controlador al Horno
 *
 * @param {number} kilnId ID del Horno
 * @param {string} partialControllerId Ultimos 6 caracteres del UUID del Controlador
 * @param {number} pin Pin de 6 digitos
 * @returns El Horno con el controlador asociado, o Error
 */
export async function linkControllerToKiln(kilnId, partialControllerId, pin) {
  return await prisma.$transaction(async (tx) => {
    const kiln = await tx.kiln.findUnique({
      where: { kilnId },
    });

    if (!kiln) throw new Error("Horno no encontrado");

    const controller = await tx.controller.findFirst({
      where: { controllerId: { endsWith: partialControllerId } },
      include: { kiln: true },
    });

    // ---- Clausulas de Guarda ----
    if (!controller || controller.pin !== pin) {
      throw new Error("Credenciales incorrectas");
    }

    if (controller.kiln) {
      throw new Error("El controlador ya está vinculado a otro horno");
    }

    if (kiln.controllerId) {
      throw new Error("El horno ya tiene un controlador vinculado");
    }

    if (controller.switchAmps < kiln.amps) {
      throw new Error(
        "La capacidad de amperaje del switch es inferior al amperaje del horno",
      );
    }

    if (kiln.userId && controller.userId && kiln.userId !== controller.userId) {
      throw new Error("Los equipos pertenecen a usuarios distintos");
    }
    // ---- Fin Clausulas de Guarda ----

    const finalUserId = kiln.userId || controller.userId || null;

    const updatedKiln = await tx.kiln.update({
      where: { kilnId },
      data: {
        controllerId: controller.controllerId,
        userId: finalUserId,
      },
      include: { controller: true },
    });

    await tx.controller.update({
      where: { controllerId: controller.controllerId },
      data: {
        userId: finalUserId,
        pin: null,
      },
    });

    return updatedKiln;
  });
}

/**
 * Desvincula un Controlador de un Horno
 *
 * @param {number} kilnId ID del Horno
 * @returns
 */
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
      return kiln;
    }

    const updatedKiln = await tx.kiln.update({
      where: { kilnId },
      data: { controller: { disconnect: true } },
      include: { controller: true },
    });

    return updatedKiln;
  });
}

/**
 * Vincula un Usuario a un Horno.
 *
 * @param {number} userId
 * @returns El Horno actualizado
 */
export async function linkUserToKiln(kilnId, userId) {
  return await prisma.$transaction(async (tx) => {
    const kiln = await tx.kiln.findUnique({
      where: { kilnId },
      include: { user: true, controller: true },
    });

    if (!kiln) throw new Error("Horno no encontrado");

    const user = await tx.user.findUnique({ where: { userId } });

    if (!user) throw new Error("Usuario no encontrado");

    // ---- Clausulas de Guarda ----
    if (kiln.userId !== null) {
      throw new Error("El horno ya tiene un propietario");
    }

    if (
      kiln.controller &&
      kiln.controller.userId !== null &&
      kiln.controller.userId !== userId
    ) {
      throw new Error("El controlador asociado pertenece a otro usuario");
    }
    // ---- Fin Clausulas de Guarda ----

    const claimedKiln = await tx.kiln.update({
      where: { kilnId },
      data: { user: { connect: { userId } } },
    });

    if (kiln.controller) {
      await tx.controller.update({
        where: { controllerId: kiln.controllerId },
        data: { user: { connect: { userId } } },
      });
    }

    return claimedKiln;
  });
}

/**
 * Desvincula un Horno de un Usuario.
 *
 * @param {number} userId
 * @param {number} kilnId
 * @returns El Horno actualizado
 */
export async function unlinkUserFromKiln(userId, kilnId) {
  return await prisma.$transaction(async (tx) => {
    const kiln = await tx.kiln.findUnique({
      where: { kilnId },
      include: { controller: true },
    });

    // ---- Clausulas de Guarda ----
    if (!kiln) {
      throw new Error("Horno no encontrado");
    }

    if (kiln.userId !== userId) {
      throw new Error("Horno no pertenece al usuario");
    }
    // ---- Fin Clausulas de Guarda ----

    const updatedKiln = await tx.kiln.update({
      where: { kilnId },
      data: { user: { disconnect: true } },
    });

    if (kiln.controller && kiln.controller.userId === userId) {
      await tx.controller.update({
        where: { controllerId: kiln.controllerId },
        data: { user: { disconnect: true } },
      });
    }

    return updatedKiln;
  });
}
