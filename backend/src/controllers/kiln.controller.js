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
  getOwnedKilnTelemetry,
  getAdminKilnById,
  getAdminKilnTelemetry,
  linkControllerToKiln,
  linkUserToKiln,
  remove,
  unlinkControllerFromKiln,
  unlinkUserFromKiln,
  getKilnsPage,
} from "../services/kiln.service.js";
import {
  getAdminCycleTelemetry,
  listAdminCycles,
} from "../services/firing.service.js";
import { emitAdminSummary } from "../realtime/socket.js";
import { ROLES } from "../constants/user.constants.js";

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

    const kiln = await getAdminKilnById(
      kilnId,
      req.user.role === ROLES.TECHNICIAN,
    );
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

export async function getAdminKilnCycles(req, res) {
  try {
    const kilnId = Number(req.params.kilnId);
    if (!Number.isInteger(kilnId) || kilnId < 1) {
      return handleErrorClient(res, 404, "Horno no encontrado");
    }
    const cycles = await listAdminCycles(
      kilnId,
      req.query.page,
      req.query.pageSize,
    );
    if (!cycles) return handleErrorClient(res, 404, "Horno no encontrado");
    return handleSuccess(res, 200, "Ciclos obtenidos", cycles);
  } catch (error) {
    return handleErrorServer(res, 500, "Error al obtener ciclos", error.message);
  }
}

export async function getAdminKilnCycleTelemetry(req, res) {
  try {
    const kilnId = Number(req.params.kilnId);
    const firingCycleId = Number(req.params.firingCycleId);
    if (
      !Number.isInteger(kilnId) ||
      kilnId < 1 ||
      !Number.isInteger(firingCycleId) ||
      firingCycleId < 1
    ) {
      return handleErrorClient(res, 404, "Ciclo no encontrado");
    }
    const telemetry = await getAdminCycleTelemetry(
      kilnId,
      firingCycleId,
      req.query.page,
      req.query.pageSize,
    );
    if (!telemetry) return handleErrorClient(res, 404, "Ciclo no encontrado");
    return handleSuccess(res, 200, "Telemetría obtenida", telemetry);
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al obtener telemetría del ciclo",
      error.message,
    );
  }
}

/** Vincula un controlador a un horno. */
export async function linkController(req, res) {
  try {
    const { kilnId } = req.params;
    const { controllerId } = req.body;

    const updatedKiln = await linkControllerToKiln(
      parseInt(kilnId),
      controllerId,
      { restrictPresentation: req.user.role === ROLES.TECHNICIAN },
    );
    void emitAdminSummary();

    return handleSuccess(
      res,
      200,
      "Controlador vinculado exitosamente",
      updatedKiln,
    );
  } catch (error) {
    return handleErrorClient(
      res,
      409,
      "No se pudo vincular el controlador",
      error.message,
      "controllerId",
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

/** Vincula un horno y su controlador a un cliente activo. */
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
    await unlinkUserFromKiln(parseInt(kilnId));
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

    const updatedKiln = await edit(parseInt(kilnId), body, {
      requireUnowned: req.user.role === ROLES.TECHNICIAN,
      restrictPresentation: req.user.role === ROLES.TECHNICIAN,
    });

    return handleSuccess(
      res,
      200,
      "Horno actualizado exitosamente",
      updatedKiln,
    );
  } catch (error) {
    if (error.code === "INCOMPATIBLE_CONTROLLER_AMPERAGE") {
      return handleErrorClient(res, 409, error.message, null, "nominalCurrent");
    }

    if (error.code === "P2025") {
      return handleErrorClient(res, 404, "Horno no encontrado");
    }

    if (error.code === "KILN_HAS_OWNER") {
      return handleErrorClient(
        res,
        403,
        "Los técnicos solo pueden editar hornos sin cliente asociado",
      );
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
    if (error.code === "P2003") {
      return handleErrorClient(
        res,
        409,
        "El horno conserva información histórica",
      );
    }
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
    const kilns = await getKilnsPage({
      ...req.query,
      restrictUserDetails: req.user.role === ROLES.TECHNICIAN,
    });

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
