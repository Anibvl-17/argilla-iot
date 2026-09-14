import {
  handleErrorClient,
  handleErrorServer,
  handleSuccess,
} from "../handlers/response.handler.js";
import {
  create,
  edit,
  getControllerCommandTarget,
  remove,
  getControllersPage,
  claimControllerBundle,
} from "../services/controller.service.js";
import { emitAdminSummary } from "../realtime/socket.js";
import {
  publishControllerCommand,
  publishPairingBlockStatus,
} from "../config/mqttClient.js";
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
      201,
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
      return handleErrorClient(
        res,
        409,
        error.message,
        null,
        "switchCurrentCapacity",
      );
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
    if (error.code === "P2003") {
      return handleErrorClient(
        res,
        409,
        "El controlador conserva información histórica",
      );
    }
    return handleErrorServer(
      res,
      500,
      "Error al eliminar controlador",
      error.message,
    );
  }
}

/** Lista controladores para administración y soporte técnico. */
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

/** Reclama atómicamente el conjunto horno-controlador usando sufijo y PIN. */
export async function linkUserToController(req, res) {
  try {
    const { partialControllerId, pin } = req.body;
    const claimedController = await claimControllerBundle(
      partialControllerId,
      req.user.id,
      pin,
    );
    void emitAdminSummary();

    return handleSuccess(
      res,
      200,
      "Horno agregado exitosamente",
      claimedController,
    );
  } catch (error) {
    if (error.code === "PAIRING_BLOCKED" && error.blockedUntil) {
      publishPairingBlockStatus(error.controllerId, error.blockedUntil);
    }
    const field = /pin/i.test(error.message) ? "pin" : "partialControllerId";
    const statusCode = error.code === "PAIRING_BLOCKED" ? 423 : 409;
    return handleErrorClient(
      res,
      statusCode,
      "No se pudo agregar el horno",
      error.blockedUntil
        ? { reason: error.message, blockedUntil: error.blockedUntil }
        : error.message,
      field,
    );
  }
}

export async function getAccessibleControllers(req, res) {
  try {
    const controllers = await getControllersPage({
      ...req.query,
      userId: [ROLES.ADMIN, ROLES.TECHNICIAN].includes(req.user.role)
        ? undefined
        : req.user.id,
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
