import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { FRONTEND_URL, JWT_SECRET } from "../config/configEnv.js";
import { ROLES } from "../constants/user.constants.js";
import { getAdminSummary } from "../services/admin.service.js";

let io;

export function initializeRealtime(server) {
  io = new Server(server, {
    cors: { origin: FRONTEND_URL, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const user = jwt.verify(token, JWT_SECRET);
      socket.user = user;
      next();
    } catch {
      next(new Error("No autorizado"));
    }
  });

  io.on("connection", async (socket) => {
    socket.join(`user:${socket.user.id}`);

    if (socket.user.role === ROLES.ADMIN) {
      socket.join("admins");
      try {
        socket.emit("admin:summary", await getAdminSummary());
      } catch (error) {
        console.error("[Socket] Error enviando resumen:", error.message);
      }
    }
  });

  return io;
}

export function emitControllerTelemetry(userId, telemetry) {
  if (!io) return;
  if (userId) {
    io.to(`user:${userId}`).emit("controller:telemetry", telemetry);
  }
}

export async function emitAdminSummary() {
  if (!io) return;

  try {
    io.to("admins").emit("admin:summary", await getAdminSummary());
  } catch (error) {
    console.error("[Socket] Error actualizando resumen:", error.message);
  }
}
