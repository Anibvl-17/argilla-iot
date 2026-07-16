import {
  handleErrorClient,
  handleErrorServer,
  handleSuccess,
} from "../handlers/response.handler.js";
import {
  changeUserPassword,
  createUser,
  deleteUser,
  getUserProfile,
  updateUser,
  getUsersPage,
} from "../services/user.service.js";
import { emitAdminSummary } from "../realtime/socket.js";

export async function addUser(req, res) {
  try {
    const { body } = req;

    const newUser = await createUser(body);
    void emitAdminSummary();

    return handleSuccess(res, 201, "Usuario creado exitosamente", newUser);
  } catch (error) {
    if (error.code === "P2002") {
      return handleErrorClient(
        res,
        409,
        "Ya existe un usuario con ese email",
        null,
        "email",
      );
    }

    return handleErrorServer(res, 500, "Error al crear usuario", error.message);
  }
}

/**
 * Cambia la contraseña del usuario autenticado después de verificar la actual.
 *
 * @returns HTTP 200: actualización exitosa; HTTP 400: contraseña incorrecta
 */
export async function editProfile(req, res) {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const updatedUser = await changeUserPassword(
      userId,
      currentPassword,
      newPassword,
    );

    return handleSuccess(
      res,
      200,
      "Perfil actualizado exitosamente",
      updatedUser,
    );
  } catch (error) {
    if (error.code === "INVALID_CURRENT_PASSWORD") {
      return handleErrorClient(
        res,
        400,
        error.message,
        null,
        "currentPassword",
      );
    }

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

export async function getProfile(req, res) {
  try {
    const profile = await getUserProfile(req.user.id);

    if (!profile) {
      return handleErrorClient(res, 404, "Usuario no encontrado");
    }

    return handleSuccess(res, 200, "Perfil obtenido exitosamente", profile);
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al obtener el perfil",
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
    if (error.code === "P2002") {
      return handleErrorClient(
        res,
        409,
        "Ya existe un usuario con ese email",
        null,
        "email",
      );
    }

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
    const currentUserId = req.user.id;

    if (currentUserId === parseInt(userId)) {
      return handleErrorClient(
        res,
        403,
        "No puedes eliminar tu propio usuario.",
      );
    }

    await deleteUser(parseInt(userId));
    void emitAdminSummary();

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

export async function getAllUsers(req, res) {
  try {
    const users = await getUsersPage(req.query);

    // Implementado solo en caso excepcional. En la práctica no debería ocurrir
    // Siempre existe al menos admin en base de datos
    return handleSuccess(res, 200, "Usuarios obtenidos exitosamente", users);
  } catch (error) {
    return handleErrorServer(
      res,
      500,
      "Error al obtener todos los usuarios",
      error.message,
    );
  }
}
