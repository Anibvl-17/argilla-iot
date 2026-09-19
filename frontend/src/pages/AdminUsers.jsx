import { Fragment, useCallback, useEffect, useState } from "react";
import {
  LuEye,
  LuEyeOff,
  LuPencil,
  LuTrash2,
  LuUserCheck,
  LuUserRoundPlus,
  LuUserX,
} from "react-icons/lu";
import { toast } from "sonner";
import AlertDialog from "@components/AlertDialog";
import { Badge } from "@components/Badge";
import Modal from "@components/Modal";
import Pagination from "@components/Pagination";
import UserContactFields from "@components/UserContactFields";
import { useAuth } from "@context/AuthContext";
import useUserContactCatalog from "@hooks/useUserContactCatalog";
import {
  getUserStatus,
  ROLE_LABELS,
  ROLE_OPTIONS,
  USER_STATUS_FILTER_OPTIONS,
  USER_STATUS_LABELS,
} from "@constants/user.constants";
import {
  createUser,
  deleteUser,
  getAllUsers,
  updateUser,
  updateUserStatus,
} from "@services/user.service";
import { normalizeFormError } from "../utils/formError";
import {
  formatPhoneDisplay,
  getCommuneName,
  getCountryName,
  getRegionName,
  prepareUserContactPayload,
} from "../utils/userContact";

const PAGE_SIZE = 10;

const userFields = [
  {
    name: "name",
    label: "Nombre",
    type: "text",
    placeholder: "Nombre completo",
  },
  {
    name: "email",
    label: "Correo electrónico",
    type: "email",
    placeholder: "usuario@ejemplo.cl",
  },
  { name: "role", label: "Rol", type: "select", options: ROLE_OPTIONS },
  {
    name: "password",
    label: "Nueva contraseña",
    type: "password",
    placeholder: "Dejar vacío para mantenerla",
    required: false,
    inputProps: { minLength: 6 },
  },
];

const createUserFields = userFields.map((field) =>
  field.name === "password"
    ? {
        ...field,
        label: "Contraseña",
        placeholder: "Mínimo 6 caracteres",
        required: true,
      }
    : field,
);

const statusStyles = {
  ACTIVE: "success",
  INACTIVE: "warning",
  ANONYMIZED: "default",
};

