import { useCallback, useEffect, useState } from "react";
import Modal from "@components/Modal";
import Pagination from "@components/Pagination";
import { createUser, getAllUsers, updateUser } from "@services/user.service";
import { ROLE_LABELS } from "@constants/user.constants";
import { LuPencil, LuTrash2 } from "react-icons/lu";
import { deleteUser } from "../services/user.service";
import AlertDialog from "../components/AlertDialog";
import { toast } from "sonner";
import { Badge } from "../components/Badge";
import { useAuth } from "@context/AuthContext";
import { normalizeFormError } from "../utils/formError";
import { getPageAfterDeletion } from "../utils/pagination";

const PAGE_SIZE = 10;

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

export default function AdminUsers() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalMode, setModalMode] = useState("create");
  const [selectedUser, setSelectedUser] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const { user: sessionUser } = useAuth();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getAllUsers({
        page,
        pageSize: PAGE_SIZE,
        search: searchTerm,
      });
      const payload = result.data || {};
      setUsers(payload.items || []);
      setTotalPages(payload.pagination?.totalPages || 1);
      setTotalUsers(payload.summary?.total || 0);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, [fetchUsers]);

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

      setModalError(normalizeFormError(response));
    } catch (error) {
      setModalError(normalizeFormError(error));
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      const response = await deleteUser(selectedUser.userId);

      if (response.success) {
        const nextPage = getPageAfterDeletion({
          page,
          itemsOnPage: users.length,
        });
        toast.success("Usuario eliminado exitosamente.");
        if (nextPage !== page) {
          setPage(nextPage);
        } else {
          fetchUsers();
        }
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
    <div className="min-w-0 space-y-6 text-white">
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Usuarios
          </h1>
          <p className="text-neutral-300 mt-1 text-sm">
            Gestión centralizada de todos los usuarios de la plataforma.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="w-full rounded-lg bg-red-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 sm:w-auto"
        >
          Añadir Nuevo Usuario
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#141414] border border-neutral-800 p-5 rounded-xl shadow-md">
          <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">
            Total Usuarios
          </p>
          <p className="text-3xl font-bold">{totalUsers}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-[#141414] shadow-2xl">
        <div className="border-b border-neutral-800 p-4">
          <p className="mb-2 text-sm md:text-base text-neutral-400">
            Busca usuarios por nombre, correo electrónico, ID o rol.
          </p>
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
              placeholder="Juan, matias@argilla.cl, usuario..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#0a0a0a] border border-neutral-700 text-sm rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-white placeholder-neutral-500"
            />
          </div>
        </div>
        <div className="overflow-auto">
          {!loading && (
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="sticky top-0 z-10 border-b border-neutral-800 bg-[#0a0a0a] text-xs font-bold uppercase tracking-wider text-neutral-500">
                <tr>
                  <th
                    scope="col"
                    className="hidden px-3 py-3 sm:table-cell sm:px-6 sm:py-4"
                  >
                    ID
                  </th>
                  <th scope="col" className="px-3 py-3 sm:px-6 sm:py-4">
                    Email
                  </th>
                  <th scope="col" className="px-3 py-3 sm:px-6 sm:py-4">
                    Nombre
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-center sm:px-6 sm:py-4"
                  >
                    Rol
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3 text-center md:table-cell sm:px-6 sm:py-4"
                  >
                    Fecha de registro
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-center sm:px-6 sm:py-4"
                  >
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-800/60">
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr
                      key={user.userId}
                      className="hover:bg-neutral-900/30 transition-colors"
                    >
                      {/* ID */}
                      <td className="hidden px-3 py-4 font-mono text-neutral-200 sm:table-cell sm:px-6 sm:py-5 sm:text-base">
                        {user.userId}
                      </td>

                      {/* Email */}
                      <td className="max-w-36 break-all px-3 py-4 text-neutral-300 sm:max-w-none sm:px-6 sm:py-5">
                        {user.email}
                      </td>

                      {/* Nombre */}
                      <td className="max-w-28 wrap-break-word px-3 py-4 text-neutral-300 sm:max-w-none sm:px-6 sm:py-5">
                        {user.name}
                      </td>

                      {/* Rol */}
                      <td className="px-3 py-4 sm:px-6 sm:py-5">
                        <span className="flex items-center justify-center">
                          <Badge
                            style="default"
                            text={ROLE_LABELS[user.role]}
                          />
                        </span>
                      </td>

                      {/* Fecha creación */}
                      <td className="hidden px-3 py-4 text-center text-neutral-300 md:table-cell sm:px-6 sm:py-5">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>

                      {/* Botones de acción */}
                      <td className="px-2 py-4 text-center text-base sm:px-6 sm:py-5 sm:text-lg">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors hover:cursor-pointer"
                            title="Editar datos"
                          >
                            <LuPencil />
                          </button>
                          {sessionUser.userId !== user.userId && (
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
                      No se encontraron usuarios que coincidan con "{searchTerm}
                      ".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
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
        onClearError={setModalError}
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
          <p className="text-neutral-300">
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
