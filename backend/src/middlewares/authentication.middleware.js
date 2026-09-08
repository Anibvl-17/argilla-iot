"use strict";

import jwt from "jsonwebtoken";
import { handleErrorClient } from "../handlers/response.handler.js";
import { JWT_SECRET } from "../config/configEnv.js";
import { prisma } from "../config/prisma.js";

export async function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return handleErrorClient(res, 401, "Token no proporcionado");
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { userId: decoded.id },
      select: { userId: true, name: true, email: true, role: true, isActive: true, anonymizedAt: true },
    });
    if (!user || !user.isActive || user.anonymizedAt) {
      return handleErrorClient(res, 403, "La cuenta está desactivada");
    }
    req.user = { id: user.userId, name: user.name, email: user.email, role: user.role };
    next();
  } catch (error) {
    return handleErrorClient(res, 403, "Token inválido o expirado");
  }
}
