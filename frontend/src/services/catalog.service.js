import axios from "./root.service.js";

let userContactCatalogPromise = null;

export function getUserContactCatalog() {
  if (!userContactCatalogPromise) {
    userContactCatalogPromise = axios
      .get("/catalog/user-contact")
      .then((response) => response.data.data)
      .catch((error) => {
        userContactCatalogPromise = null;
        throw error;
      });
  }

  return userContactCatalogPromise;
}

