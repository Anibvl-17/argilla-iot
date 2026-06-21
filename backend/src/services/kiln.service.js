import { prisma } from "../config/prisma.js";
import { clearPin } from "./controller.service.js";

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

export async function getKilnsByUserId(userId) {
  return await prisma.kiln.findMany({
    where: { userId },
    include: {
      controller: true,
    },
  });
}

/**
 * Vincula un Controlador a un Horno, asociando la UUID del Controlador al Horno
 *
 * @param {number} kilnId ID del Horno
 * @param {string} partialControllerId Ultimos 6 caracteres del UUID del Controlador
 * @param {number} pin Pin de 4 digitos
 * @returns El Horno con el controlador asociado, o Error
 */
export async function linkControllerToKiln(kilnId, partialControllerId, pin) {
  const kiln = await prisma.kiln.findUnique({
    where: { kilnId },
  });

  if (!kiln) {
    throw new Error("Horno no encontrado");
  }

  // findFirst permite usar "endsWith", para 6 ultimos caracteres del UUID
  const controller = await prisma.controller.findFirst({
    where: {
      controllerId: { endsWith: partialControllerId },
    },
    include: { kiln: true },
  });

  if (!controller || controller.pin !== pin) {
    throw new Error("Credenciales incorrectas");
  }

  if (controller.kiln) {
    throw new Error("El controlador no esta disponible");
  }

  if (controller.switchAmps < kiln.amps) {
    throw new Error(
      "La capacidad de amperaje del switch es inferior al amperaje del horno",
    );
  }

  const updatedKiln = await prisma.kiln.update({
    where: { kilnId },
    data: {
      controllerId: controller.controllerId,
    },
    include: { controller: true },
  });

  await clearPin(controller.controllerId);

  return updatedKiln;
}

/**
 * Desvincula un Controlador de un Horno
 *
 * @param {number} kilnId ID del Horno
 * @returns
 */
export async function unlinkControllerFromKiln(kilnId) {
  const kiln = await prisma.kiln.findUnique({
    where: { kilnId },
    include: { controller: true },
  });

  if (!kiln) {
    throw new Error("Horno no encontrado");
  }

  const controllerId = kiln.controllerId;

  if (!controllerId) {
    // Horno no tiene controlador asignado
    return;
  }

  const updatedKiln = await prisma.kiln.update({
    where: { kilnId },
    data: {
      controller: {
        disconnect: true,
      },
    },
  });

  return updatedKiln;
}

/**
 * Vincula un Usuario a un Horno, debe existir la relación Horno - Controlador.
 * Utiliza los últimos 6 caracteres del UUID del controlador para identificarlo.
 * Debe existir un PIN.
 *
 * @param {number} userId
 * @param {string} partialControllerId
 * @param {number} pin
 * @returns El Horno actualizado
 */
export async function linkUserToKiln(userId, partialControllerId, pin) {
  const controller = await prisma.controller.findFirst({
    where: { controllerId: { endsWith: partialControllerId } },
    include: { kiln: true },
  });

  if (!controller || controller.pin !== pin) {
    throw new Error("Credenciales incorrectas");
  }

  if (!controller.kiln) {
    throw new Error("Controlador no enlazado a horno");
  }

  if (controller.kiln.userId !== null && controller.kiln.userId !== userId) {
    throw new Error("El horno ya esta registrado");
  }

  if (controller.kiln.userId === userId) {
    // Usuario ya posee horno
    await clearPin(controller.controllerId);
    return;
  }

  const claimedKiln = await prisma.kiln.update({
    where: { kilnId: controller.kiln.kilnId },
    data: {
      userId,
    },
    include: { controller: true },
  });

  await clearPin(controller.controllerId);

  return claimedKiln;
}

/**
 * Desvincula un Horno de un Usuario.
 *
 * @param {number} userId
 * @param {number} kilnId
 * @returns El Horno actualizado
 */
export async function unlinkUserFromKiln(userId, kilnId) {
  const kiln = await prisma.kiln.findUnique({
    where: { kilnId },
    include: { controller: true },
  });

  if (kiln.userId !== userId) {
    throw new Error("Horno no encontrado o no pertenece al usuario");
  }

  const updatedKiln = await prisma.kiln.update({
    where: { kilnId },
    data: {
      user: { disconnect: true },
    },
  });

  return updatedKiln;
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
  console.log("peticion");

  return await prisma.kiln.findMany({
    include: { user: true, controller: true },
  });
}
