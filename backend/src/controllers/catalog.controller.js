import { handleSuccess } from "../handlers/response.handler.js";
import {
  CHILE_REGIONS,
  COUNTRIES,
} from "../constants/userContact.constants.js";

export function getUserContactCatalog(_req, res) {
  return handleSuccess(res, 200, "Catálogo de contacto obtenido exitosamente", {
    countries: COUNTRIES,
    chileRegions: CHILE_REGIONS,
  });
}
