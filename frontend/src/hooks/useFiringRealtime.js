import { useEffect } from "react";
import { createAuthenticatedSocket } from "@services/socket.service";

export function useFiringRealtime(onUpdate) {
  useEffect(() => {
    const socket = createAuthenticatedSocket();
    if (!socket) return undefined;
    socket.on("firing-cycle:update", onUpdate);
    return () => {
      socket.off("firing-cycle:update", onUpdate);
      socket.disconnect();
    };
  }, [onUpdate]);
}
