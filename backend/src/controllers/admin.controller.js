import {
  handleErrorServer,
  handleSuccess,
} from "../handlers/response.handler.js";
import { getAdminSummary as getAdminSummaryRequest } from "../services/admin.service.js";

export async function getAdminSummary(req, res) {
  try {
    const summary = await getAdminSummaryRequest();
    return handleSuccess(res, 200, "Resumen obtenido exitosamente", summary);
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al obtener el resumen administrativo",
      error.message,
    );
  }
}
