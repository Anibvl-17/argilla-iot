export const CONTROLLER_STATUS = {
  WAITING: "WAITING", // Operativo, en espera de vinculacion a horno
  LINKED: "LINKED", // Operativo y vinculado a horno
  CLAIMED: "CLAIMED", // Vinculado a horno y usuario
  OUT_OF_SERVICE: "OUT_OF_SERVICE", // Fuera de servicio
};

export const CONTROLLER_STATUS_NAMES = {
  [CONTROLLER_STATUS.WAITING]: "En espera",
  [CONTROLLER_STATUS.LINKED]: "Enlazado",
  [CONTROLLER_STATUS.CLAIMED]: "Reclamado",
  [CONTROLLER_STATUS.OUT_OF_SERVICE]: "Fuera de servicio",
};
