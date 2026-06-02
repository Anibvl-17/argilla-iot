import { prisma } from "../config/prisma.js";

export async function register(macAddress) {
  // Genera pin de 4 digitos
  const pin = Math.floor(1000 + Math.random() * 9000).toString();

  // upsert: crea o actualiza si ya existe
  return await prisma.controller.upsert({
    where: { macAddress },
    update: {
      pin,
      status: "waiting",
    },
    create: {
      macAddress,
      pin,
      status: "waiting",
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
