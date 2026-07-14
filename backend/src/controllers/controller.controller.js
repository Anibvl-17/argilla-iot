import {
  handleErrorClient,
  handleErrorServer,
  handleSuccess,
} from "../handlers/response.handler.js";
import {
  create,
  clearPin,
  edit,
  generatePin,
  getControllerCommandTarget,
  remove,
  getControllersPage,
  linkControllerToUser,
  unlinkUserFromController as unlinkUserFromControllerRequest
} from "../services/controller.service.js";
import { emitAdminSummary } from "../realtime/socket.js";
import { publishControllerCommand } from "../config/mqttClient.js";
import { ROLES } from "../constants/user.constants.js";

/**
 * Endpoint para crear un controlador lógico
 *
 * @returns HTTP 200 si se crea con exito, HTTP 500 en caso de error de servidor
 */
export async function createController(req, res) {
  try {
    const { body } = req;

    const controller = await create(body);
    void emitAdminSummary();

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
    if (error.code === "INCOMPATIBLE_KILN_AMPERAGE") {
      return handleErrorClient(res, 409, error.message, null, "switchAmps");
    }

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

    void emitAdminSummary();

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

    const controller = await getControllerCommandTarget(uuid);

    if (!controller) {
      return handleErrorClient(res, 404, "Controlador no encontrado");
    }

    if (req.user.role !== ROLES.ADMIN && controller.userId !== req.user.id) {
      return handleErrorClient(
        res,
        403,
        "No puedes generar PIN para un controlador que no te pertenece",
      );
    }

    if (controller.connectionStatus !== "ONLINE") {
      return handleErrorClient(
        res,
        409,
        "No se puede generar un PIN mientras el controlador está desconectado",
      );
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
    const controllers = await getControllersPage(req.query);

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
    void emitAdminSummary();

    return handleSuccess(
      res,
      200,
      "Usuario vinculado exitosamente",
      claimedController,
    );
  } catch (error) {
    const field = /pin|credencial/i.test(error.message)
      ? "pin"
      : /usuario/i.test(error.message)
        ? "userId"
        : "partialControllerId";
    return handleErrorClient(
      res,
      400,
      "No se pudo vincular el usuario",
      error.message,
      field,
    );
  }
}

export async function unlinkUserFromController(req, res) {
  try {
    const { controllerId } = req.params;
    const { userId } = req.body;

    await unlinkUserFromControllerRequest(parseInt(userId), controllerId);
    void emitAdminSummary();

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

export async function clearControllerPin(req, res) {
  try {
    const { uuid } = req.params;

    if (!uuid) {
      return handleErrorClient(res, 400, "El ID es requerido");
    }

    const controller = await getControllerCommandTarget(uuid);

    if (!controller) {
      return handleErrorClient(res, 404, "Controlador no encontrado");
    }

    if (req.user.role !== ROLES.ADMIN && controller.userId !== req.user.id) {
      return handleErrorClient(
        res,
        403,
        "No puedes eliminar PIN de un controlador que no te pertenece",
      );
    }

    const updatedController = await clearPin(uuid);

    return handleSuccess(
      res,
      200,
      "PIN eliminado exitosamente",
      updatedController,
    );
  } catch (error) {
    if (error.code === "P2025") {
      return handleErrorClient(res, 404, "Controlador no encontrado");
    }

    return handleErrorServer(res, 500, "Error al eliminar pin", error.message);
  }
}

export async function getAccessibleControllers(req, res) {
  try {
    const controllers = await getControllersPage({
      ...req.query,
      userId: req.user.role === ROLES.ADMIN ? undefined : req.user.id,
    });

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
      "Error al obtener controladores",
      error.message,
    );
  }
}

export async function sendControllerCommand(req, res) {
  try {
    const { controllerId } = req.params;
    const { command } = req.body;

    const controller = await getControllerCommandTarget(controllerId);

    if (!controller) {
      return handleErrorClient(res, 404, "Controlador no encontrado");
    }

    if (req.user.role !== ROLES.ADMIN && controller.userId !== req.user.id) {
      return handleErrorClient(
        res,
        403,
        "No puedes operar un controlador que no te pertenece",
      );
    }

    if (!controller.kiln) {
      return handleErrorClient(
        res,
        400,
        "No se puede operar un controlador sin horno vinculado",
      );
    }

    if (controller.connectionStatus !== "ONLINE") {
      return handleErrorClient(
        res,
        409,
        "No se puede operar un controlador desconectado",
      );
    }

    await publishControllerCommand(controllerId, command);

    return handleSuccess(res, 200, "Comando enviado exitosamente", {
      controllerId,
      command,
    });
  } catch (error) {
    if (error.code === "MQTT_COMMAND_PENDING") {
      return handleErrorClient(res, 409, error.message);
    }
    if (error.code === "MQTT_COMMAND_TIMEOUT") {
      return handleErrorServer(res, 504, error.message);
    }

    return handleErrorServer(
      res,
      500,
      "Error al enviar comando",
      error.message,
    );
  }
}
