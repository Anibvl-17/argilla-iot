import { z } from "zod";
import { SWITCH_TYPES } from "../constants/controller.constants.js";

const dateValue = z.string().refine((value) => !Number.isNaN(new Date(value).getTime()), "Fecha inválida");
const fields = {
  switchType: z.enum([SWITCH_TYPES.CONTACTOR, SWITCH_TYPES.SSR]),
  switchCurrentCapacity: z.number().int().min(1).max(500),
  manufacturedAt: dateValue,
  deliveredAt: dateValue.nullable().optional(),
  firmwareVersion: z.string().trim().min(1).max(100),
  firmwareUpdatedAt: dateValue.nullable().optional(),
};

export const createControllerValidation = z.object(fields).strict();
export const editControllerValidation = z.object(fields).partial().strict();

export const pairControllerValidation = z
  .object({
    partialControllerId: z.string().trim().regex(/^[0-9a-fA-F]{6}$/),
    pin: z.string().regex(/^\d{6}$/, "El PIN debe contener seis dígitos"),
  })
  .strict();

export const controllerCommandValidation = z
  .object({ command: z.enum(["ON", "OFF"]) })
  .strict();
