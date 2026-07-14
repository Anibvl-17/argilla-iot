import { z } from "zod";

export const createKilnValidation = z
  .object({
    name: z
      .string("Debe incluir nombre de tipo texto")
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(100, "El nombre debe tener como máximo 100 caracteres"),
    liters: z
      .number("Los litros deben ser un número positivo")
      .int("Los litros deben ser un número entero")
      .min(1, "Debe ingresar entre 1 a 500 litros")
      .max(500, "Debe ingresar entre 1 a 500 litros"),
    phases: z.union(
      [z.literal(1), z.literal(3)],
      "Las fases solo pueden ser número 1 o 3",
    ),
    volts: z
      .number("El voltaje debe ser un número positivo")
      .int("El voltaje debe ser un número entero")
      .min(100, "Debe ingresar entre 100 a 600 V")
      .max(600, "Debe ingresar entre 100 a 600 V"),
    amps: z
      .number("El amperaje debe ser un número positivo")
      .int("El amperaje debe ser un número entero")
      .min(1, "Debe ingresar entre 1 a 500 A")
      .max(500, "Debe ingresar entre 1 a 500 A"),
  })
  .strict();

export const editKilnValidation = z
  .object({
    name: z
      .string("El nombre debe ser de tipo texto")
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(100, "El nombre debe tener como máximo 100 caracteres")
      .optional(),
    liters: z
      .number("Los litros deben ser un número")
      .int("Los litros deben ser un número entero")
      .min(1, "Debe ingresar entre 1 a 500 litros")
      .max(500, "Debe ingresar entre 1 a 500 litros")
      .optional(),
    phases: z
      .union([z.literal(1), z.literal(3)], "Solo se permite 1 fase o 3 fases")
      .optional(),
    volts: z
      .number("El voltaje debe ser un número positivo")
      .int("El voltaje debe ser un número entero")
      .min(100, "Debe ingresar entre 100 a 600 V")
      .max(600, "Debe ingresar entre 100 a 600 V")
      .optional(),
    amps: z
      .number("El amperaje debe ser un número positivo")
      .int("El amperaje debe ser un número entero")
      .min(1, "Debe ingresar entre 1 a 500 A")
      .max(500, "Debe ingresar entre 1 a 500 A")
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
    .min(100000, "El PIN esta fuera del rango permitido")
    .max(999999, "El PIN esta fuera del rango permitido"),
});

export const unlinkUserValidation = z
  .object({
    userId: z.int("Debe incluir ID de usuario de válida"),
  })
  .strict();

export const renameUserKilnValidation = z
  .object({
    name: z
      .string("El nombre debe ser de tipo texto")
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(100, "El nombre debe tener como máximo 100 caracteres"),
  })
  .strict();

export const kilnControllerCommandValidation = z
  .object({
    command: z.enum(["ON", "OFF"], "El comando debe ser ON u OFF"),
  })
  .strict();
