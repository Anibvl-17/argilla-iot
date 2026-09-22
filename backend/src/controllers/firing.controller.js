import {
  handleErrorClient,
  handleErrorServer,
  handleSuccess,
} from "../handlers/response.handler.js";
import {
  assertCanStart,
  getCycleByControllerId,
  getOwnedCycleTelemetry,
  getOwnedFiringContext,
  listAvailablePrograms,
  listOwnedCycles,
  selectOwnedKilnProgram,
} from "../services/firing.service.js";
import {
  acquireControllerSelection,
  getControllerFiringAvailability,
  publishControllerCatalog,
  publishFiringCommand,
  releaseControllerSelection,
} from "../config/mqttClient.js";

function parseId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function firingError(res, error) {
  const clientCodes = new Set([
    "NOT_FOUND",
    "CONTROLLER_REQUIRED",
    "CONTROLLER_OFFLINE",
    "CONTROLLER_UNAVAILABLE",
    "CYCLE_ACTIVE",
    "PROGRAM_REQUIRED",
    "PROGRAM_NOT_FOUND",
    "START_TEMPERATURE_INVALID",
    "INVALID_TRANSITION",
    "COMMAND_REJECTED",
    "CONTROLLER_NOT_RECONCILED",
    "COMMAND_CONFLICT",
  ]);
  if (error.code === "COMMAND_TIMEOUT") {
    return handleErrorServer(res, 504, error.message);
  }
  if (clientCodes.has(error.code)) {
    const status = error.code === "NOT_FOUND" ? 404 : 409;
    return handleErrorClient(res, status, error.message, error.details);
  }
  return handleErrorServer(res, 500, "Error al operar la quema", error.message);
}

export async function getPrograms(req, res) {
  try {
    return handleSuccess(
      res,
      200,
      "Programas obtenidos exitosamente",
      await listAvailablePrograms(req.user.id),
    );
  } catch (error) {
    return firingError(res, error);
  }
}

export async function getContext(req, res) {
  try {
    const kilnId = parseId(req.params.kilnId);
    const context = kilnId
      ? await getOwnedFiringContext(req.user.id, kilnId)
      : null;
    if (!context) return handleErrorClient(res, 404, "Horno no encontrado");
    return handleSuccess(res, 200, "Estado de quema obtenido", {
      ...context,
      activeFiringCycle: context.firingCycles[0] || null,
      firingCycles: undefined,
      reconciliation: context.controller
        ? getControllerFiringAvailability(context.controller.controllerId)
        : { ready: false, reason: "CONTROLLER_REQUIRED" },
    });
  } catch (error) {
    return firingError(res, error);
  }
}

export async function selectProgram(req, res) {
  let controllerId = null;
  let selectionAcquired = false;
  try {
    const kilnId = parseId(req.params.kilnId);
    if (!kilnId) return handleErrorClient(res, 404, "Horno no encontrado");
    const context = await getOwnedFiringContext(req.user.id, kilnId);
    if (!context) return handleErrorClient(res, 404, "Horno no encontrado");
    if (!context.controller) {
      const error = new Error("El horno no tiene controlador");
      error.code = "CONTROLLER_REQUIRED";
      throw error;
    }
    controllerId = context.controller?.controllerId || null;
    const availability = controllerId
      ? acquireControllerSelection(controllerId)
      : { ready: false };
    if (!availability.ready) {
      return handleErrorClient(
        res,
        409,
        "El controlador todavía está reconciliando su estado",
      );
    }
    selectionAcquired = true;
    const program = await selectOwnedKilnProgram(
      req.user.id,
      kilnId,
      req.body.programId,
    );
    void publishControllerCatalog(controllerId).catch((error) =>
      console.error(
        "[Firing] Programa guardado; sincronización pendiente:",
        error.message,
      ),
    );
    return handleSuccess(res, 200, "Programa seleccionado", program);
  } catch (error) {
    return firingError(res, error);
  } finally {
    if (selectionAcquired) releaseControllerSelection(controllerId);
  }
}

export async function startProgram(req, res) {
  try {
    const kilnId = parseId(req.params.kilnId);
    if (!kilnId) return handleErrorClient(res, 404, "Horno no encontrado");
    const context = await getOwnedFiringContext(req.user.id, kilnId);
    await assertCanStart(context);
    const availability = getControllerFiringAvailability(
      context.controller.controllerId,
    );
    if (!availability.ready) {
      const error = new Error(
        "El controlador todavía está reconciliando su estado",
      );
      error.code = "CONTROLLER_NOT_RECONCILED";
      throw error;
    }
    const result = await publishFiringCommand(context.controller.controllerId, {
      commandId: req.body.commandId,
      command: "START_PROGRAM",
      programId: context.selectedProgram.programId,
      programConfig: context.selectedProgram.configuration,
    });
    const cycle = result.controllerCycleId
      ? await getCycleByControllerId(result.controllerCycleId)
      : null;
    return handleSuccess(
      res,
      201,
      "Ciclo iniciado exitosamente",
      cycle || result,
    );
  } catch (error) {
    return firingError(res, error);
  }
}

export async function commandCycle(req, res) {
  try {
    const kilnId = parseId(req.params.kilnId);
    const firingCycleId = parseId(req.params.firingCycleId);
    const context = kilnId
      ? await getOwnedFiringContext(req.user.id, kilnId)
      : null;
    const cycle = context?.firingCycles.find(
      (item) => item.firingCycleId === firingCycleId,
    );
    if (!context || !cycle) {
      return handleErrorClient(res, 404, "Ciclo activo no encontrado");
    }
    const allowed = {
      RUNNING: ["PAUSE", "CANCEL"],
      PAUSED: ["RESUME", "CANCEL"],
    };
    if (!allowed[cycle.status]?.includes(req.body.command)) {
      const error = new Error("Transición de ciclo inválida");
      error.code = "INVALID_TRANSITION";
      throw error;
    }
    const result = await publishFiringCommand(context.controller.controllerId, {
      commandId: req.body.commandId,
      command: req.body.command,
      controllerCycleId: cycle.controllerCycleId,
    });
    return handleSuccess(res, 200, "Comando confirmado", result);
  } catch (error) {
    return firingError(res, error);
  }
}

export async function getCycles(req, res) {
  try {
    const kilnId = parseId(req.params.kilnId);
    if (!kilnId) return handleErrorClient(res, 404, "Horno no encontrado");
    const result = await listOwnedCycles(
      req.user.id,
      kilnId,
      req.query.page,
      req.query.pageSize,
    );
    if (!result) return handleErrorClient(res, 404, "Horno no encontrado");
    return handleSuccess(res, 200, "Ciclos obtenidos", result);
  } catch (error) {
    return firingError(res, error);
  }
}

export async function getCycleTelemetry(req, res) {
  try {
    const kilnId = parseId(req.params.kilnId);
    const firingCycleId = parseId(req.params.firingCycleId);
    if (!kilnId || !firingCycleId) {
      return handleErrorClient(res, 404, "Ciclo no encontrado");
    }
    const result = await getOwnedCycleTelemetry(
      req.user.id,
      kilnId,
      firingCycleId,
      req.query.page,
      req.query.pageSize,
    );
    if (!result) return handleErrorClient(res, 404, "Ciclo no encontrado");
    return handleSuccess(res, 200, "Telemetría obtenida", result);
  } catch (error) {
    return firingError(res, error);
  }
}
