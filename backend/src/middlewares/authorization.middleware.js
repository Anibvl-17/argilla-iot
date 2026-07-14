"use strict";

import jwt from "jsonwebtoken";
import {
  handleErrorClient,
  handleErrorServer,
} from "../handlers/response.handler.js";
import { JWT_SECRET } from "../config/configEnv.js";
import { ROLE_NAMES } from "../constants/user.constants.js";

/**
 * Middleware que controla el acceso basado en roles.
 * @param {string[]} roles Arreglo de roles permitidos
 * @returns HTTP 401: token invalido, HTTP 403: acceso denegado,
 *          HTTP 500: error de servidor
 */
export function verifyRoles(roles) {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user || !user.role) {
        return handleErrorClient(
          res,
          401,
          "Usuario no autenticado o token invalido",
        );
      }

      if (!roles.includes(user.role)) {
        const validRoles = roles.map((role) => ROLE_NAMES[role] || role).join(", ");
        return handleErrorClient(
          res,
          403,
          `Acceso denegado, se necesitan privilegios de: ${validRoles}`,
        );
      }

      next();
    } catch (error) {
      return handleErrorServer(
        res,
        500,
        "Error al verificar roles",
        error.message,
      );
    }
  };
}
