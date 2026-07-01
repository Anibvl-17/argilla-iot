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
      .positive("El amperaje debe ser un número positivo"),
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
      .positive("El amperaje debe ser un número positivo")
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
    pin: z.int("Debe incluir PIN válido"),
  })
  .strict();

export const unlinkUserValidation = z
  .object({
    userId: z.int("Debe incluir ID de usuario de válida"),
  })
  .strict();
