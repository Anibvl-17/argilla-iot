import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { FRONTEND_URL, JWT_SECRET } from "../config/configEnv.js";
import { ROLES } from "../constants/user.constants.js";
import { getAdminSummary } from "../services/admin.service.js";
import { prisma } from "../config/prisma.js";

let io;

export function initializeRealtime(server) {
  io = new Server(server, {
    cors: { origin: FRONTEND_URL, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { userId: decoded.id },
        select: {
          userId: true,
          role: true,
          isActive: true,
          anonymizedAt: true,
        },
      });
      if (!user || !user.isActive || user.anonymizedAt) {
        return next(new Error("No autorizado"));
      }
      socket.user = { id: user.userId, role: user.role };
      next();
    } catch {
      next(new Error("No autorizado"));
    }
  });

  io.on("connection", async (socket) => {
    socket.join(`session:${socket.user.id}`);

    if (socket.user.role === ROLES.CLIENT) {
      socket.join(`user:${socket.user.id}`);
    }

    if (socket.user.role === ROLES.ADMIN) {
      socket.join("admins");
      try {
        socket.emit("admin:summary", await getAdminSummary());
      } catch (error) {
        console.error("[SOCKET] Error enviando resumen:", error.message);
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
  io.to("admins").emit("controller:telemetry", telemetry);
}

export function emitFiringCycle(userId, event) {
  if (!io) return;
  if (userId) io.to(`user:${userId}`).emit("firing-cycle:update", event);
  io.to("admins").emit("firing-cycle:update", event);
}

export async function emitAdminSummary() {
  if (!io) return;

  try {
    io.to("admins").emit("admin:summary", await getAdminSummary());
  } catch (error) {
    console.error("[SOCKET] Error actualizando resumen:", error.message);
  }
}

export function disconnectUserSockets(userId) {
  if (!io) return;
  io.in(`session:${userId}`).disconnectSockets(true);
}
