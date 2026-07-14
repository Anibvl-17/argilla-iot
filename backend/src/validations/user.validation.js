import { z } from "zod";
import { ROLES } from "../constants/user.constants.js";

export const createUserValidation = z
  .object({
    name: z
      .string()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(150, "El nombre debe tener máximo 150 caracteres"),
    email: z.email("Debe ser un correo electrónico válido"),
    password: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres"),
    role: z
      .enum([ROLES.ADMIN, ROLES.USER], "Debe ingresar un rol válido")
      .optional(),
  })
  .strict();

export const updateProfileValidation = z
  .object({
    currentPassword: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres")
      .max(128, "La contraseña debe tener máximo 128 caracteres"),
    newPassword: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres")
      .max(128, "La contraseña debe tener máximo 128 caracteres"),
  })
  .strict();

export const updateUserValidation = z
  .object({
    name: z
      .string()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(150, "El nombre debe tener máximo 150 caracteres")
      .optional(),
    email: z.email("Debe ser un correo electrónico válido").optional(),
    password: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres")
      .max(128, "La contraseña debe tener máximo 128 caracteres")
      .optional(),
    role: z
      .enum([ROLES.ADMIN, ROLES.USER], "Debe ingresar un rol válido")
      .optional(),
  })
  .strict();
