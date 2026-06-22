import { useEffect, useState } from "react";
import Modal from "@components/Modal";
import { createUser, getAllUsers, updateUser } from "@services/user.service";
import { ROLE_LABELS } from "@constants/user.constants";
import { LuPencil, LuTrash2 } from "react-icons/lu";
import { deleteUser } from "../services/user.service";
import AlertDialog from "../components/AlertDialog";
import { toast } from "sonner";
import { Badge } from "../components/Badge";
import { useAuth } from "@context/AuthContext";

const userFields = [
  {
    name: "name",
    label: "Nombre",
    type: "text",
    placeholder: "John Doe",
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    placeholder: "usuario@gmail.com",
  },
  {
    name: "role",
    label: "Rol",
    type: "select",
    options: [
      { value: "USER", label: "Usuario" },
      { value: "ADMIN", label: "Administrador" },
    ],
  },
];

const createUserFields = [
  ...userFields,
  {
    name: "password",
    label: "Contraseña",
    type: "password",
    placeholder: "Mínimo 6 caracteres",
  },
];

const buildModalErrorMessage = (response) => {
  const details = response?.data?.errorDetails;

  if (Array.isArray(details) && details.length > 0) {
    return details[0];
  }

  return response?.message || "No se pudo guardar el usuario.";
};

export default function AdminUsers() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalMode, setModalMode] = useState("create");
  const [selectedUser, setSelectedUser] = useState(null);
  const { user: sessionUser } = useAuth();

  const filteredUsers = users.filter((user) => {
    const searchLowercase = searchTerm.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchLowercase) ||
      ROLE_LABELS[user.role].toLowerCase().includes(searchLowercase) ||
      user.email.toLowerCase().includes(searchLowercase)
    );
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const result = await getAllUsers();
      setUsers(result.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedUser(null);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setModalMode("edit");
    setSelectedUser(user);
    setModalError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalError(null);
    setSelectedUser(null);
  };

  const handleSubmitUser = async (formData) => {
    setLoading(true);
    setModalError(null);

    try {
      const response =
        modalMode === "create"
          ? await createUser(formData)
          : await updateUser(selectedUser.userId, formData);

      if (response.success) {
        closeModal();
        fetchUsers();
        return;
      }

      setModalError(buildModalErrorMessage(response));
    } catch (error) {
      setModalError(
        error.response?.data?.message ||
          error.message ||
          "Ocurrio un error inesperado al conectar con el servidor.",
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      const response = await deleteUser(selectedUser.userId);

      if (response.success) {
        toast.success("Usuario eliminado exitosamente.");
        fetchUsers();
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      toast.error("Error al eliminar usuario", error.message);
    } finally {
      setIsAlertOpen(false);
      setSelectedUser(null);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-white">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-neutral-400 mt-1 text-sm">
            Gestión centralizada de todos los usuarios de la plataforma.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-red-700 hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Añadir Nuevo Usuario
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#141414] border border-neutral-800 p-5 rounded-xl shadow-md">
          <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">
            Total Usuarios
          </p>
          <p className="text-3xl font-bold">{users.length}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[#141414] p-4 border border-neutral-800 rounded-xl">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-neutral-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre, email o rol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-neutral-700 text-sm rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-white placeholder-neutral-500"
          />
        </div>

        <button className="w-full sm:w-auto px-4 py-2.5 bg-[#0a0a0a] border border-neutral-700 rounded-lg text-sm text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors flex items-center justify-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            ></path>
          </svg>
          Filtrar
        </button>
      </div>

      <div className="bg-[#141414] border border-neutral-800 rounded-2xl overflow-x-auto shadow-2xl">
        {!loading && (
          <table className="w-full text-sm text-left min-w-10">
            <thead className="text-xs text-neutral-500 uppercase tracking-wider border-b border-neutral-800 bg-[#0a0a0a]">
              <tr>
                <th scope="col" className="px-6 py-4 font-medium">
                  ID
                </th>
                <th scope="col" className="px-6 py-4 font-medium">
                  Email
                </th>
                <th scope="col" className="px-6 py-4 font-medium">
                  Nombre
                </th>
                <th scope="col" className="px-6 py-4 font-medium text-center">
                  Rol
                </th>
                <th scope="col" className="px-6 py-4 font-medium text-center">
                  Fecha de registro
                </th>
                <th scope="col" className="px-6 py-4 font-medium text-center">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-800/60">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr
                    key={user.userId}
                    className="hover:bg-neutral-900/30 transition-colors"
                  >
                    {/* ID */}
                    <td className="px-6 py-5 font-mono text-neutral-400">
                      {user.userId}
                    </td>

                    {/* Email */}
                    <td className="px-6 py-5 font-mono text-neutral-400">
                      {user.email}
                    </td>

                    {/* Nombre */}
                    <td className="px-6 py-5 font-mono text-neutral-400">
                      {user.name}
                    </td>

                    {/* Rol */}
                    <td className="px-6 py-5">
                      <span className="flex items-center justify-center">
                        <Badge style="default" text={ROLE_LABELS[user.role]} />
                      </span>
                    </td>

                    {/* Fecha creación */}
                    <td className="px-6 py-5 text-center text-neutral-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>

                    {/* Botones de acción */}
                    <td className="px-6 py-5 text-center text-lg">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors hover:cursor-pointer"
                          title="Editar datos"
                        >
                          <LuPencil />
                        </button>
                        {sessionUser.id !== user.userId && (
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setIsAlertOpen(true);
                            }}
                            className="p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-400/10 transition-colors hover:cursor-pointer"
                            title="Eliminar usuario"
                          >
                            <LuTrash2 />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-neutral-500"
                  >
                    No se encontraron usuarios que coincidan con "{searchTerm}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={
          modalMode === "create" ? "Crear Nuevo Usuario" : "Editar Usuario"
        }
        fields={modalMode === "create" ? createUserFields : userFields}
        initialData={selectedUser}
        submitLabel={
          modalMode === "create" ? "Crear Usuario" : "Guardar Cambios"
        }
        onSubmit={handleSubmitUser}
        error={modalError}
        loading={loading}
        onClearError={() => setModalError(null)}
      />

      <AlertDialog
        isOpen={isAlertOpen}
        onClose={() => {
          setIsAlertOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={confirmDelete}
        title="¿Eliminar usuario?"
        CustomMessage={() => (
          <p className="text-neutral-400">
            El usuario{" "}
            <span className="font-bold">
              {selectedUser?.userId} - "{selectedUser?.name}"
            </span>{" "}
            será eliminado permanentemente
          </p>
        )}
        type="danger"
        confirmText="Eliminar usuario"
        cancelText="Cancelar"
        isLoading={loading}
      />
    </div>
  );
}
