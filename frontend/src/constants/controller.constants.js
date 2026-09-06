export const CONTROLLER_LINK_STATUS = {
  UNLINKED: "UNLINKED",
  LINKED_TO_KILN: "LINKED_TO_KILN",
  LINKED_TO_USER: "LINKED_TO_USER",
  LINKED_TO_KILN_AND_USER: "LINKED_TO_KILN_AND_USER",
};

export const CONTROLLER_LINK_STATUS_LABELS = {
  UNLINKED: "No vinculado",
  LINKED_TO_KILN: "Vinculado a Horno",
  LINKED_TO_USER: "Vinculado a Usuario",
  LINKED_TO_KILN_AND_USER: "Vinculado a Horno y Usuario",
};

export const SWITCH_LABELS = {
  CONTACTOR: "Contactor",
  SSR: "SSR",
};

export const CONTROLLER_ACTIVITY_LABELS = {
  IDLE: "Detenido",
  FIRING: "En quema",
  PAUSED: "Pausado",
  ERROR: "Con error",
};

export const OPERATIONAL_STATUS_LABELS = {
  OPERATIONAL: "Operativo",
  MAINTENANCE: "En mantención",
  OUT_OF_SERVICE: "Fuera de servicio",
};

export const OPERATIONAL_STATUS_OPTIONS = Object.entries(
  OPERATIONAL_STATUS_LABELS,
).map(([value, label]) => ({ value, label }));

export const CONTROLLER_OPERATION_LABELS = {
  ON: "Encendido",
  OFF: "Apagado",
};

export const CONTROLLER_CONNECTION_LABELS = {
  ONLINE: "Conectado",
  OFFLINE: "Desconectado",
};

export function formatEnumLabel(value, labels = {}) {
  if (!value) return "No disponible";
  if (labels[value]) return labels[value];

  const normalized = String(value).toLowerCase().replaceAll("_", " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function getControllerOperationLabel(status) {
  return status === true || status === "ON" ? "Encendido" : "Apagado";
}

export function getControllerConnectionLabel(status) {
  return formatEnumLabel(status, CONTROLLER_CONNECTION_LABELS);
}

export function getControllerActivityLabel(status) {
  return formatEnumLabel(status, CONTROLLER_ACTIVITY_LABELS);
}

export function getOperationalStatusLabel(status) {
  return formatEnumLabel(status, OPERATIONAL_STATUS_LABELS);
}

export function getSwitchLabel(type) {
  return formatEnumLabel(type, SWITCH_LABELS);
}
