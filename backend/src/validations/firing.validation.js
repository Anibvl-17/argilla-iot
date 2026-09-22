import { z } from "zod";

const commandId = z.uuid("commandId debe ser un UUID válido");

export const selectProgramValidation = z
  .object({ programId: z.number().int().positive() })
  .strict();

export const startProgramValidation = z.object({ commandId }).strict();

export const cycleCommandValidation = z
  .object({
    commandId,
    command: z.enum(["PAUSE", "RESUME", "CANCEL"]),
  })
  .strict();
