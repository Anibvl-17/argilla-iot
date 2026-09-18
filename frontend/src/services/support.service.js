import axios from "./root.service.js";

function failure(error, fallback) {
  return {
    success: false,
    status: error.response?.status,
    message: error.response?.data?.message || fallback,
    data: error.response?.data,
  };
}

async function request(call, fallback) {
  try {
    const response = await call();
    return { success: true, data: response.data.data };
  } catch (error) {
    return failure(error, fallback);
  }
}

export function getSupportReasons(includeInactive = false) {
  return request(
    () => axios.get("/support/reasons", { params: { includeInactive } }),
    "No fue posible cargar los motivos",
  );
}

export function createSupportReason(data) {
  return request(
    () => axios.post("/support/reasons", data),
    "No fue posible crear el motivo",
  );
}

export function updateSupportReason(reasonId, data) {
  return request(
    () => axios.patch(`/support/reasons/${reasonId}`, data),
    "No fue posible actualizar el motivo",
  );
}

export function getSupportAssignees() {
  return request(
    () => axios.get("/support/assignees"),
    "No fue posible cargar los responsables",
  );
}

export function getSupportTickets(params = {}) {
  return request(
    () => axios.get("/support/tickets", { params }),
    "No fue posible cargar los tickets",
  );
}

export function createSupportTicket(data) {
  return request(
    () => axios.post("/support/tickets", data),
    "No fue posible crear el ticket",
  );
}

export function getSupportTicket(ticketId) {
  return request(
    () => axios.get(`/support/tickets/${ticketId}`),
    "No fue posible cargar el ticket",
  );
}

export function claimSupportTicket(ticketId) {
  return request(
    () => axios.patch(`/support/tickets/${ticketId}/claim`),
    "No fue posible tomar el ticket",
  );
}

export function assignSupportTicket(ticketId, assignedToUserId) {
  return request(
    () =>
      axios.patch(`/support/tickets/${ticketId}/assignment`, {
        assignedToUserId,
      }),
    "No fue posible asignar el ticket",
  );
}

export function updateSupportTicketStatus(ticketId, data) {
  return request(
    () => axios.patch(`/support/tickets/${ticketId}/status`, data),
    "No fue posible actualizar el estado",
  );
}

export function getSupportDiagnostics(ticketId) {
  return request(
    () => axios.get(`/support/tickets/${ticketId}/diagnostics`),
    "No fue posible cargar el diagnóstico",
  );
}

export function getSupportTelemetry(
  ticketId,
  firingCycleId,
  page = 1,
  pageSize = 10,
) {
  return request(
    () =>
      axios.get(`/support/tickets/${ticketId}/telemetry`, {
        params: { firingCycleId, page, pageSize },
      }),
    "No fue posible cargar la telemetría",
  );
}

export function createTicketMaintenance(ticketId, data) {
  return request(
    () => axios.post(`/support/tickets/${ticketId}/maintenance`, data),
    "No fue posible registrar el mantenimiento",
  );
}
