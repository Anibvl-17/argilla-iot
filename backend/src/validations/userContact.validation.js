import { z } from "zod";

export const userContactValidationShape = {
  phone: z.string().trim().min(1).max(64).nullable().optional(),
  phoneCountryCode: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z]{2}$/,
      "El país del teléfono debe usar un código ISO de dos letras",
    )
    .transform((value) => value.toUpperCase())
    .nullable()
    .optional(),
  countryId: z.number().int().positive("El país seleccionado no es válido").nullable().optional(),
  regionId: z.number().int().positive("La región seleccionada no es válida").nullable().optional(),
  communeId: z.number().int().positive("La comuna seleccionada no es válida").nullable().optional(),
  addressLine: z
    .string()
    .trim()
    .min(1, "La dirección no puede estar vacía")
    .max(300, "La dirección debe tener máximo 300 caracteres")
    .nullable()
    .optional(),
};
