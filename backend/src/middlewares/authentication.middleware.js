"use strict";

import jwt from "jsonwebtoken";
import { handleErrorClient } from "../handlers/response.handler.js";
import { JWT_SECRET } from "../config/configEnv.js";

export function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return handleErrorClient(res, 401, "Token no proporcionado");
  }

  const token = authHeader.split(" ")[1];

  try {  
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return handleErrorClient(res, 403, "Token inválido o expirado");
  }
}
