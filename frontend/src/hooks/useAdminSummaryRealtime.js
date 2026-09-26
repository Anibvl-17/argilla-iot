import { useEffect } from "react";
import { createAuthenticatedSocket } from "@services/socket.service";

export function useAdminSummaryRealtime(onSummary) {
  useEffect(() => {
    const socket = createAuthenticatedSocket();
    if (!socket) return undefined;

    socket.on("admin:summary", onSummary);

    return () => {
      socket.off("admin:summary", onSummary);
      socket.disconnect();
    };
  }, [onSummary]);
}
