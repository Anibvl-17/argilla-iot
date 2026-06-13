import { z } from "zod";
import { SWITCH_TYPES } from "../constants/switches.constants.js";

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
