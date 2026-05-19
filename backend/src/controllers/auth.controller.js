import {
  handleErrorClient,
  handleErrorServer,
  handleSuccess,
} from "../handlers/response.handler.js";
import { login } from "../services/auth.service.js";
import { createUser } from "../services/user.service.js";

export async function loginUser(req, res) {
  try {
    const { body } = req;

    // TODO: Validar datos

    const data = await login(body.email, body.password);
    handleSuccess(res, 200, "Inicio de sesión exitoso", data);
  } catch (error) {
    handleErrorClient(res, 401, "Error al iniciar sesión", error.message);
  }
}

export async function registerUser(req, res) {
  try {
    const { body } = req;

    // TODO: Validar datos

    const newUser = await createUser(body);
    delete newUser.password;
    handleSuccess(res, 201, "Usuario registrado exitosamente", newUser);
  } catch (error) {
    if (error.code === "23505") {
      handleErrorClient(res, 409, "El correo electrónico ya está registrado");
    } else {
      handleErrorServer(res, 500, "Error interno del servidor", error.message);
    }
  }
}

export async function logout(req, res) {
  try {
    res.clearCookie("jwt", { httpOnly: true });
    handleSuccess(res, 200, "Sesión cerrada exitosamente");
  } catch (error) {
    handleErrorServer(res, 500, "Error al cerrar sesión", error.message);
  }
}