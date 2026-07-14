import axios from "./root.service.js";

function serviceError(error, fallback) {
  return {
    success: false,
    message: error.response?.data?.message || fallback,
    data: error.response?.data,
  };
}

export async function getMyKilns() {
  try {
    const response = await axios.get("/kiln/my-kilns");
    return { success: true, data: response.data.data };
  } catch (error) {
    return serviceError(error, "No fue posible cargar tus equipos");
  }
}

export async function getMyKiln(kilnId) {
  try {
    const response = await axios.get(`/kiln/my-kilns/${kilnId}`);
    return { success: true, data: response.data.data };
  } catch (error) {
    return serviceError(error, "No fue posible cargar el horno");
  }
}

export async function getMyKilnTelemetry(kilnId, page = 1, pageSize = 10) {
  try {
    const response = await axios.get(`/kiln/my-kilns/${kilnId}/telemetry`, {
      params: { page, pageSize },
    });
    return { success: true, data: response.data.data };
  } catch (error) {
    return serviceError(error, "No fue posible cargar la telemetría");
  }
}

export async function getAdminKiln(kilnId) {
  try {
    const response = await axios.get(`/kiln/admin/${kilnId}`);
    return { success: true, data: response.data.data };
  } catch (error) {
    return serviceError(error, "No fue posible cargar el horno");
  }
}

export async function getAdminKilnTelemetry(kilnId, page = 1, pageSize = 10) {
  try {
    const response = await axios.get(`/kiln/admin/${kilnId}/telemetry`, {
      params: { page, pageSize },
    });
    return { success: true, data: response.data.data };
  } catch (error) {
    return serviceError(error, "No fue posible cargar la telemetría");
  }
}

export async function renameMyKiln(kilnId, name) {
  try {
    const response = await axios.patch(`/kiln/my-kilns/${kilnId}/name`, {
      name,
    });
    return { success: true, data: response.data.data };
  } catch (error) {
    return serviceError(error, "No fue posible actualizar el nombre");
  }
}

export async function sendMyKilnControllerCommand(kilnId, command) {
  try {
    const response = await axios.post(
      `/kiln/my-kilns/${kilnId}/controller/command`,
      { command },
    );
    return { success: true, data: response.data.data };
  } catch (error) {
    return serviceError(error, "No fue posible enviar el comando");
  }
}

export async function getAllKilns(params = {}) {
  try {
    const response = await axios.get("/kiln/all", { params });
    const kilns = response.data.data;
    return { success: true, data: kilns };
  } catch (error) {
    console.error(
      "Error en el servicio kiln -> getAllKilns()",
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

export async function createKiln(data) {
  try {
    const response = await axios.post("/kiln/create", data);
    const createdKiln = response.data.data;
    return { success: true, data: createdKiln };
  } catch (error) {
    console.error(
      "Error en el servicio kiln -> createKiln()",
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

export async function updateKiln(kilnId, data) {
  try {
    const response = await axios.patch(`/kiln/${kilnId}/edit`, data);
    const updatedKiln = response.data.data;
    return { success: true, data: updatedKiln };
  } catch (error) {
    console.error(
      "Error en el servicio kiln -> updateKiln()",
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

export async function deleteKiln(kilnId) {
  try {
    await axios.delete(`/kiln/${kilnId}/delete`);
    return { success: true };
  } catch (error) {
    console.error(
      "Error en el servicio kiln -> deleteKiln()",
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

export async function linkUser(kilnId, userId) {
  try {
    const response = await axios.patch(`/kiln/${kilnId}/claim`, { userId });
    const claimedKiln = response.data.data;
    return { success: true, data: claimedKiln };
  } catch (error) {
    console.error(
      "Error en el servicio kiln -> linkUser()",
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

export async function unlinkUser(kilnId, userId) {
  try {
    const response = await axios.patch(`/kiln/${kilnId}/release`, { userId });
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error(
      "Error en el servicio kiln -> unlinkUser()",
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

export async function linkController(kilnId, partialControllerId, pin) {
  try {
    const response = await axios.post(`/kiln/${kilnId}/link`, {
      partialControllerId,
      pin: Number(pin),
    });

    return { success: true, data: response.data.data };
  } catch (error) {
    console.error(
      "Error en el servicio kiln -> linkController()",
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

export async function unlinkController(kilnId) {
  try {
    const response = await axios.post(`/kiln/${kilnId}/unlink`);
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error(
      "Error en el servicio kiln -> unlinkController()",
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
