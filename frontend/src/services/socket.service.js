import cookies from "js-cookie";
import { io } from "socket.io-client";

function getSocketUrl() {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  return new URL(
    import.meta.env.VITE_BASE_URL || "/api",
    window.location.origin,
  ).origin;
}

export function createAuthenticatedSocket() {
  const token = cookies.get("jwt-auth");
  if (!token) return null;

  return io(getSocketUrl(), {
    auth: { token },
    transports: ["websocket", "polling"],
  });
}
