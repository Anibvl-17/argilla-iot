import { useCallback, useEffect, useState } from "react";
import { getUserContactCatalog } from "@services/catalog.service";

export default function useUserContactCatalog() {
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    getUserContactCatalog()
      .then((data) => {
        if (active) setCatalog(data);
      })
      .catch((requestError) => {
        if (!active) return;
        setCatalog(null);
        setError(
          requestError.response?.data?.message ||
            "No se pudo cargar el catálogo de países, regiones y comunas.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setLoading(true);
    setError("");
    setAttempt((current) => current + 1);
  }, []);

  return { catalog, loading, error, retry };
}
