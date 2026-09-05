export const ROLES = {
  ADMIN: "ADMIN",
  TECHNICIAN: "TECHNICIAN",
  CLIENT: "CLIENT",
  // Alias temporal para el backend existente. Se retirará con la integración UI.
  USER: "CLIENT",
};

export const ROLE_NAMES = {
  [ROLES.ADMIN]: "Administrador",
  [ROLES.TECHNICIAN]: "Técnico",
  [ROLES.CLIENT]: "Cliente",
};
