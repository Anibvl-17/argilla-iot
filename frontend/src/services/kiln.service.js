import axios from "./root.service.js";

export async function getAllKilns() {
  try {
    const response = await axios.get("/kiln/all");
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
