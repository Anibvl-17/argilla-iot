import { z } from "zod";

const connectionType = z.enum(["SERIES", "PARALLEL"]);
const nodeName = z.string().trim().min(1, "El nombre no puede estar vacío");

const circuitNode = z.lazy(() =>
  z.discriminatedUnion("type", [
    z
      .object({
        type: z.literal("GROUP"),
        name: nodeName,
        connectionType,
        elements: z
          .array(circuitNode)
          .min(1, "El grupo debe contener al menos un elemento"),
      })
      .strict(),
    z
      .object({
        type: z.literal("CHANNEL"),
        name: nodeName,
        resistanceOhms: z
          .number()
          .positive("La resistencia debe ser mayor que cero"),
        lengthMeters: z
          .number()
          .positive("La longitud debe ser mayor que cero"),
      })
      .strict(),
  ]),
);

export const heatingCircuitConfigurationValidation = z
  .object({
    type: z.literal("ROOT"),
    connectionType,
    elements: z
      .array(circuitNode)
      .min(1, "La raíz debe contener al menos un elemento"),
  })
  .strict();

const dateValue = z
  .string()
  .refine(
    (value) => !Number.isNaN(new Date(value).getTime()),
    "Fecha inválida",
  );
const nullableDateValue = dateValue.nullable();

const kilnFields = {
  name: z.string().trim().min(2).max(100),
  liters: z.number().int().min(1).max(500),
  phaseCount: z.union([z.literal(1), z.literal(3)]),
  nominalVoltage: z.number().int().min(100).max(600),
  nominalCurrent: z.number().int().min(1).max(500),
  manufacturedAt: dateValue,
  deliveredAt: nullableDateValue.optional(),
  manufacturer: z.string().trim().min(1).max(150),
  heatingCircuitConfiguration: heatingCircuitConfigurationValidation,
};

export const createKilnValidation = z.object(kilnFields).strict();
export const editKilnValidation = z.object(kilnFields).partial().strict();

export const linkUserValidation = z
  .object({ userId: z.number().int().positive() })
  .strict();
export const linkControllerValidation = z
  .object({ controllerId: z.uuid() })
  .strict();

export const kilnControllerCommandValidation = z
  .object({ command: z.enum(["ON", "OFF"]) })
  .strict();