export default function AdminUsers() {
  const { user: sessionUser } = useAuth();
  const isAdmin = sessionUser.role === "ADMIN";
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [modalError, setModalError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const {
    catalog,
    loading: catalogLoading,
    error: catalogError,
    retry: retryCatalog,
  } = useUserContactCatalog();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const result = await getAllUsers({
      page,
      pageSize: PAGE_SIZE,
      search: searchTerm,
      roleFilter: roleFilter || undefined,
      statusFilter: statusFilter || undefined,
    });
    setLoading(false);

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    const payload = result.data || {};
    setUsers(payload.items || []);
    setTotalPages(payload.pagination?.totalPages || 1);
    setTotalUsers(payload.summary?.total || 0);
  }, [page, roleFilter, searchTerm, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 200);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  function openCreateModal() {
    setModalMode("create");
    setSelectedUser(null);
    setModalError(null);
    setIsModalOpen(true);
  }

  function openEditModal(user) {
    setModalMode("edit");
    setSelectedUser({ ...user, phone: user.phone || "", password: "" });
    setModalError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setModalError(null);
    setSelectedUser(null);
  }

  async function handleSubmit(formData) {
    setLoading(true);
    setModalError(null);
    let payload;
    try {
      payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        ...prepareUserContactPayload(formData, catalog),
        ...(formData.password ? { password: formData.password } : {}),
      };
    } catch (error) {
      setLoading(false);
      setModalError(normalizeFormError(error));
      return;
    }
    const result =
      modalMode === "create"
        ? await createUser(payload)
        : await updateUser(selectedUser.userId, payload);
    setLoading(false);

    if (!result.success) {
      setModalError(normalizeFormError(result));
      return;
    }

    toast.success(
      modalMode === "create"
        ? "Usuario creado exitosamente."
        : "Usuario actualizado exitosamente.",
    );
    closeModal();
    await fetchUsers();
  }

  async function toggleActive(user) {
    const result = await updateUserStatus(user.userId, !user.isActive);
    if (!result.success) return toast.error(result.message);
    toast.success(
      result.data.isActive ? "Usuario reactivado." : "Usuario desactivado.",
    );
    await fetchUsers();
  }

  async function confirmAnonymize() {
    setLoading(true);
    const result = await deleteUser(selectedUser.userId);
    setLoading(false);
    setIsAlertOpen(false);

    if (!result.success) return toast.error(result.message);

    toast.success("Usuario anonimizado exitosamente.");
    setSelectedUser(null);
    await fetchUsers();
  }

  function renderAdminActions(user, withLabels = false, includeEdit = true) {
    if (!isAdmin) return null;
    const isSelf = user.userId === sessionUser.id;
    const buttonClass = withLabels
      ? "inline-flex items-center justify-center gap-2 rounded-lg border border-control-border bg-surface px-3 py-2 text-sm text-secondary transition-colors hover:bg-surface-hover"
      : "rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-content";

    return (
      <>
        {includeEdit && (
          <button
            type="button"
            disabled={Boolean(user.anonymizedAt)}
            onClick={() => openEditModal(user)}
            className={`${buttonClass} disabled:opacity-40`}
            title="Editar usuario"
          >
            <LuPencil className="text-base" /> {withLabels && "Editar"}
          </button>
        )}
        <button
          type="button"
          disabled={Boolean(user.anonymizedAt) || isSelf}
          onClick={() => toggleActive(user)}
          className={`${buttonClass} disabled:opacity-40`}
          title={
            isSelf
              ? "No puedes desactivar tu propia cuenta"
              : user.isActive
                ? "Desactivar usuario"
                : "Reactivar usuario"
          }
        >
          {user.isActive ? (
            <LuUserX className="text-base" />
          ) : (
            <LuUserCheck className="text-base" />
          )}{" "}
          {withLabels && (user.isActive ? "Desactivar" : "Reactivar")}
        </button>
        <button
          type="button"
          disabled={Boolean(user.anonymizedAt) || isSelf}
          onClick={() => {
            setSelectedUser(user);
            setIsAlertOpen(true);
          }}
          className={`${buttonClass} disabled:opacity-40`}
          title={
            isSelf
              ? "No puedes anonimizar tu propia cuenta"
              : "Anonimizar usuario"
          }
        >
          <LuTrash2 className="text-base" /> {withLabels && "Anonimizar"}
        </button>
      </>
    );
  }

  return (
    <div className="min-w-0 space-y-6 text-content">
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Usuarios
          </h1>
          <p className="mt-1 text-sm text-secondary">
            {isAdmin
              ? "Gestión centralizada de las cuentas de la plataforma."
              : "Consulta de las cuentas de clientes."}
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-on-action transition-colors hover:bg-primary-hover sm:w-auto"
          >
            <LuUserRoundPlus /> Crear usuario
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-panel">
        <div className="border-b border-border p-4">
          <div className="mb-3 flex items-start justify-between gap-3 sm:items-center">
            <p className="text-sm text-muted md:text-base">
              Busca por nombre, correo electrónico, teléfono o ID.
            </p>
            <span className="hidden sm:block">
              <Badge style="default" text={`${totalUsers} usuarios`} />
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(16rem,1fr)_12rem_12rem]">
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-muted"
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
              <input
                type="search"
                placeholder="Ana, matias@argilla.cl, +569 1234 5678..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-control-border bg-field py-2.5 pl-10 pr-4 text-sm text-content outline-none transition-all placeholder:text-muted focus:border-focus focus:ring-1 focus:ring-focus"
              />
            </div>
            <select
              aria-label="Filtrar por rol"
              disabled={!isAdmin}
              value={isAdmin ? roleFilter : "CLIENT"}
              onChange={(event) => {
                setRoleFilter(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-control-border bg-field px-3 py-2.5 text-sm text-content outline-none focus:border-focus focus:ring-1 focus:ring-focus"
            >
              {isAdmin && <option value="">Todos los roles</option>}
              {ROLE_OPTIONS.filter(
                (option) => isAdmin || option.value === "CLIENT",
              ).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar por estado de cuenta"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-control-border bg-field px-3 py-2.5 text-sm text-content outline-none focus:border-focus focus:ring-1 focus:ring-focus"
            >
              <option value="">Todos los estados</option>
              {USER_STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-surface-muted text-xs font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 sm:px-6 py-4 text-start">ID</th>
                <th className="px-3 py-4 sm:px-6">Usuario</th>
                <th className="hidden px-6 py-4 lg:table-cell">Teléfono</th>
                <th className="hidden px-6 py-4 text-center md:table-cell">
                  Rol
                </th>
                <th className="hidden px-6 py-4 text-center sm:table-cell">
                  Estado
                </th>
                <th className="hidden px-6 py-4 text-center xl:table-cell">
                  Fecha de Registro
                </th>
                {isAdmin && (
                  <th className="px-3 py-4 text-center sm:px-6">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!loading &&
                users.map((user) => {
                  const status = getUserStatus(user);
                  return (
                    <Fragment key={user.userId}>
                      <tr className="transition-colors hover:bg-surface-hover">
                        <td className="px-4 py-5 sm:px-6">
                          <p className="font-mono text-sm text-muted">
                            {user.userId}
                          </p>
                        </td>
                        <td className="max-w-52 px-3 py-5 sm:px-6">
                          <p className="font-medium text-content">
                            {user.name}
                          </p>
                          <p className="mt-1 break-all text-secondary">
                            {user.email}
                          </p>
                        </td>
                        <td className="hidden px-6 py-5 lg:table-cell">
                          {user.phone ? (
                            <span className="text-secondary">
                              {formatPhoneDisplay(user.phone)}
                            </span>
                          ) : (
                            <span className="italic text-muted">
                              Sin teléfono
                            </span>
                          )}
                        </td>
                        <td className="hidden px-6 py-5 md:table-cell">
                          <span className="flex justify-center">
                            <Badge text={ROLE_LABELS[user.role] || "Sin rol"} />
                          </span>
                        </td>
                        <td className="hidden px-6 py-5 sm:table-cell">
                          <span className="flex justify-center">
                            <Badge
                              style={statusStyles[status]}
                              text={USER_STATUS_LABELS[status]}
                            />
                          </span>
                        </td>
                        <td className="hidden px-6 py-5 text-center text-secondary xl:table-cell">
                          {new Date(user.createdAt).toLocaleDateString("es-CL")}
                        </td>
                        {isAdmin && (
                          <td className="px-3 py-5 sm:px-6">
                            <div className="flex justify-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedUserId(
                                    expandedUserId === user.userId
                                      ? null
                                      : user.userId,
                                  )
                                }
                                className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-content"
                                title={
                                  expandedUserId === user.userId
                                    ? "Ocultar detalles"
                                    : "Ver detalles"
                                }
                              >
                                {expandedUserId === user.userId ? (
                                  <LuEyeOff className="text-base" />
                                ) : (
                                  <LuEye className="text-base" />
                                )}
                              </button>
                              {isAdmin && (
                                <button
                                  type="button"
                                  disabled={Boolean(user.anonymizedAt)}
                                  onClick={() => openEditModal(user)}
                                  className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-content disabled:opacity-40 lg:hidden"
                                  title="Editar usuario"
                                >
                                  <LuPencil className="text-base" />
                                </button>
                              )}
                              <div className="hidden justify-center gap-2 lg:flex">
                                {renderAdminActions(user)}
                              </div>
                            </div>
                          </td>
                        )}
                      </tr>
                      {expandedUserId === user.userId && (
                        <tr className="bg-surface-muted">
                          <td colSpan={7} className="px-4 py-5 sm:px-6">
                            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                              <div>
                                <dt className="text-xs font-bold uppercase text-muted">
                                  Teléfono
                                </dt>
                                <dd className="mt-1">
                                  {formatPhoneDisplay(user.phone) || (
                                    <span className="italic text-muted">
                                      Sin teléfono
                                    </span>
                                  )}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs font-bold uppercase text-muted">
                                  País
                                </dt>
                                <dd className="mt-1">
                                  {getCountryName(catalog, user.countryCode)}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs font-bold uppercase text-muted">
                                  Región
                                </dt>
                                <dd className="mt-1">
                                  {user.countryCode === "CL"
                                    ? getRegionName(catalog, user.regionCode)
                                    : "No aplica"}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs font-bold uppercase text-muted">
                                  Comuna
                                </dt>
                                <dd className="mt-1">
                                  {user.countryCode === "CL"
                                    ? getCommuneName(
                                        catalog,
                                        user.regionCode,
                                        user.communeCode,
                                      )
                                    : "No aplica"}
                                </dd>
                              </div>
                              <div className="col-span-2 sm:col-span-2">
                                <dt className="text-xs font-bold uppercase text-muted">
                                  Dirección
                                </dt>
                                <dd className="mt-1 wrap-break-word">
                                  {user.addressLine || (
                                    <span className="italic text-muted">
                                      Sin dirección
                                    </span>
                                  )}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs font-bold uppercase text-muted">
                                  Rol
                                </dt>
                                <dd className="mt-1">
                                  {ROLE_LABELS[user.role] || "Sin rol"}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs font-bold uppercase text-muted">
                                  Estado
                                </dt>
                                <dd className="mt-1">
                                  {USER_STATUS_LABELS[status]}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs font-bold uppercase text-muted">
                                  Registro
                                </dt>
                                <dd className="mt-1">
                                  {new Date(user.createdAt).toLocaleDateString(
                                    "es-CL",
                                  )}
                                </dd>
                              </div>
                            </dl>
                            {isAdmin && (
                              <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                                {renderAdminActions(user, true, false)}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              {!loading && users.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
                    className="px-6 py-12 text-center text-muted"
                  >
                    No se encontraron usuarios.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
                    className="px-6 py-12 text-center text-muted"
                  >
                    Cargando usuarios...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
        title={modalMode === "create" ? "Crear usuario" : "Editar usuario"}
        fields={modalMode === "create" ? createUserFields : userFields}
        initialData={
          modalMode === "create"
            ? {
                role: "CLIENT",
                countryCode: "CL",
                regionCode: "",
                communeCode: "",
                addressLine: "",
                phone: "",
                phoneCountryCode: "CL",
              }
            : selectedUser
        }
        submitLabel={
          modalMode === "create" ? "Crear usuario" : "Guardar cambios"
        }
        onSubmit={handleSubmit}
        error={modalError}
        loading={loading}
        submitDisabled={catalogLoading || !catalog}
        onClearError={setModalError}
        renderAfterFields={({ formData, setFormData, error, onClearError }) => (
          <UserContactFields
            value={formData}
            onChange={setFormData}
            error={error}
            onClearError={onClearError}
            catalog={catalog}
            catalogLoading={catalogLoading}
            catalogError={catalogError}
            onRetryCatalog={retryCatalog}
          />
        )}
      />

      <AlertDialog
        isOpen={isAlertOpen}
        onClose={() => {
          setIsAlertOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={confirmAnonymize}
        title="¿Anonimizar usuario?"
        message={`La cuenta de ${selectedUser?.name || "este usuario"} quedará desactivada y sus datos personales serán reemplazados de forma irreversible.`}
        type="danger"
        confirmText="Anonimizar"
        cancelText="Cancelar"
        isLoading={loading}
      />
    </div>
  );
}
