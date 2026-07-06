import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { FRONTEND_URL, JWT_SECRET } from "../config/configEnv.js";

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

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);
  });

  return io;
}

export function emitControllerTelemetry(userId, telemetry) {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit("controller:telemetry", telemetry);
}
