import {
  handleErrorClient,
  handleErrorServer,
  handleSuccess,
} from "../handlers/response.handler.js";
import { getStatusByMAC, register } from "../services/controller.service.js";

// Endpoint para que el controlador solicite el pin con su dirección MAC
export async function registerController(req, res) {
  try {
    const { macAddress } = req.body;

    if (!macAddress) {
      return handleErrorClient(res, 400, "La dirección MAC es obligatoria");
    }

    const controller = await register(macAddress);

    return handleSuccess(
      res,
      200,
      "Controlador registrado exitosamente",
      controller,
    );
  } catch (error) {
    return handleErrorServer(res, 500, "Error al registrar controlador", error.message);
  }
}

// Endpoint para verificar si el PIN ya se envío
export async function checkLinkStatus(req, res) {
  try {
    const { macAddress } = req.params;
    const controller = await getStatusByMAC(macAddress);

    const isLinked = controller.kilnId !== null;
    const responseMessage = isLinked ? "vinculado" : "no vinculado"

    return handleSuccess(res, 200, `Controlador ${responseMessage}`, {
      isLinked,
      kiln: controller.kiln || null, // null en caso de que no este vinculado
    });
  } catch (error) {
    return handleErrorClient(
      res,
      404,
      "MENSAJE POR REVISAR (controller.controller.js)",
      error.message,
    );
  }
}
