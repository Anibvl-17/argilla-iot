import {
  handleErrorClient,
  handleErrorServer,
} from "../handlers/response.handler.js";
import { z } from "zod";

export const validateSchema = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map((issue) => issue.message);
      const errorFields = error.issues.map(
        (issue) => issue.path?.[0] || null,
      );

      return handleErrorClient(
        res,
        400,
        "Error de validación en los datos.",
        errorMessages,
        error.issues[0]?.path?.[0] || null,
        errorFields,
      );
    }

    return handleErrorServer(
      res,
      500,
      "Error durante validacion",
      error.message,
    );
  }
};
