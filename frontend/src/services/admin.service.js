import axios from "./root.service.js";

export async function getAdminSummary() {
  try {
    const response = await axios.get("/admin/summary");
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error("Error al obtener el resumen administrativo", error.response?.data);
    return {
      success: false,
      message:
        error.response?.data?.message || "Error al conectar con el servidor",
    };
  }
}
