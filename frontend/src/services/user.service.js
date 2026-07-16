import axios from "./root.service";

export async function getProfile() {
  try {
    const response = await axios.get("/user/me");
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error("Error al obtener el perfil", error.response?.data);
    return {
      success: false,
      message:
        error.response?.data?.message || "Error al conectar con el servidor",
      data: error.response?.data,
    };
  }
}

export async function changePassword(currentPassword, newPassword) {
  try {
    const response = await axios.patch("/user/me", {
      currentPassword,
      newPassword,
    });
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error("Error al cambiar la contraseña", error.response?.data);
    return {
      success: false,
      message:
        error.response?.data?.message || "Error al conectar con el servidor",
      data: error.response?.data,
    };
  }
}

export async function getAllUsers(params = {}) {
  try {
    const response = await axios.get("/user/all", { params });
    const users = response.data.data;
    return { success: true, data: users };
  } catch (error) {
    console.error(
      "Error en el servicio user -> getAllUsers()",
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

export async function createUser(data) {
  try {
    const response = await axios.post("/user/create", data);
    const user = response.data.data;
    return { success: true, data: user };
  } catch (error) {
    console.error(
      "Error en el servicio user -> createUser()",
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

export async function updateUser(userId, data) {
  try {
    const response = await axios.patch(`/user/${userId}/edit`, data);
    const user = response.data.data;
    return { success: true, data: user };
  } catch (error) {
    console.error(
      "Error en el servicio user -> updateUser()",
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

export async function deleteUser(userId) {
  try {
    await axios.delete(`/user/${userId}/delete`);
    return { success: true };
  } catch (error) {
    console.error(
      "Error en el servicio user -> deleteUser()",
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
