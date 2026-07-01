import { prisma } from "../config/prisma.js";
import { CONTROLLER_LINK_STATUS } from "../constants/controller.constants.js";
import crypto from "crypto";

function getControllerLinkStatus(controller) {
  if (controller.kiln && controller.user) {
    return CONTROLLER_LINK_STATUS.LINKED_TO_KILN_AND_USER
  }

  if (controller.kiln) {
    return CONTROLLER_LINK_STATUS.LINKED_TO_KILN
  }

  if (controller.user) {
    return CONTROLLER_LINK_STATUS.LINKED_TO_USER
  }

  return CONTROLLER_LINK_STATUS.UNLINKED;
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
    include: { kiln: true, user: true },
  });

  return decorateControllers(controllers);
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

    if (!controller || controller.pin !== pin) {
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
        pin: null,
      },
    });

    if (controller.kiln) {
      await tx.kiln.update({
        where: { kilnId: controller.kiln.kilnId },
        data: { user: { connect: { userId } } },
      });
    }

    return claimedController;
  });
}

/**
 * Desvincula un Controlador de un Usuario.
 *
 * @param {number} userId
 * @param {number} controllerId
 * @returns El controlador actualizado
 * @todo desvincular horno, si existe,  de usuario también por seguridad
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

    return updatedController;
  });
}
