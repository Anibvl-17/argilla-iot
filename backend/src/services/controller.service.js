import { prisma } from "../config/prisma.js";
import { CONTROLLER_STATUS } from "../constants/status.constants.js";
import { unlinkControllerFromKiln } from "./kiln.service.js";
import crypto from "crypto";

/**
 * Crea un controlador de forma lógica. El UUID generado se asigna al
 * controlador físico para ser vinculado posteriormente.
 */
export async function create(data) {
  return await prisma.controller.create({ data });
}

export async function edit(controllerId, data) {
  return await prisma.controller.update({
    where: { controllerId },
    data,
  });
}

export async function remove(controllerId) {
  const controllerToRemove = await prisma.controller.findUnique({
    where: { controllerId },
    include: { kiln: true },
  });

  if (!controllerToRemove) return false;

  // Evitar usar unlinkControllerFromKiln(): esta funcion desvincula el horno
  // y ademas actualiza el estado del controlador a WAITING, algo innecesario en
  // este caso
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

  return true;
}

/**
 * Genera un pin de 4 digitos
 *
 * @param {string} uuid UUID del controlador
 * @returns PIN aleatorio
 */
export async function generatePin(uuid) {
  const pin = crypto.randomInt(100000, 1000000);

  await prisma.controller.update({
    where: { controllerId: uuid },
    data: {
      pin,
    },
  });

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
