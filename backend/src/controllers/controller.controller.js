import {
  handleErrorClient,
  handleErrorServer,
  handleSuccess,
} from "../handlers/response.handler.js";
import { create, generatePin } from "../services/controller.service.js";

/**
 * Endpoint para crear un controlador lógico
 *
 * @returns HTTP 200 si se crea con exito, HTTP 500 en caso de error de servidor
 *
 * @todo Evaluar rol que puede utilizar esta función
 */
export async function createController(req, res) {
  try {
    const controller = await create();

    return handleSuccess(
      res,
      200,
      "Controlador registrado exitosamente",
      controller,
    );
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al registrar controlador",
      error.message,
    );
  }
}

/**
 * Endpoint para vincular controlador con horno, u usuario con horno a traves
 * de la relación controlador-horno. Se espera que el controlador utilice este
 * endpoint
 * 
 * @returns PIN aleatorio
 */
export async function generateControllerPin(req, res) {
  try {
    const { uuid } = req.params;

    if (!uuid) {
      return handleErrorClient(res, 400, "El ID es requerido");
    }

    const pin = await generatePin(uuid);

    return handleSuccess(res, 200, "PIN generado exitosamente", { pin });
  } catch (error) {
    return handleErrorServer(res, 500, "Error al generar pin", error.message);
  }
}
