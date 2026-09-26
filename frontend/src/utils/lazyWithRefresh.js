import { lazy } from "react";

const REFRESH_KEY_PREFIX = "argilla:chunk-refresh:";

export async function loadModuleWithRefresh(
  importer,
  moduleKey,
  environment = {
    storage: window.sessionStorage,
    reload: () => window.location.reload(),
  },
) {
  const refreshKey = `${REFRESH_KEY_PREFIX}${moduleKey}`;

  try {
    const module = await importer();
    environment.storage.removeItem(refreshKey);
    return module;
  } catch (error) {
    if (environment.storage.getItem(refreshKey) === "1") {
      environment.storage.removeItem(refreshKey);
      throw error;
    }

    environment.storage.setItem(refreshKey, "1");
    environment.reload();

    // La navegación interrumpe esta carga. Mantenerla pendiente evita que React
    // Router renderice su límite de error durante la recarga del documento.
    return new Promise(() => {});
  }
}

export function lazyWithRefresh(importer, moduleKey) {
  return lazy(() => loadModuleWithRefresh(importer, moduleKey));
}
