import { z } from "zod";

export const operationalStatusValidation = z.enum([
  "OPERATIONAL",
  "MAINTENANCE",
  "OUT_OF_SERVICE",
]);

export const updateOperationalStatusValidation = z
  .object({ operationalStatus: operationalStatusValidation })
  .strict();

export const updateTicketEquipmentStatusValidation = z
  .object({
    target: z.enum(["KILN", "CONTROLLER"]),
    operationalStatus: operationalStatusValidation,
  })
  .strict();
