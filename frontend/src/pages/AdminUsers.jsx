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
    <div className="min-w-0 space-y-6 text-content">
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Usuarios
          </h1>
          <p className="text-secondary mt-1 text-sm">
            Gestión centralizada de todos los usuarios de la plataforma.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="w-full rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-on-action transition-colors hover:bg-primary-hover sm:w-auto"
        >
          Añadir Nuevo Usuario
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border p-5 rounded-xl shadow-card">
          <p className="text-xs text-muted font-bold uppercase tracking-wider mb-1">
            Total Usuarios
          </p>
          <p className="text-3xl font-bold">{totalUsers}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-panel">
        <div className="border-b border-border p-4">
          <p className="mb-2 text-sm md:text-base text-muted">
            Busca usuarios por nombre, correo electrónico, ID o rol.
          </p>
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-muted"
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
              className="w-full bg-field border border-control-border text-sm rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-focus focus:ring-1 focus:ring-focus transition-all text-content placeholder:text-muted"
            />
          </div>
        </div>
        <div className="overflow-auto">
          {!loading && (
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="sticky top-0 z-10 border-b border-border bg-surface-muted text-xs font-bold uppercase tracking-wider text-muted">
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

              <tbody className="divide-y divide-border">
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr
                      key={user.userId}
                      className="hover:bg-surface-hover transition-colors"
                    >
                      {/* ID */}
                      <td className="hidden px-3 py-4 font-mono text-content sm:table-cell sm:px-6 sm:py-5 sm:text-base">
                        {user.userId}
                      </td>

                      {/* Email */}
                      <td className="max-w-36 break-all px-3 py-4 text-secondary sm:max-w-none sm:px-6 sm:py-5">
                        {user.email}
                      </td>

                      {/* Nombre */}
                      <td className="max-w-28 wrap-break-word px-3 py-4 text-secondary sm:max-w-none sm:px-6 sm:py-5">
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
                      <td className="hidden px-3 py-4 text-center text-secondary md:table-cell sm:px-6 sm:py-5">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>

                      {/* Botones de acción */}
                      <td className="px-2 py-4 text-center text-base sm:px-6 sm:py-5 sm:text-lg">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 rounded-lg text-muted hover:text-content hover:bg-surface-hover transition-colors hover:cursor-pointer"
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
                              className="p-2 rounded-lg text-muted hover:text-accent hover:bg-danger-soft transition-colors hover:cursor-pointer"
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
                      className="px-6 py-12 text-center text-muted"
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
          <p className="text-secondary">
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
