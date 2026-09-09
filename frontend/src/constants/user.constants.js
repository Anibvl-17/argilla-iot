export const ROLES = {
  ADMIN: "ADMIN",
  TECHNICIAN: "TECHNICIAN",
  CLIENT: "CLIENT",
};

export const ROLE_LABELS = {
  ADMIN: "Administrador",
  TECHNICIAN: "Técnico",
  CLIENT: "Cliente",
};

export const USER_STATUS_LABELS = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  ANONYMIZED: "Anonimizado",
};

export const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

export const USER_STATUS_FILTER_OPTIONS = [
  { value: "ACTIVE", label: USER_STATUS_LABELS.ACTIVE },
  { value: "INACTIVE", label: USER_STATUS_LABELS.INACTIVE },
];

export function getUserStatus(user) {
  if (user?.anonymizedAt) return "ANONYMIZED";
  return user?.isActive ? "ACTIVE" : "INACTIVE";
}
