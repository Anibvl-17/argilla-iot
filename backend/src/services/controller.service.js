import { prisma } from "../config/prisma.js";
import { CONTROLLER_LINK_STATUS } from "../constants/status.constants.js";
import crypto from "crypto";

function getControllerLinkStatus(controller) {
  if (!controller?.kiln) {
    return CONTROLLER_LINK_STATUS.UNLINKED;
  }

  if (!controller.kiln.userId) {
    return CONTROLLER_LINK_STATUS.LINKED_TO_KILN;
  }

  return CONTROLLER_LINK_STATUS.LINKED_TO_KILN_AND_USER;
}

function decorateController(controller) {
  if (!controller) {
    return controller;
  }

  const linkStatus = getControllerLinkStatus(controller);

  return {
    ...controller,
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
  const controller = await prisma.controller.create({ data });

  return decorateController(controller);
}

export async function edit(controllerId, data) {
  const controller = await prisma.controller.update({
    where: { controllerId },
    data,
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
 * Limpia el PIN temporal del controlador una vez consumido.
 *
 * @param {string} id UUID del Controlador
 * @returns El Controlador actualizado
 */
export async function clearPin(id) {
  return await prisma.controller.update({
    where: { controllerId: id },
    data: {
      pin: null,
    },
  });
}

export async function getAllControllers() {
  const controllers = await prisma.controller.findMany({
    include: { kiln: { include: { user: true } } },
  });

  return decorateControllers(controllers);
}
