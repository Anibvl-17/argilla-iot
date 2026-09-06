import axios from "axios";
import cookies from "js-cookie";

const API_URL = import.meta.env.VITE_BASE_URL;

const instance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

instance.interceptors.request.use(
  (config) => {
    const token = cookies.get("jwt-auth", { path: "/" });

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

instance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || "";
    const authenticationFailure =
      status === 401 ||
      (status === 403 && /token|cuenta está desactivada/i.test(message));
    if (error.response && authenticationFailure) {
      const isLoginRequest = error.config.url.includes("/login");

      if (!isLoginRequest) {
        console.warn("Sesión expirada. Redirigiendo a inicio de sesión...");
        cookies.remove("jwt-auth");
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  },
);

export default instance;
