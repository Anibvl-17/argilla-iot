import { prisma } from "../config/prisma.js";
import { findUserById } from "./user.service.js";

export async function createKiln(userId, kilnData) {
  const user = await findUserById(userId);

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  return await prisma.kiln.create({
    data: {
      userId: userId,
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

export async function linkControllerToKiln(userId, kilnId, pin) {
  // Busca el horno
  const kiln = await prisma.kiln.findUnique({
    where: { kilnId },
  });

  if (!kiln || kiln.userId !== userId) {
    throw new Error("Horno no encontrado o no pertenece al usuario");
  }

  // Busca el controlador por pin
  const controller = await prisma.controller.findFirst({
    where: {
      pin: pin,
      kiln: null, // El controlador no debe estar asociado a un horno
    },
  });

  if (!controller) {
    throw new Error("PIN inválido o el controlador ya esta en uso");
  }

  const updatedKiln = await prisma.kiln.update({
    where: { kilnId },
    data: {
      controllerId: controller.controllerId,
    },
    include: { controller: true },
  });

  // Elimina el pin y actualiza status
  await prisma.controller.update({
    where: { controllerId: controller.controllerId },
    data: { pin: null, status: "linked" },
  });

  return updatedKiln;
}
