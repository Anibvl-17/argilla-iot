import { z } from "zod";
import { SWITCH_TYPES } from "../constants/controller.constants.js";

export const createControllerValidation = z
  .object({
    switchType: z.enum(
      [SWITCH_TYPES.CONTACTOR, SWITCH_TYPES.SSR],
      "Tipo de contactor desconocido",
    ),
    switchAmps: z
      .number("El amperaje debe ser un número positivo")
      .int("El amperaje debe ser un número entero")
      .min(1, "Debe ingresar entre 1 a 500 A")
      .max(500, "Debe ingresar entre 1 a 500 A"),
  })
  .strict();

export const editControllerValidation = z
  .object({
    switchType: z
      .enum(
        [SWITCH_TYPES.CONTACTOR, SWITCH_TYPES.SSR],
        "Tipo de contactor desconocido ",
      )
      .optional(),
    switchAmps: z
      .number("El amperaje debe ser un número positivo")
      .int("El amperaje debe ser un número entero")
      .min(1, "Debe ingresar entre 1 a 500 A")
      .max(500, "Debe ingresar entre 1 a 500 A")
      .optional(),
  })
  .strict();

export const linkUserValidation = z
  .object({
    userId: z.int("Debe incluir ID de usuario de válida"),
    partialControllerId: z
      .string("Debe incluir ID de controlador válida")
      .min(6, "El ID de controlador debe tener 6 caracteres")
      .max(6, "El ID de controlador debe tener 6 caracteres"),
    pin: z
      .int("Debe incluir PIN válido")
      .min(100000, "El PIN esta fuera del rango permitido")
      .max(999999, "El PIN esta fuera del rango permitido"),
  })
  .strict();

export const unlinkUserValidation = z
  .object({
    userId: z.int("Debe incluir ID de usuario de válida"),
  })
  .strict();

export const controllerCommandValidation = z
  .object({
    command: z.enum(["ON", "OFF"], "El comando debe ser ON u OFF"),
  })
  .strict();
