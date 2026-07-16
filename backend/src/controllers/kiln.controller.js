import {
  handleErrorClient,
  handleErrorServer,
  handleSuccess,
} from "../handlers/response.handler.js";
import {
  createKiln,
  edit,
  getKilnsByUserId,
  getUserKilnById,
  getOwnedKilnController,
  getOwnedKilnTelemetry,
  getAdminKilnById,
  getAdminKilnTelemetry,
  renameUserKiln,
  linkControllerToKiln,
  linkUserToKiln,
  remove,
  unlinkControllerFromKiln,
  unlinkUserFromKiln,
  getKilnsPage,
} from "../services/kiln.service.js";
import { emitAdminSummary } from "../realtime/socket.js";
import { publishControllerCommand } from "../config/mqttClient.js";

export async function addKiln(req, res) {
  try {
    const kilnData = req.body;

    const newKiln = await createKiln(kilnData);
    void emitAdminSummary();

    return handleSuccess(res, 201, "Horno creado exitosamente", newKiln);
  } catch (error) {
    return handleErrorServer(res, 500, "Error al crear horno", error.message);
  }
}

export async function getUserKilns(req, res) {
  try {
    const userId = req.user.id;
    const kilns = await getKilnsByUserId(userId);

    return handleSuccess(res, 200, "Hornos obtenidos exitosamente", kilns);
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al obtener hornos",
      error.message,
    );
  }
}

export async function getUserKiln(req, res) {
  try {
    const kilnId = Number(req.params.kilnId);
    if (!Number.isInteger(kilnId) || kilnId < 1) {
      return handleErrorClient(res, 404, "Horno no encontrado");
    }

    const kiln = await getUserKilnById(req.user.id, kilnId);

    if (!kiln) {
      return handleErrorClient(res, 404, "Horno no encontrado");
    }

    return handleSuccess(res, 200, "Horno obtenido exitosamente", kiln);
  } catch (error) {
    return handleErrorServer(res, 500, "Error al obtener horno", error.message);
  }
}

export async function renameOwnedKiln(req, res) {
  try {
    const kilnId = Number(req.params.kilnId);
    if (!Number.isInteger(kilnId) || kilnId < 1) {
      return handleErrorClient(res, 404, "Horno no encontrado");
    }

    const kiln = await renameUserKiln(req.user.id, kilnId, req.body.name);

    if (!kiln) {
      return handleErrorClient(res, 404, "Horno no encontrado");
    }

    return handleSuccess(res, 200, "Nombre actualizado exitosamente", kiln);
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al actualizar nombre del horno",
      error.message,
    );
  }
}

export async function sendOwnedKilnControllerCommand(req, res) {
  try {
    const kilnId = Number(req.params.kilnId);
    if (!Number.isInteger(kilnId) || kilnId < 1) {
      return handleErrorClient(res, 404, "Horno no encontrado");
    }

    const controller = await getOwnedKilnController(req.user.id, kilnId);

    if (!controller) {
      return handleErrorClient(res, 404, "Horno sin controlador disponible");
    }

    if (controller.connectionStatus !== "ONLINE") {
      return handleErrorClient(
        res,
        409,
        "No se puede operar un controlador desconectado",
      );
    }

    await publishControllerCommand(controller.controllerId, req.body.command);

    return handleSuccess(res, 200, "Comando enviado exitosamente", {
      controllerCode: controller.controllerId.slice(-6),
      command: req.body.command,
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

export async function getOwnedKilnTelemetryHistory(req, res) {
  try {
    const kilnId = Number(req.params.kilnId);
    if (!Number.isInteger(kilnId) || kilnId < 1) {
      return handleErrorClient(res, 404, "Horno no encontrado");
    }

    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 10);
    const telemetry = await getOwnedKilnTelemetry(
      req.user.id,
      kilnId,
      Number.isInteger(page) ? page : 1,
      Number.isInteger(pageSize) ? pageSize : 10,
    );

    if (!telemetry) {
      return handleErrorClient(res, 404, "Horno no encontrado");
    }

    return handleSuccess(
      res,
      200,
      "Telemetría obtenida exitosamente",
      telemetry,
    );
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al obtener telemetría",
      error.message,
    );
  }
}

export async function getAdminKiln(req, res) {
  try {
    const kilnId = Number(req.params.kilnId);
    if (!Number.isInteger(kilnId) || kilnId < 1) {
      return handleErrorClient(res, 404, "Horno no encontrado");
    }

    const kiln = await getAdminKilnById(kilnId);
    if (!kiln) {
      return handleErrorClient(res, 404, "Horno no encontrado");
    }

    return handleSuccess(res, 200, "Horno obtenido exitosamente", kiln);
  } catch (error) {
    return handleErrorServer(res, 500, "Error al obtener horno", error.message);
  }
}

export async function getAdminKilnTelemetryHistory(req, res) {
  try {
    const kilnId = Number(req.params.kilnId);
    if (!Number.isInteger(kilnId) || kilnId < 1) {
      return handleErrorClient(res, 404, "Horno no encontrado");
    }

    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 10);
    const telemetry = await getAdminKilnTelemetry(
      kilnId,
      Number.isInteger(page) ? page : 1,
      Number.isInteger(pageSize) ? pageSize : 10,
    );

    if (!telemetry) {
      return handleErrorClient(res, 404, "Horno no encontrado");
    }

    return handleSuccess(
      res,
      200,
      "Telemetría obtenida exitosamente",
      telemetry,
    );
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al obtener telemetría",
      error.message,
    );
  }
}

