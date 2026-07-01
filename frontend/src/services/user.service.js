import axios from "./root.service";

export async function getAllUsers() {
  try {
    const response = await axios.get("/user/all");
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
        error.response?.data.message || "Error al conectar con el servidor",
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
        error.response?.data.message || "Error al conectar con el servidor",
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
        error.response?.data.message || "Error al conectar con el servidor",
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
        error.response?.data.message || "Error al conectar con el servidor",
      data: error.response?.data,
    };
  }
}
