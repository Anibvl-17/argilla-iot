import {
  handleErrorClient,
  handleErrorServer,
  handleSuccess,
} from "../handlers/response.handler.js";
import {
  createKiln,
  getKilnsByUserId,
  linkControllerToKiln,
} from "../services/kiln.service.js";

export async function addKiln(req, res) {
  try {
    const userId = req.user.id;
    const kilnData = req.body;
    console.log(req.user);
    
    const newKiln = await createKiln(userId, kilnData);

    return handleSuccess(res, 201, "Horno creado exitosamente", newKiln);
  } catch (error) {
    return handleErrorServer(res, 500, "Error al crear horno", error.message);
  }
}

export async function getUserKilns(req, res) {
  try {
    const userId = req.user.id;
    const kilns = await getKilnsByUserId(userId);

    if (kilns && kilns.length === 0) {
      return handleSuccess(res, 204, "No se encontraron hornos asociados al usuario", kilns);
    }

    return handleSuccess(res, 200, "Hornos obtenidos exitosamente", kilns);
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al obtener hornos",
      error.message,
    );
  }
}

export async function linkController(req, res) {
  try {
    const userId = req.user.id;
    const { kilnId } = req.params;
    const { pin } = req.body;

    if (!pin) {
      return handleErrorClient(res, 400, "El PIN es requerido");
    }

    const updatedKiln = await linkControllerToKiln(
      userId,
      parseInt(kilnId),
      pin,
    );

    return handleSuccess(
      res,
      200,
      "Controlador vinculado exitosamente",
      updatedKiln,
    );
  } catch (error) {
    return handleErrorClient(res, 400, error.message);
  }
}