/**
 * Endpoint para vincular un controlador a un horno utilizando una porción del
 * UUID del controlador y un PIN generado automaticamente
 *
 * @returns HTTP 400: Pin no proporcionado; HTTP 200: Vinculado con exito;
 * HTTP 500: Error de servidor
 */
export async function linkController(req, res) {
  try {
    const { kilnId } = req.params;
    const { partialControllerId, pin } = req.body;

    if (!pin) {
      return handleErrorClient(res, 400, "El PIN es requerido", null, "pin");
    }

    if (!partialControllerId) {
      return handleErrorClient(
        res,
        400,
        "El ID del controlador es requerido",
        null,
        "partialControllerId",
      );
    }

    const updatedKiln = await linkControllerToKiln(
      parseInt(kilnId),
      partialControllerId,
      pin,
    );
    void emitAdminSummary();

    return handleSuccess(
      res,
      200,
      "Controlador vinculado exitosamente",
      updatedKiln,
    );
  } catch (error) {
    const field = /pin|credencial/i.test(error.message)
      ? "pin"
      : "partialControllerId";
    return handleErrorClient(
      res,
      400,
      "No se pudo vincular el controlador",
      error.message,
      field,
    );
  }
}

export async function unlinkController(req, res) {
  try {
    const { kilnId } = req.params;

    const updatedKiln = await unlinkControllerFromKiln(parseInt(kilnId));

    if (!updatedKiln) {
      return handleSuccess(res, 200, "Horno no tiene controlador vinculado");
    }

    void emitAdminSummary();

    return handleSuccess(
      res,
      200,
      "Controlador desvinculado con exito",
      updatedKiln,
    );
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al desvincular controlador",
      error.message,
    );
  }
}

/**
 * Endpoint de administrador para enlazar un horno a un usuario. Utilizado en
 * casos donde el horno existe sin controlador
 * @returns HTTP 400: falta ID de horno o ID de usuario, HTTP 200: vinculo
 *          exitoso
 */
export async function linkUser(req, res) {
  try {
    const { kilnId } = req.params;
    const { userId } = req.body;

    if (!kilnId) {
      return handleErrorClient(res, 400, "El ID del horno es requerido");
    }

    const claimedKiln = await linkUserToKiln(
      parseInt(kilnId),
      parseInt(userId),
    );
    void emitAdminSummary();

    return handleSuccess(
      res,
      200,
      "Usuario vinculado exitosamente",
      claimedKiln,
    );
  } catch (error) {
    return handleErrorClient(
      res,
      400,
      "No se pudo vincular el usuario",
      error.message,
      "userId",
    );
  }
}

export async function unlinkUser(req, res) {
  try {
    const { kilnId } = req.params;
    const { userId } = req.body;

    await unlinkUserFromKiln(parseInt(userId), parseInt(kilnId));
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

export async function editKiln(req, res) {
  try {
    const { kilnId } = req.params;
    const { body } = req;

    const updatedKiln = await edit(parseInt(kilnId), body);

    return handleSuccess(
      res,
      200,
      "Horno actualizado exitosamente",
      updatedKiln,
    );
  } catch (error) {
    if (error.code === "P2025") {
      return handleErrorClient(res, 404, "Horno no encontrado");
    }

    return handleErrorServer(res, 500, "Error al editar horno", error.message);
  }
}

export async function removeKiln(req, res) {
  try {
    const { kilnId } = req.params;

    const isRemoved = await remove(parseInt(kilnId));

    if (!isRemoved) {
      return handleErrorClient(res, 404, "Horno no encontrado");
    }

    void emitAdminSummary();

    return handleSuccess(res, 200, "Horno eliminado exitosamente");
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al eliminar horno",
      error.message,
    );
  }
}

export async function getAllKilns(req, res) {
  try {
    const kilns = await getKilnsPage(req.query);

    return handleSuccess(res, 200, "Hornos obtenidos exitosamente", kilns);
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al obtener todos los hornos",
      error.message,
    );
  }
}
