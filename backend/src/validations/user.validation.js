import { z } from "zod";
import { ROLES } from "../constants/user.constants.js";
import { userContactValidationShape } from "./userContact.validation.js";

const name = z
  .string()
  .trim()
  .min(2, "El nombre debe tener al menos 2 caracteres")
  .max(150);
const password = z
  .string()
  .min(6, "La contraseña debe tener al menos 6 caracteres")
  .max(128);

export const createUserValidation = z
  .object({
    name,
    email: z.email("Debe ser un correo electrónico válido"),
    password,
    ...userContactValidationShape,
    role: z.enum([ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.CLIENT]).optional(),
  })
  .strict();

export const updateProfileValidation = z
  .object({
    name: name.optional(),
    ...userContactValidationShape,
    currentPassword: password.optional(),
    newPassword: password.optional(),
  })
  .strict()
  .superRefine((data, context) => {
    if (Boolean(data.currentPassword) !== Boolean(data.newPassword)) {
      context.addIssue({
        code: "custom",
        path: [data.newPassword ? "currentPassword" : "newPassword"],
        message: "Debe ingresar la contraseña actual y la nueva contraseña",
      });
    }
    if (!Object.keys(data).length) {
      context.addIssue({
        code: "custom",
        message: "Debe modificar al menos un campo",
      });
    }
  });

export const updateUserValidation = z
  .object({
    name: name.optional(),
    email: z.email("Debe ser un correo electrónico válido").optional(),
    password: password.optional(),
    ...userContactValidationShape,
    role: z.enum([ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.CLIENT]).optional(),
  })
  .strict();

export const updateUserStatusValidation = z
  .object({ isActive: z.boolean() })
  .strict();
