import {
  handleErrorClient,
  handleErrorServer,
  handleSuccess,
} from "../handlers/response.handler.js";
import {
  deleteUser,
  updateUser,
} from "../services/user.service.js";

/**
 * Endpoint para editar los datos del usuario que inició sesión. Permite
 * actualizar nombre, email y contraseña.
 *
 * @returns HTTP 200: actualizacion exitosa; HTTP 500: error de servidor
 * @todo Verificar cambio de email
 * @todo agregar validacion de campos, no debe permitir role
 */
export async function editProfile(req, res) {
  try {
    const userId = req.user.id;
    const { body } = req;

    const updatedUser = await updateUser(userId, body);

    return handleSuccess(
      res,
      200,
      "Perfil actualizado exitosamente",
      updatedUser,
    );
  } catch (error) {
    if (error.code === "P2025") {
      // En caso de que la cuenta sea eliminada y aún este la sesión iniciada.
      return handleErrorClient(res, 404, "Usuario no encontrado");
    }

    return handleErrorServer(
      res,
      500,
      "Error al actualizar perfil",
      error.message,
    );
  }
}

/**
 * Endpoint para editar un usuario como administrador. A diferencia de editar
 * perfil, esta función permite cambiar roles.
 *
 * @returns HTTP 200: actualización exitosa, HTTP 404: usuario no encontrado,
 *          HTTP 500: error de servidor
 */
export async function editUser(req, res) {
  try {
    const { userId } = req.params;
    const { body } = req;

    const updatedUser = await updateUser(parseInt(userId), body);

    return handleSuccess(
      res,
      200,
      "Usuario actualizado exitosamente",
      updatedUser,
    );
  } catch (error) {
    if (error.code === "P2025") {
      return handleErrorClient(res, 404, "Usuario no encontrado");
    }

    return handleErrorServer(
      res,
      500,
      "Error al editar usuario",
      error.message,
    );
  }
}

export async function removeUser(req, res) {
  try {
    const { userId } = req.params;

    await deleteUser(parseInt(userId));

    return handleSuccess(res, 200, "Usuario eliminado exitosamente");
  } catch (error) {
    if (error.code === "P2025") {
      return handleErrorClient(res, 404, "Usuario no encontrado");
    }

    return handleErrorServer(
      res,
      500,
      "Error al eliminar usuario",
      error.message,
    );
  }
}
