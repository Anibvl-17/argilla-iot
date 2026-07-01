import { z } from "zod";

export const createKilnValidation = z
  .object({
    name: z
      .string("Debe incluir nombre de tipo texto")
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres"),
    liters: z
      .number("Los litros deben ser un número positivo")
      .positive("Los litros deben ser un número positivo"),
    phases: z.union(
      [z.literal(1), z.literal(3)],
      "Las fases solo pueden ser número 1 o 3",
    ),
    volts: z
      .number("El voltaje debe ser un número positivo")
      .positive("El voltaje debe ser un número positivo"),
    amps: z
      .number("El amperaje debe ser un número positivo")
      .positive("El amperaje debe ser un número positivo"),
  })
  .strict();

export const editKilnValidation = z
  .object({
    name: z
      .string("El nombre debe ser de tipo texto")
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .optional(),
    liters: z
      .number("Los litros deben ser un número")
      .positive("Los litros deben ser un número")
      .optional(),
    phases: z
      .union([z.literal(1), z.literal(3)], "Solo se permite 1 fase o 3 fases")
      .optional(),
    volts: z
      .number("El voltaje debe ser un número positivo")
      .positive("El voltaje debe ser un número positivo")
      .optional(),
    amps: z
      .number("El amperaje debe ser un número positivo")
      .positive("El amperaje debe ser un número positivo")
      .optional(),
  })
  .strict();

export const linkUserValidation = z
  .object({
    userId: z.int("Debe incluir ID de tipo número"),
  })
  .strict();

export const linkControllerValidation = z.object({
  partialControllerId: z
    .string("Debe incluir el ID de tipo texto")
    .trim()
    .length(6, "El ID del controlador debe ser exactamente 6 caracteres"),
  pin: z
    .number("El PIN debe ser un número positivo")
    .min(100000, "El PIN esta fuera del rango permitido"),
});

export const unlinkUserValidation = z
  .object({
    userId: z.int("Debe incluir ID de usuario de válida"),
  })
  .strict();
