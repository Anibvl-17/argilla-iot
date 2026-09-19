import { useEffect } from "react";
import { createAuthenticatedSocket } from "@services/socket.service";

export function useControllerRealtime(onTelemetry) {
  useEffect(() => {
    const socket = createAuthenticatedSocket();
    if (!socket) return undefined;

    socket.on("controller:telemetry", onTelemetry);

    return () => {
      socket.off("controller:telemetry", onTelemetry);
      socket.disconnect();
    };
  }, [onTelemetry]);
}
