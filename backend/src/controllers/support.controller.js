import {
  handleErrorClient,
  handleErrorServer,
  handleSuccess,
} from "../handlers/response.handler.js";
import {
  assignSupportTicket,
  claimSupportTicket,
  createSupportReason,
  createSupportTicket,
  createTicketMaintenance,
  getSupportDiagnostics,
  getSupportTelemetry,
  getSupportTicket,
  listEligibleAssignees,
  listSupportReasons,
  listSupportTickets,
  updateSupportReason,
  updateTicketEquipmentStatus,
  updateTicketMaintenance,
  updateSupportTicketStatus,
} from "../services/support.service.js";
import { emitAdminSummary } from "../realtime/socket.js";

function idFrom(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function handleSupportError(res, error, fallback) {
  if (["NOT_FOUND"].includes(error.code)) {
    return handleErrorClient(res, 404, error.message);
  }
  if (["FORBIDDEN"].includes(error.code)) {
    return handleErrorClient(res, 403, error.message);
  }
  if (
    [
      "CLAIM_CONFLICT",
      "STATE_CONFLICT",
      "DUPLICATE_REASON",
      "INVALID_TRANSITION",
      "RESOLUTION_REQUIRED",
      "INVALID_ASSIGNEE",
      "INVALID_MAINTENANCE_STATUS",
      "INVALID_TARGET",
      "INVALID_KILN",
      "INVALID_REASON",
      "NO_ASSOCIATED_KILN",
      "CYCLE_ACTIVE",
      "CONTROLLER_REQUIRED",
    ].includes(error.code)
  ) {
    return handleErrorClient(res, 409, error.message);
  }
  if (error.code === "INVALID_FILTER") {
    return handleErrorClient(res, 400, error.message);
  }
  return handleErrorServer(res, 500, fallback, error.message);
}

export async function getReasons(req, res) {
  try {
    const reasons = await listSupportReasons(
      req.user,
      req.query.includeInactive === "true",
    );
    return handleSuccess(res, 200, "Motivos obtenidos exitosamente", reasons);
  } catch (error) {
    return handleSupportError(res, error, "Error al obtener motivos");
  }
}

export async function addReason(req, res) {
  try {
    return handleSuccess(
      res,
      201,
      "Motivo creado exitosamente",
      await createSupportReason(req.body),
    );
  } catch (error) {
    return handleSupportError(res, error, "Error al crear motivo");
  }
}

export async function editReason(req, res) {
  try {
    const id = idFrom(req.params.reasonId);
    if (!id) return handleErrorClient(res, 404, "Motivo no encontrado");
    return handleSuccess(
      res,
      200,
      "Motivo actualizado exitosamente",
      await updateSupportReason(id, req.body),
    );
  } catch (error) {
    return handleSupportError(res, error, "Error al actualizar motivo");
  }
}

export async function getAssignees(_req, res) {
  try {
    return handleSuccess(
      res,
      200,
      "Responsables obtenidos exitosamente",
      await listEligibleAssignees(),
    );
  } catch (error) {
    return handleSupportError(res, error, "Error al obtener responsables");
  }
}

export async function addTicket(req, res) {
  try {
    return handleSuccess(
      res,
      201,
      "Ticket creado exitosamente",
      await createSupportTicket(req.user, req.body),
    );
  } catch (error) {
    return handleSupportError(res, error, "Error al crear ticket");
  }
}

export async function getTickets(req, res) {
  try {
    return handleSuccess(
      res,
      200,
      "Tickets obtenidos exitosamente",
      await listSupportTickets(req.user, req.query),
    );
  } catch (error) {
    return handleSupportError(res, error, "Error al obtener tickets");
  }
}

export async function getTicket(req, res) {
  try {
    const id = idFrom(req.params.ticketId);
    if (!id) return handleErrorClient(res, 404, "Ticket no encontrado");
    const ticket = await getSupportTicket(req.user, id);
    if (!ticket) return handleErrorClient(res, 404, "Ticket no encontrado");
    return handleSuccess(res, 200, "Ticket obtenido exitosamente", ticket);
  } catch (error) {
    return handleSupportError(res, error, "Error al obtener ticket");
  }
}

export async function claimTicket(req, res) {
  try {
    const id = idFrom(req.params.ticketId);
    if (!id) return handleErrorClient(res, 404, "Ticket no encontrado");
    return handleSuccess(
      res,
      200,
      "Ticket asignado exitosamente",
      await claimSupportTicket(req.user, id),
    );
  } catch (error) {
    return handleSupportError(res, error, "Error al tomar ticket");
  }
}

export async function assignTicket(req, res) {
  try {
    const id = idFrom(req.params.ticketId);
    if (!id) return handleErrorClient(res, 404, "Ticket no encontrado");
    return handleSuccess(
      res,
      200,
      "Responsable actualizado exitosamente",
      await assignSupportTicket(req.user, id, req.body.assignedToUserId),
    );
  } catch (error) {
    return handleSupportError(res, error, "Error al asignar ticket");
  }
}

export async function changeTicketStatus(req, res) {
  try {
    const id = idFrom(req.params.ticketId);
    if (!id) return handleErrorClient(res, 404, "Ticket no encontrado");
    return handleSuccess(
      res,
      200,
      "Estado actualizado exitosamente",
      await updateSupportTicketStatus(req.user, id, req.body),
    );
  } catch (error) {
    return handleSupportError(res, error, "Error al actualizar estado");
  }
}

export async function getDiagnostics(req, res) {
  try {
    const id = idFrom(req.params.ticketId);
    if (!id) return handleErrorClient(res, 404, "Ticket no encontrado");
    const diagnostics = await getSupportDiagnostics(req.user, id);
    if (!diagnostics)
      return handleErrorClient(res, 404, "Ticket no encontrado");
    return handleSuccess(
      res,
      200,
      "Diagnóstico obtenido exitosamente",
      diagnostics,
    );
  } catch (error) {
    return handleSupportError(res, error, "Error al obtener diagnóstico");
  }
}

export async function changeEquipmentStatus(req, res) {
  try {
    const id = idFrom(req.params.ticketId);
    if (!id) return handleErrorClient(res, 404, "Ticket no encontrado");
    const equipment = await updateTicketEquipmentStatus(req.user, id, req.body);
    void emitAdminSummary();
    return handleSuccess(
      res,
      200,
      "Estado del equipo actualizado exitosamente",
      equipment,
    );
  } catch (error) {
    return handleSupportError(
      res,
      error,
      "Error al actualizar el estado del equipo",
    );
  }
}

export async function getTelemetry(req, res) {
  try {
    const id = idFrom(req.params.ticketId);
    if (!id) return handleErrorClient(res, 404, "Ticket no encontrado");
    const telemetry = await getSupportTelemetry(req.user, id, req.query);
    if (!telemetry) return handleErrorClient(res, 404, "Ticket no encontrado");
    return handleSuccess(
      res,
      200,
      "Telemetría obtenida exitosamente",
      telemetry,
    );
  } catch (error) {
    return handleSupportError(res, error, "Error al obtener telemetría");
  }
}

export async function addMaintenance(req, res) {
  try {
    const id = idFrom(req.params.ticketId);
    if (!id) return handleErrorClient(res, 404, "Ticket no encontrado");
    return handleSuccess(
      res,
      201,
      "Mantenimiento registrado exitosamente",
      await createTicketMaintenance(req.user, id, req.body),
    );
  } catch (error) {
    return handleSupportError(res, error, "Error al registrar mantenimiento");
  }
}

export async function editMaintenance(req, res) {
  try {
    const ticketId = idFrom(req.params.ticketId);
    const maintenanceId = idFrom(req.params.maintenanceId);
    if (!ticketId || !maintenanceId) {
      return handleErrorClient(res, 404, "Mantenimiento no encontrado");
    }
    return handleSuccess(
      res,
      200,
      "Mantenimiento actualizado exitosamente",
      await updateTicketMaintenance(
        req.user,
        ticketId,
        maintenanceId,
        req.body,
      ),
    );
  } catch (error) {
    return handleSupportError(res, error, "Error al actualizar mantenimiento");
  }
}
