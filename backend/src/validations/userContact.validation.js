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
  countryCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, "El país debe usar un código ISO de dos letras")
    .transform((value) => value.toUpperCase())
    .nullable()
    .optional(),
  regionCode: z
    .string()
    .trim()
    .regex(/^\d{2}$/, "La región debe usar un código de dos dígitos")
    .nullable()
    .optional(),
  communeCode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "La comuna debe usar un código de cinco dígitos")
    .nullable()
    .optional(),
  addressLine: z
    .string()
    .trim()
    .min(1, "La dirección no puede estar vacía")
    .max(300, "La dirección debe tener máximo 300 caracteres")
    .nullable()
    .optional(),
};
