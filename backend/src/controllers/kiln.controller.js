import {
  handleErrorClient,
  handleErrorServer,
  handleSuccess,
} from "../handlers/response.handler.js";
import {
  createKiln,
  getKilnsByUserId,
  linkControllerToKiln,
  linkUserToKiln,
  unlinkControllerFromKiln,
  unlinkUserFromKiln,
} from "../services/kiln.service.js";

export async function addKiln(req, res) {
  try {
    const kilnData = req.body;

    const newKiln = await createKiln(kilnData);

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
      return handleSuccess(
        res,
        204,
        "No se encontraron hornos asociados al usuario",
        kilns,
      );
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

/**
 * Endpoint para vincular un controlador a un horno utilizando una porción del
 * UUID del controlador y un PIN generado automaticamente
 *
 * @returns HTTP 400: Pin no proporcionado; HTTP 200: Vinculado con exito;
 * HTTP 500: Error de servidor
 *
 * @todo Evaluar rol que puede acceder a esta función
 */
export async function linkController(req, res) {
  try {
    const { kilnId } = req.params;
    const { partialControllerId, pin } = req.body;

    if (!pin) {
      return handleErrorClient(res, 400, "El PIN es requerido");
    }

    if (!partialControllerId) {
      return handleErrorClient(res, 400, "El ID del controlador es requerido");
    }

    const updatedKiln = await linkControllerToKiln(
      parseInt(kilnId),
      partialControllerId,
      pin,
    );

    return handleSuccess(
      res,
      200,
      "Controlador vinculado exitosamente",
      updatedKiln,
    );
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al vincular controlador",
      error.message,
    );
  }
}

export async function unlinkController(req, res) {
  try {
    const { kilnId } = req.params;

    const updatedKiln = await unlinkControllerFromKiln(parseInt(kilnId));

    if (!updatedKiln) {
      return handleSuccess(res, 200, "Horno no tiene controlador vinculado");
    }

    return handleSuccess(
      res,
      200,
      "Controlador desvinculado con exito",
      updatedKiln,
    );
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al desvincular controlador",
      error.message,
    );
  }
}

export async function linkUser(req, res) {
  try {
    const userId = req.user.id;
    const { partialControllerId, pin } = req.body;

    if (!partialControllerId) {
      return handleErrorClient(res, 400, "El ID es requerido");
    }

    if (!pin) {
      return handleErrorClient(res, 400, "El PIN es requerido");
    }

    const linkedKiln = await linkUserToKiln(userId, partialControllerId, pin);

    if (!linkedKiln) {
      return handleSuccess(res, 200, "Usuario ya posee horno");
    }

    return handleSuccess(res, 200, "Usuario vinculado exitosamente", linkedKiln);
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al vincular usuario",
      error.message,
    );
  }
}

export async function unlinkUser(req, res) {
  try {
    const userId = req.user.id;
    const { kilnId } = req.params;

    const unlinkedKiln = await unlinkUserFromKiln(userId, parseInt(kilnId));

    return handleSuccess(res, 200, "Usuario desvinculado exitosamente", unlinkedKiln);
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al desvincular usuario",
      error.message,
    );
  }
}
