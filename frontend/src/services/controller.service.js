import axios from "./root.service.js";

export async function getAllControllers() {
  try {
    const response = await axios.get("/controller/all");
    const controllers = response.data.data;
    return { success: true, data: controllers };
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
    const response = await axios.patch(
      `/controller/${controllerId}/edit`,
      data,
    );
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

export async function linkUserToController(controllerId, userId, pin) {
  try {
    const response = await axios.patch(`/controller/claim`, {
      partialControllerId: controllerId,
      userId,
      pin,
    });
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error(
      "Error en el servicio controller -> linkUserToController()",
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

export async function unlinkUserFromController(controllerId, userId) {
  try {
    await axios.patch(`/controller/${controllerId}/release`, { userId });
    return { success: true };
  } catch (error) {
    console.error(
      "Error en el servicio controller -> unlinkUserToController()",
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

export async function generateControllerPin(controllerId) {
  try {
    const response = await axios.patch(`/controller/${controllerId}/pin`);
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error(
      "Error en el servicio controller -> generateControllerPin()",
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
