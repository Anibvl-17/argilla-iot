import axios from "./root.service.js";

export async function getAllControllers() {
  try {
    const response = await axios.get("/controller/all");
    const controllers = response.data.data;
    return { success: true, data: controllers};
  } catch (error) {
    console.error(
      "Error en el servicio controller -> getAllControllers()",
      error.response?.data,
    );
    return {
      success: false,
      message:
        error.response?.data.message || "Error al conectar con el servidor",
      data: error.response?.data,
    };
  }
}

export async function createController(data) {
  try {
    const response = await axios.post("/controller/create", data);
    const controller = response.data.data;
    return { success: true, data: controller };
  } catch (error) {
    console.error(
      "Error en el servicio controller -> createController()",
      error.response?.data,
    );
    return {
      success: false,
      message:
        error.response?.data.message || "Error al conectar con el servidor",
      data: error.response?.data,
    };
  }
}

export async function updateController(controllerId, data) {
  try {
    const response = await axios.patch(`/controller/${controllerId}/edit`, data);
    const controller = response.data.data;
    return { success: true, data: controller };
  } catch (error) {
    console.error(
      "Error en el servicio controller -> updateController()",
      error.response?.data,
    );
    return {
      success: false,
      message:
        error.response?.data.message || "Error al conectar con el servidor",
      data: error.response?.data,
    };
  }
}

export async function deleteController(controllerId) {
  try {
    await axios.delete(`/controller/${controllerId}/delete`);
    return { success: true };
  } catch (error) {
    console.error(
      "Error en el servicio controller -> deleteController()",
      error.response?.data,
    );
    return {
      success: false,
      message:
        error.response?.data.message || "Error al conectar con el servidor",
      data: error.response?.data,
    };
  }
}
