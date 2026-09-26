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

export async function getAdminKilnCycles(kilnId, page = 1, pageSize = 10) {
  try {
    const response = await axios.get(`/kiln/admin/${kilnId}/cycles`, {
      params: { page, pageSize },
    });
    return { success: true, data: response.data.data };
  } catch (error) {
    return serviceError(error, "No fue posible cargar los ciclos");
  }
}

export async function getAdminKilnCycleTelemetry(
  kilnId,
  firingCycleId,
  page = 1,
  pageSize = 20,
) {
  try {
    const response = await axios.get(
      `/kiln/admin/${kilnId}/cycles/${firingCycleId}/telemetry`,
      { params: { page, pageSize } },
    );
    return { success: true, data: response.data.data };
  } catch (error) {
    return serviceError(error, "No fue posible cargar la telemetría del ciclo");
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
        error.response?.data?.message || "Error al conectar con el servidor",
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
        error.response?.data?.message || "Error al conectar con el servidor",
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
        error.response?.data?.message || "Error al conectar con el servidor",
      data: error.response?.data,
    };
  }
}

export async function updateKilnOperationalStatus(kilnId, operationalStatus) {
  try {
    const response = await axios.patch(`/kiln/${kilnId}/operational-status`, {
      operationalStatus,
    });
    return { success: true, data: response.data.data };
  } catch (error) {
    return serviceError(error, "No fue posible actualizar el estado del horno");
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
        error.response?.data?.message || "Error al conectar con el servidor",
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
        error.response?.data?.message || "Error al conectar con el servidor",
      data: error.response?.data,
    };
  }
}

export async function unlinkUser(kilnId) {
  try {
    const response = await axios.patch(`/kiln/${kilnId}/release`);
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error(
      "Error en el servicio kiln -> unlinkUser()",
      error.response?.data,
    );
    return {
      success: false,
      message:
        error.response?.data?.message || "Error al conectar con el servidor",
      data: error.response?.data,
    };
  }
}

export async function linkController(kilnId, controllerId) {
  try {
    const response = await axios.post(`/kiln/${kilnId}/link`, {
      controllerId,
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
        error.response?.data?.message || "Error al conectar con el servidor",
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
        error.response?.data?.message || "Error al conectar con el servidor",
      data: error.response?.data,
    };
  }
}
