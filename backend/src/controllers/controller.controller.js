import {
  handleErrorClient,
  handleErrorServer,
  handleSuccess,
} from "../handlers/response.handler.js";
import {
  create,
  edit,
  generatePin,
  remove,
  getAllControllers as getAllControllersRequest,
  linkControllerToUser,
  unlinkUserFromController as unlinkUserFromControllerRequest
} from "../services/controller.service.js";

/**
 * Endpoint para crear un controlador lógico
 *
 * @returns HTTP 200 si se crea con exito, HTTP 500 en caso de error de servidor
 */
export async function createController(req, res) {
  try {
    const { body } = req;

    const controller = await create(body);

    return handleSuccess(
      res,
      200,
      "Controlador registrado exitosamente",
      controller,
    );
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al registrar controlador",
      error.message,
    );
  }
}

export async function editController(req, res) {
  try {
    const { controllerId } = req.params;
    const { body } = req;

    const updatedController = await edit(controllerId, body);

    return handleSuccess(
      res,
      200,
      "Controlador actualizado exitosamente",
      updatedController,
    );
  } catch (error) {
    if (error.code === "P2025") {
      return handleErrorClient(res, 404, "Controlador no encontrado");
    }

    return handleErrorServer(
      res,
      500,
      "Error al editar controlador",
      error.message,
    );
  }
}

export async function removeController(req, res) {
  try {
    const { controllerId } = req.params;

    const isRemoved = await remove(controllerId);

    if (!isRemoved) {
      return handleErrorClient(res, 404, "Controlador no encontrado");
    }

    return handleSuccess(res, 200, "Controlador eliminado exitosamente");
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al eliminar controlador",
      error.message,
    );
  }
}

/**
 * Endpoint para vincular controlador con horno, u usuario con horno a traves
 * de la relación controlador-horno. Se espera que el controlador utilice este
 * endpoint
 *
 * @returns PIN aleatorio
 */
export async function generateControllerPin(req, res) {
  try {
    const { uuid } = req.params;

    if (!uuid) {
      return handleErrorClient(res, 400, "El ID es requerido");
    }

    const pin = await generatePin(uuid);

    return handleSuccess(res, 200, "PIN generado exitosamente", { pin });
  } catch (error) {
    if (error.code === "P2025") {
      return handleErrorClient(res, 404, "Controlador no encontrado");
    }

    return handleErrorServer(res, 500, "Error al generar pin", error.message);
  }
}

export async function getAllControllers(req, res) {
  try {
    const controllers = await getAllControllersRequest();

    if (controllers && controllers.length === 0) {
      return handleSuccess(res, 204, "No hay controladores registrados", []);
    }

    return handleSuccess(
      res,
      200,
      "Controladores obtenidos exitosamente",
      controllers,
    );
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al obtener todos los controladores",
      error.message,
    );
  }
}

/**
 * Endpoint para enlazar un controlador a un usuario.
 * @returns HTTP 400: falta ID, HTTP 200: vinculo
 *          exitoso
 */
export async function linkUserToController(req, res) {
  try {
    const { partialControllerId, userId, pin } = req.body;

    const claimedController = await linkControllerToUser(
      partialControllerId,
      parseInt(userId),
      parseInt(pin),
    );

    return handleSuccess(
      res,
      200,
      "Usuario vinculado exitosamente",
      claimedController,
    );
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al vincular usuario",
      error.message,
    );
  }
}

export async function unlinkUserFromController(req, res) {
  try {
    const { controllerId } = req.params;
    const { userId } = req.body;

    await unlinkUserFromControllerRequest(parseInt(userId), controllerId);

    return handleSuccess(res, 200, "Usuario desvinculado exitosamente");
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al desvincular usuario",
      error.message,
    );
  }
}
