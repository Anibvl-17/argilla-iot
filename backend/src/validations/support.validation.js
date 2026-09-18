import { z } from "zod";

const positiveId = z.number().int().positive();
const trimmedText = (min, max) => z.string().trim().min(min).max(max);

export const createSupportReasonValidation = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^[A-Z][A-Z0-9_]{1,49}$/),
    name: trimmedText(2, 100),
  })
  .strict();

export const updateSupportReasonValidation = z
  .object({
    name: trimmedText(2, 100).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "No hay cambios para aplicar",
  );

export const createSupportTicketValidation = z
  .object({
    supportReasonId: positiveId,
    kilnId: positiveId,
    title: trimmedText(3, 150),
    description: trimmedText(10, 5000),
  })
  .strict();

export const assignSupportTicketValidation = z
  .object({ assignedToUserId: positiveId })
  .strict();

export const updateSupportTicketStatusValidation = z
  .object({
    status: z.enum(["IN_PROGRESS", "RESOLVED", "CLOSED"]),
    resolution: trimmedText(3, 5000).optional(),
  })
  .strict();

export const createMaintenanceValidation = z
  .object({
    kilnId: positiveId.optional(),
    controllerId: z.uuid().optional(),
    type: z.enum(["PREVENTIVE", "CORRECTIVE", "INSPECTION"]),
    title: trimmedText(3, 150),
    workPerformed: trimmedText(3, 5000),
    performedAt: z
      .string()
      .refine(
        (value) => !Number.isNaN(new Date(value).getTime()),
        "Fecha inválida",
      ),
  })
  .strict()
  .refine((data) => data.kilnId || data.controllerId, {
    message: "Debe indicar el horno, el controlador o ambos",
    path: ["kilnId"],
  });
