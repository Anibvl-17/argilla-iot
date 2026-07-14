import { z } from "zod";

export const registerValidation = z
  .object({
    name: z
      .string("Debe incluir nombre de tipo texto")
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(150, "El nombre debe tener máximo 150 caracteres")
      .regex(/^[a-zA-Z ]+$/, "El nombre solo puede contener letras y espacios"),
    email: z.email("El email es obligatorio, debe ser un correo válido"),
    password: z
      .string("Debe incluir contraseña de tipo texto")
      .min(6, "La contraseña debe tener al menos 6 caracteres")
      .max(128, "La contraseña debe tener máximo 128 caracteres"),
  })
  .strict();

export const loginValidation = z
  .object({
    email: z.email("Debe ser un correo válido"),
    password: z
      .string("Debe incluir contraseña de tipo texto")
      .min(6, "La contraseña debe tener al menos 6 caracteres")
      .max(128, "La contraseña debe tener máximo 128 caracteres"),
  })
  .strict();
