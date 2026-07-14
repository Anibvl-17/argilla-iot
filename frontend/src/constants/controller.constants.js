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
  SSR: "SSR"
};

export const CONTROLLER_OPERATION_LABELS = {
  ON: "Encendido",
  OFF: "Apagado",
};

export const CONTROLLER_CONNECTION_LABELS = {
  ONLINE: "Conectado",
  OFFLINE: "Desconectado",
};

export function getControllerOperationLabel(status) {
  return CONTROLLER_OPERATION_LABELS[status] || "Apagado";
}

export function getControllerConnectionLabel(status) {
  return CONTROLLER_CONNECTION_LABELS[status] || "Desconectado";
}
