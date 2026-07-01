import { z } from "zod";
import { ROLES } from "../constants/user.constants.js";

export const createUserValidation = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.email("Debe ser un correo electrónico válido"),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
  role: z
    .enum([ROLES.ADMIN, ROLES.USER], "Debe ingresar un rol válido")
    .optional(),
}).strict();

export const updateProfileValidation = z
  .object({
    name: z
      .string()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .optional(),
    email: z.email("Debe ser un correo electrónico válido").optional(),
    password: z
      .string()
      .min(6, "La contraseña debe tener mínimo 6 caracteres")
      .optional(),
  })
  .strict();

export const updateUserValidation = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .optional(),
  email: z.email("Debe ser un correo electrónico válido").optional(),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .optional(),
  role: z.enum([ROLES.ADMIN, ROLES.USER], "Debe ingresar un rol válido")
    .optional(),
}).strict();
