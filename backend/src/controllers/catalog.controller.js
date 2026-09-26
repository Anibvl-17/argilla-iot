import {
  handleErrorServer,
  handleSuccess,
} from "../handlers/response.handler.js";
import { getUserContactCatalogData } from "../services/catalog.service.js";

export async function getUserContactCatalog(_req, res) {
  try {
    const catalog = await getUserContactCatalogData();
    return handleSuccess(
      res,
      200,
      "Catálogo de contacto obtenido exitosamente",
      catalog,
    );
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "No se pudo obtener el catálogo de contacto",
      error.message,
    );
  }
}
