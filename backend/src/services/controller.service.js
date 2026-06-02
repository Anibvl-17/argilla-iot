import { prisma } from "../config/prisma.js";

export const CONTROLLER_STATUS = {
  WAITING: 0,       // Operativo, en espera de vinculacion
  LINKED: 1,        // Operativo y vinculado
  OUT_OF_SERVICE: 2 // Fuera de servicio
}

export async function register(macAddress) {
  const pin = Math.floor(1000 + Math.random() * 9000).toString();

  // upsert: crea o actualiza si ya existe
  return await prisma.controller.upsert({
    where: { macAddress },
    update: {
      pin,
      status: CONTROLLER_STATUS.WAITING,
    },
    create: {
      macAddress,
      pin,
      status: CONTROLLER_STATUS.WAITING,
    },
  });
}

export async function getStatusById(macAddress) {
  const controller = await prisma.controller.findUnique({
    where: { macAddress },
    include: { kiln: true }, // trae el horno si ya esta vinculado
  });

  if (!controller) {
    throw new Error("Controlador no encontrado");
  }

  return controller;
}

export async function updateStatus(macAddress, status) {
  return await prisma.controller.update({
    where: { macAddress },
    data: { status },
  });
}
