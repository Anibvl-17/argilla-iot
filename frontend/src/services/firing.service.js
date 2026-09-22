import axios from "./root.service.js";

function resultError(error, fallback) {
  return {
    success: false,
    message: error.response?.data?.message || fallback,
    data: error.response?.data,
  };
}

export async function getPrograms() {
  try {
    const response = await axios.get("/firing/programs");
    return { success: true, data: response.data.data };
  } catch (error) {
    return resultError(error, "No fue posible cargar los programas");
  }
}

export async function getFiringContext(kilnId) {
  try {
    const response = await axios.get(`/firing/kilns/${kilnId}`);
    return { success: true, data: response.data.data };
  } catch (error) {
    return resultError(error, "No fue posible cargar el estado de quema");
  }
}

export async function selectFiringProgram(kilnId, programId) {
  try {
    const response = await axios.patch(`/firing/kilns/${kilnId}/selection`, {
      programId: Number(programId),
    });
    return { success: true, data: response.data.data };
  } catch (error) {
    return resultError(error, "No fue posible seleccionar el programa");
  }
}

export async function startProgram(kilnId) {
  try {
    const response = await axios.post(`/firing/kilns/${kilnId}/cycles/program`, {
      commandId: crypto.randomUUID(),
    });
    return { success: true, data: response.data.data };
  } catch (error) {
    return resultError(error, "No fue posible confirmar el inicio");
  }
}

export async function commandFiringCycle(kilnId, firingCycleId, command) {
  try {
    const response = await axios.post(
      `/firing/kilns/${kilnId}/cycles/${firingCycleId}/command`,
      { commandId: crypto.randomUUID(), command },
    );
    return { success: true, data: response.data.data };
  } catch (error) {
    return resultError(error, "No fue posible confirmar el comando");
  }
}

export async function getFiringCycles(kilnId, page = 1, pageSize = 10) {
  try {
    const response = await axios.get(`/firing/kilns/${kilnId}/cycles`, {
      params: { page, pageSize },
    });
    return { success: true, data: response.data.data };
  } catch (error) {
    return resultError(error, "No fue posible cargar los ciclos");
  }
}

export async function getCycleTelemetry(
  kilnId,
  firingCycleId,
  page = 1,
  pageSize = 20,
) {
  try {
    const response = await axios.get(
      `/firing/kilns/${kilnId}/cycles/${firingCycleId}/telemetry`,
      { params: { page, pageSize } },
    );
    return { success: true, data: response.data.data };
  } catch (error) {
    return resultError(error, "No fue posible cargar la telemetría del ciclo");
  }
}
