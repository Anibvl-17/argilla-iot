import {
  handleErrorClient,
  handleErrorServer,
  handleSuccess,
} from "../handlers/response.handler.js";
import {
  createKiln,
  edit,
  getKilnsByUserId,
  getUserKilnById,
  renameUserKiln,
  linkControllerToKiln,
  linkUserToKiln,
  remove,
  unlinkControllerFromKiln,
  unlinkUserFromKiln,
  getAllKilns as getAllKilnsRequest,
} from "../services/kiln.service.js";
import { emitAdminSummary } from "../realtime/socket.js";

export async function addKiln(req, res) {
  try {
    const kilnData = req.body;

    const newKiln = await createKiln(kilnData);
    void emitAdminSummary();

    return handleSuccess(res, 201, "Horno creado exitosamente", newKiln);
  } catch (error) {
    return handleErrorServer(res, 500, "Error al crear horno", error.message);
  }
}

export async function getUserKilns(req, res) {
  try {
    const userId = req.user.id;
    const kilns = await getKilnsByUserId(userId);

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

export async function getUserKiln(req, res) {
  try {
    const kilnId = Number(req.params.kilnId);
    if (!Number.isInteger(kilnId) || kilnId < 1) {
      return handleErrorClient(res, 404, "Horno no encontrado");
    }

    const kiln = await getUserKilnById(req.user.id, kilnId);

    if (!kiln) {
      return handleErrorClient(res, 404, "Horno no encontrado");
    }

    return handleSuccess(res, 200, "Horno obtenido exitosamente", kiln);
  } catch (error) {
    return handleErrorServer(res, 500, "Error al obtener horno", error.message);
  }
}

export async function renameOwnedKiln(req, res) {
  try {
    const kilnId = Number(req.params.kilnId);
    if (!Number.isInteger(kilnId) || kilnId < 1) {
      return handleErrorClient(res, 404, "Horno no encontrado");
    }

    const kiln = await renameUserKiln(
      req.user.id,
      kilnId,
      req.body.name,
    );

    if (!kiln) {
      return handleErrorClient(res, 404, "Horno no encontrado");
    }

    return handleSuccess(res, 200, "Nombre actualizado exitosamente", kiln);
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al actualizar nombre del horno",
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
    void emitAdminSummary();

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

    void emitAdminSummary();

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

/**
 * Endpoint de administrador para enlazar un horno a un usuario. Utilizado en
 * casos donde el horno existe sin controlador
 * @returns HTTP 400: falta ID de horno o ID de usuario, HTTP 200: vinculo
 *          exitoso
 */
export async function linkUser(req, res) {
  try {
    const { kilnId } = req.params;
    const { userId } = req.body;

    if (!kilnId) {
      return handleErrorClient(res, 400, "El ID del horno es requerido");
    }

    const claimedKiln = await linkUserToKiln(parseInt(kilnId), parseInt(userId));
    void emitAdminSummary();

    return handleSuccess(
      res,
      200,
      "Usuario vinculado exitosamente",
      claimedKiln,
    );
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
    const { kilnId } = req.params;
    const { userId } = req.body;

    await unlinkUserFromKiln(parseInt(userId), parseInt(kilnId));
    void emitAdminSummary();

    return handleSuccess(res, 200, "Usuario desvinculado exitosamente");
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al desvincular usuario",
      error.message,
    );
  }
}

export async function editKiln(req, res) {
  try {
    const { kilnId } = req.params;
    const { body } = req;

    const updatedKiln = await edit(parseInt(kilnId), body);

    return handleSuccess(
      res,
      200,
      "Horno actualizado exitosamente",
      updatedKiln,
    );
  } catch (error) {
    if (error.code === "P2025") {
      return handleErrorClient(res, 404, "Horno no encontrado");
    }

    return handleErrorServer(res, 500, "Error al editar horno", error.message);
  }
}

export async function removeKiln(req, res) {
  try {
    const { kilnId } = req.params;

    const isRemoved = await remove(parseInt(kilnId));

    if (!isRemoved) {
      return handleErrorClient(res, 404, "Horno no encontrado");
    }

    void emitAdminSummary();

    return handleSuccess(res, 200, "Horno eliminado exitosamente");
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al eliminar horno",
      error.message,
    );
  }
}

export async function getAllKilns(req, res) {
  try {
    const kilns = await getAllKilnsRequest();

    if (kilns && kilns.length === 0) {
      return handleSuccess(res, 204, "No hay hornos registrados", kilns);
    }

    return handleSuccess(res, 200, "Hornos obtenidos exitosamente", kilns);
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al obtener todos los hornos",
      error.message,
    );
  }
}
