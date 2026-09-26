import {
  handleErrorClient,
  handleErrorServer,
  handleSuccess,
} from "../handlers/response.handler.js";
import {
  create,
  edit,
  remove,
  getControllersPage,
  claimControllerBundle,
} from "../services/controller.service.js";
import { emitAdminSummary } from "../realtime/socket.js";
import {
  publishPairingBlockStatus,
  requestControllerSynchronization,
} from "../config/mqttClient.js";
import { ROLES } from "../constants/user.constants.js";
import {
  EQUIPMENT_STATUS_TARGETS,
  updateEquipmentOperationalStatus,
} from "../services/equipmentStatus.service.js";

/** Crea un controlador lógico. */
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

    const updatedController = await edit(controllerId, body, {
      requireUnowned: req.user.role === ROLES.TECHNICIAN,
      restrictPresentation: req.user.role === ROLES.TECHNICIAN,
    });

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

    if (error.code === "CONTROLLER_HAS_OWNER") {
      return handleErrorClient(
        res,
        403,
        "Los técnicos solo pueden editar controladores sin cliente asociado",
      );
    }

    return handleErrorServer(
      res,
      500,
      "Error al editar controlador",
      error.message,
    );
  }
}

export async function changeControllerOperationalStatus(req, res) {
  try {
    const controller = await updateEquipmentOperationalStatus({
      target: EQUIPMENT_STATUS_TARGETS.CONTROLLER,
      controllerId: req.params.controllerId,
      operationalStatus: req.body.operationalStatus,
    });
    void emitAdminSummary();
    return handleSuccess(
      res,
      200,
      "Estado del controlador actualizado",
      controller,
    );
  } catch (error) {
    if (error.code === "NOT_FOUND") {
      return handleErrorClient(res, 404, error.message);
    }
    if (
      ["CYCLE_ACTIVE", "STATE_CONFLICT", "INVALID_TARGET"].includes(error.code)
    ) {
      return handleErrorClient(res, 409, error.message);
    }
    return handleErrorServer(
      res,
      500,
      "Error al actualizar el estado del controlador",
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
    const controllers = await getControllersPage({
      ...req.query,
      restrictUserDetails: req.user.role === ROLES.TECHNICIAN,
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
    requestControllerSynchronization(claimedController.controllerId);
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
