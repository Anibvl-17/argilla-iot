import { useEffect } from "react";
import cookies from "js-cookie";
import { io } from "socket.io-client";

function getSocketUrl() {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  return new URL(import.meta.env.VITE_BASE_URL).origin;
}

export function useAdminSummaryRealtime(onSummary) {
  useEffect(() => {
    const token = cookies.get("jwt-auth");
    if (!token) return undefined;

    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("admin:summary", onSummary);

    return () => {
      socket.off("admin:summary", onSummary);
      socket.disconnect();
    };
  }, [onSummary]);
}
