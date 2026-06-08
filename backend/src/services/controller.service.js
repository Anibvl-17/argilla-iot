import { prisma } from "../config/prisma.js";

/**
 * Constantes de estado de controlador
 * @todo Evaluar utilizar archivo separado para constantes
 */
export const CONTROLLER_STATUS = {
  WAITING: "waiting", // Operativo, en espera de vinculacion a horno
  LINKED: "linked", // Operativo y vinculado a horno
  CLAIMED: "claimed", // Vinculado a horno y usuario
  OUT_OF_SERVICE: "out_of_service", // Fuera de servicio
};

/**
 * Crea un controlador de forma lógica. El UUID generado se asigna al
 * controlador físico para ser vinculado posteriormente.
 */
export async function create() {
  return await prisma.controller.create({data:{}});
}

/**
 * @todo En desuso, evaluar eliminacion
 */
export async function getStatusById(id) {
  const controller = await prisma.controller.findUnique({
    where: { controllerId: id },
    include: { kiln: true }, // trae el horno si ya esta vinculado
  });

  if (!controller) {
    throw new Error("Controlador no encontrado");
  }

  return controller;
}

/**
 * Genera un pin de 4 digitos
 * 
 * @param {string} uuid UUID del controlador
 * @returns PIN aleatorio
 */
export async function generatePin(uuid) {
  const pin = Math.floor(1000 + Math.random() * 9000).toString();

  await prisma.controller.update({
    where: { controllerId: uuid },
    data: {
      pin,
    }
  })

  return pin;
}

/**
 * Restablece el controlador al estado inicial (waiting). Usado al desvincular
 * un controlador de un horno.
 * 
 * @param {string} id UUID del controlador
 * @returns El Controlador actualizado
 */
export async function reset(id) {
  return await prisma.controller.update({
    where: { controllerId: id },
    data: {
      status: CONTROLLER_STATUS.WAITING,
    },
  });
}

/**
 * Cambia el campo status del Controlador a "linked" y elimina el PIN
 * 
 * @param {string} id UUID del Controlador
 * @returns El Controlador actualizado
 */
export async function setAsLinked(id) {
  return await prisma.controller.update({
    where: { controllerId: id },
    data: {
      pin: null,
      status: CONTROLLER_STATUS.LINKED,
    },
  });
}

/**
 * Cambia el campo status del controlador a "claimed" y elimina el PIN
 * 
 * @param {string} id UUID del Controlador
 * @returns El Controlador actualizado
 */
export async function setAsClaimed(id) {
  return await prisma.controller.update({
    where: { controllerId: id },
    data: {
      pin: null,
      status: CONTROLLER_STATUS.CLAIMED,
    },
  });
}

/**
 * Cambia el estado del controlador a fuera de servicio.
 * 
 * @param {string} id UUID del controlador
 * @returns El Controlador actualizado
 * 
 * @todo Fuera de servicio indicaria que el controlador no se puede utilizar mas
 * por lo tanto es necesario realizar esta verificacion en otras funciones
 */
export async function setAsOutOfService(id) {
  return await prisma.controller.update({
    where: { controllerId: id },
    data: {
      pin: null,
      status: CONTROLLER_STATUS.OUT_OF_SERVICE,
    },
  });
}
