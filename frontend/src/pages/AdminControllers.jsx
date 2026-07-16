import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Modal from "@components/Modal";
import FloatingDropdown from "@components/FloatingDropdown";
import Pagination from "@components/Pagination";
import {
  createController,
  deleteController,
  getAllControllers,
  linkUserToController,
  sendAdminControllerCommand,
  unlinkUserFromController,
  updateController,
} from "@services/controller.service";
import {
  LuPencil,
  LuEye,
  LuEyeOff,
  LuPower,
  LuTrash2,
  LuUserRoundMinus,
  LuUserRoundPlus,
} from "react-icons/lu";
import {
  CONTROLLER_LINK_STATUS,
  getControllerConnectionLabel,
  getControllerOperationLabel,
  SWITCH_LABELS,
} from "../constants/controller.constants";
import { getAllUsers } from "@services/user.service";
import { toast } from "sonner";
import { Badge } from "@components/Badge";
import AlertDialog from "../components/AlertDialog";
import { useControllerRealtime } from "@hooks/useControllerRealtime";
import {
  formError,
  hasFormError,
  normalizeFormError,
} from "../utils/formError";
import FieldError from "@components/FieldError";
import { getPageAfterDeletion } from "../utils/pagination";

const controllerFields = [
  {
    name: "switchAmps",
    label: "Amperaje Switch",
    type: "number",
    placeholder: "20",
    inputProps: { min: 1, max: 500, step: 1 },
  },
  {
    name: "switchType",
    label: "Tipo Switch",
    type: "select",
    options: [
      { value: "SSR", label: "SSR" },
      { value: "CONTACTOR", label: "Contactor" },
    ],
  },
];

const linkUserFields = [{ name: "userId", label: "Usuario", type: "custom" }];

const normalizeControllerFormData = (formData) => ({
  ...formData,
  switchAmps: Number(formData.switchAmps),
});

const LinkStatusStyle = {
  [CONTROLLER_LINK_STATUS.UNLINKED]: "default",
  [CONTROLLER_LINK_STATUS.LINKED_TO_KILN]: "info",
  [CONTROLLER_LINK_STATUS.LINKED_TO_USER]: "info",
  [CONTROLLER_LINK_STATUS.LINKED_TO_KILN_AND_USER]: "success",
};

const normalizeSearchTerm = (value) => value.trim().toLowerCase();
const PAGE_SIZE = 10;

export default function AdminControllers() {
  const [loading, setLoading] = useState(false);
  const [controllers, setControllers] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLinkUserModalOpen, setIsLinkUserModalOpen] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalMode, setModalMode] = useState("create");
  const [selectedController, setSelectedController] = useState(null);
  const [selectedUserToLink, setSelectedUserToLink] = useState(null);
  const [linkUserError, setLinkUserError] = useState(null);
  const [linkUserSearchTerm, setLinkUserSearchTerm] = useState("");
  const [linkPin, setLinkPin] = useState("");
  const [expandedControllerId, setExpandedControllerId] = useState(null);
  const [commandLoadingId, setCommandLoadingId] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({
    total: 0,
    linkedToKiln: 0,
    linkedToUser: 0,
    fullyLinked: 0,
  });
  const linkUserSearchRef = useRef(null);

  const fetchControllers = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getAllControllers({
        page,
        pageSize: PAGE_SIZE,
        search: searchTerm,
      });
      const payload = result.data || {};
      setControllers(payload.items || []);
      setTotalPages(payload.pagination?.totalPages || 1);
      setSummary((current) => ({ ...current, ...(payload.summary || {}) }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchControllers();
  }, [fetchControllers]);

  const handleTelemetry = useCallback((telemetry) => {
    setControllers((current) =>
      current.map((controller) =>
        controller.controllerId === telemetry.controllerId
          ? {
              ...controller,
              operativeStatus: telemetry.operativeStatus,
              connectionStatus: telemetry.connectionStatus,
              temp: telemetry.temp,
            }
          : controller,
      ),
    );
  }, []);

  useControllerRealtime(handleTelemetry);

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedController(null);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (controller) => {
    setModalMode("edit");
    setSelectedController(controller);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openLinkUserModal = (controller) => {
    setSelectedController(controller);
    setLinkUserError(null);
    setLinkUserSearchTerm("");
    setSelectedUserToLink(null);
    setLinkPin("");
    //setIsLinkControllerModalOpen(false);
    setIsAlertOpen(false);
    setIsLinkUserModalOpen(true);

    if (!controller?.user && users.length === 0 && !loading) {
      fetchUsers();
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalError(null);
    setSelectedController(null);
  };

  const closeLinkUserModal = () => {
    setIsLinkUserModalOpen(false);
    setLinkUserError(null);
    setLinkUserSearchTerm("");
    setSelectedUserToLink(null);
    setLinkPin("");
    setSelectedController(null);
  };

  const handleSubmitController = async (formData) => {
    if (selectedController?.kiln?.amps > parseInt(formData.switchAmps)) {
      setModalError(formError(
        `El horno vinculado requiere al menos ${selectedController?.kiln.amps}. Desvincula el controlador del horno antes de reducir su amperaje.`,
        "switchAmps",
      ));
      return;
    }

    setLoading(true);
    setModalError(null);

    try {
      const data = normalizeControllerFormData(formData);
      const response =
        modalMode === "create"
          ? await createController(data)
          : await updateController(selectedController.controllerId, data);

      if (response.success) {
        closeModal();
        fetchControllers();
        return;
      }

      setModalError(normalizeFormError(response));
    } catch (error) {
      setModalError(normalizeFormError(error));
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const result = await getAllUsers({ pageSize: 100 });
      setUsers(result.data?.items || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkUserSubmit = async ({ userId }) => {
    if (!selectedController) {
      setLinkUserError(formError("Selecciona un controlador antes de enlazar un usuario."));
      return;
    }

    const validationErrors = [];
    if (
      !selectedUserToLink ||
      String(selectedUserToLink.userId) !== String(userId)
    ) {
      validationErrors.push({
        message: "Selecciona un usuario de la lista para continuar.",
        field: "userId",
      });
    } else if (parseInt(selectedController?.userId) === parseInt(userId)) {
      validationErrors.push({
        message: "El controlador ya está vinculado al usuario seleccionado",
        field: "userId",
      });
    }

    if (!/^\d{6}$/.test(linkPin)) {
      validationErrors.push({
        message: "El PIN debe contener exactamente 6 dígitos.",
        field: "pin",
      });
    }

    if (validationErrors.length) {
      setLinkUserError(normalizeFormError({ errors: validationErrors }));
      return;
    }

    try {
      const response = await linkUserToController(
        selectedController.controllerId.slice(-6),
        parseInt(userId),
        parseInt(linkPin),
      );
      if (response.success) {
        toast.success(
          `Usuario ${selectedUserToLink.name} enlazado al controlador ID ${selectedController.controllerId.slice(-6)}.`,
        );
        fetchControllers();
        fetchUsers();
        closeLinkUserModal();
      } else {
        setLinkUserError(normalizeFormError(response));
        return;
      }
    } catch (error) {
      setLinkUserError(normalizeFormError(error));
    }
  };

  const handleUnlinkUser = async () => {
    if (!selectedController?.userId) {
      setLinkUserError("El controlador no tiene un usuario vinculado.");
      return;
    }

    try {
      const response = await unlinkUserFromController(
        selectedController.controllerId,
        parseInt(selectedController.userId),
      );

      if (response.success) {
        toast.success(
          `Usuario desvinculado del controlador ID ${selectedController.controllerId}.`,
        );
        fetchControllers();
        fetchUsers();
        closeLinkUserModal();
        return;
      }

      throw new Error(response.message || "Error al desvincular usuario");
    } catch (error) {
      toast.error("Error al desvincular usuario", {
        description: error.message,
      });
    }
  };

  const handleControllerCommand = async (controller, command) => {
    const loadingId = `${controller.controllerId}:${command}`;
    setCommandLoadingId(loadingId);

    try {
      const response = await sendAdminControllerCommand(
        controller.controllerId,
        command,
      );

      if (response.success) {
        toast.success(
          `Comando "${getControllerOperationLabel(command)}" enviado al controlador.`,
        );
        return;
      }

      throw new Error(response.message || "Error al enviar comando");
    } catch (error) {
      toast.error("Error al enviar comando", {
        description: error.message,
      });
    } finally {
      setCommandLoadingId("");
    }
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      const response = await deleteController(selectedController.controllerId);

      if (response.success) {
        const nextPage = getPageAfterDeletion({
          page,
          itemsOnPage: controllers.length,
        });
        toast.success("Controlador eliminado exitosamente.");
        if (nextPage !== page) {
          setPage(nextPage);
        } else {
          fetchControllers();
        }
      }
    } catch (error) {
      toast.error("Error al eliminar controlador", error.message);
    } finally {
      setIsAlertOpen(false);
      setSelectedController(null);
      setLoading(false);
    }
  };

  const filteredUsersForLink = users
    .filter((user) => {
      if (user.userId === selectedController?.user?.userId) return false;
      if (user.userId === selectedUserToLink?.userId) return false;

      const search = normalizeSearchTerm(linkUserSearchTerm);

      if (!search) {
        return false;
      }

      return (
        String(user.userId).toLowerCase().includes(search) ||
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search)
      );
    })
    .slice(0, 8);

  const selectedControllerHasOwner = Boolean(selectedController?.user);

  const getControllerLinkStatus = (status) => {
    if (status === CONTROLLER_LINK_STATUS.UNLINKED) {
      return "No vinculado";
    }

    if (
      status === CONTROLLER_LINK_STATUS.LINKED_TO_KILN ||
      status === CONTROLLER_LINK_STATUS.LINKED_TO_USER
    ) {
      return "Parcial";
    }

    return "Completo";
  };

  return (
    <div className="min-w-0 space-y-6 text-white scrollbar-thin scrollbar-track-neutral-500 scrollbar-thumb-red-300">
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Controladores
          </h1>
          <p className="text-neutral-300 mt-1 text-sm">
            Gestión centralizada de todos los controladores de la plataforma.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="w-full rounded-lg bg-red-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 sm:w-auto"
        >
          Añadir Nuevo Controlador
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-neutral-800 bg-[#141414] p-3 shadow-md sm:p-5">
          <p className="mb-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-neutral-500 sm:text-xs sm:tracking-wider">
            Total Controladores
          </p>
          <p className="text-xl font-bold sm:text-3xl">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-[#141414] p-3 shadow-md sm:p-5">
          <p className="mb-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-neutral-500 sm:text-xs sm:tracking-wider">
            Asignados a Horno
          </p>
          <p className="text-xl font-bold text-blue-400/90 sm:text-3xl">
            {summary.linkedToKiln}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-[#141414] p-3 shadow-md sm:p-5">
          <p className="mb-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-neutral-500 sm:text-xs sm:tracking-wider">
            Asignados a Usuario
          </p>
          <p className="text-xl font-bold text-blue-400/90 sm:text-3xl">
            {summary.linkedToUser}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-[#141414] p-3 shadow-md sm:p-5">
          <p className="mb-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-neutral-500 sm:text-xs sm:tracking-wider">
            Asignados a Horno y Usuario
          </p>
          <p className="text-xl font-bold text-green-400/90 sm:text-3xl">
            {summary.fullyLinked}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-[#141414] shadow-2xl">
        <div className="border-b border-neutral-800 p-4">
          <p className="mb-2 text-sm md:text-base text-neutral-400">
            Busca controladores por su ID completo o por sus últimos seis
            caracteres.
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
              placeholder="Buscar por ID"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#0a0a0a] border border-neutral-700 text-sm rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-white placeholder-neutral-500"
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-auto">
          {summary.total > 0 || searchTerm ? (
            !loading && (
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="sticky top-0 z-10 border-b border-neutral-800 bg-[#0a0a0a] text-xs uppercase tracking-wider text-neutral-500">
                  <tr>
                    <th
                      scope="col"
                      className="flex flex-row items-end gap-2 px-3 py-3 font-medium sm:px-6 sm:py-4"
                    >
                      ID
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 font-medium sm:px-6 sm:py-4"
                    >
                      Propietario / Horno asignado
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 font-medium sm:px-6 sm:py-4"
                    >
                      Estado de vinculación
                    </th>
                    <th
                      scope="col"
                      className="hidden px-3 py-3 text-center font-medium lg:table-cell sm:px-6 sm:py-4"
                    >
                      Estado
                    </th>
                    <th
                      scope="col"
                      className="hidden px-3 py-3 text-center font-medium lg:table-cell sm:px-6 sm:py-4"
                    >
                      Conexión
                    </th>
                    <th
                      scope="col"
                      className="hidden px-3 py-3 text-center font-medium lg:table-cell sm:px-6 sm:py-4"
                    >
                      Temperatura
                    </th>
                    <th
                      scope="col"
                      className="hidden px-3 py-3 text-center font-medium md:table-cell sm:px-6 sm:py-4"
                    >
                      Amperaje del Switch
                    </th>
                    <th
                      scope="col"
                      className="hidden px-3 py-3 text-center font-medium md:table-cell sm:px-6 sm:py-4"
                    >
                      Tipo de Switch
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 text-center font-medium sm:px-6 sm:py-4"
                    >
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-800/60">
                  {controllers.length > 0 ? (
                    controllers.map((controller) => (
                      <Fragment key={controller.controllerId}>
                        <tr className="hover:bg-neutral-900/30 transition-colors">
                          {/* ID */}
                          <td
                            onClick={() => {
                              navigator.clipboard.writeText(
                                controller.controllerId,
                              );
                              toast.success("¡ID copiada!");
                            }}
                            className="px-3 py-4 font-mono text-red-400 hover:underline sm:px-6 sm:py-5 sm:text-base"
                            title={"Copiar ID: " + controller.controllerId}
                          >
                            ...{controller.controllerId.slice(-6)}
                          </td>

                          {/* Horno asignado */}
                          <td className="max-w-36 wrap-break-word px-3 py-4 sm:max-w-none sm:px-6 sm:py-5">
                            <div className="flex flex-col">
                              {controller.kiln ? (
                                <span className="font-semibold text-neutral-100 text-base">
                                  Horno #{controller.kiln?.kilnId}
                                </span>
                              ) : (
                                <span className="text-sm text-neutral-400/70 italic">
                                  Sin horno asignado
                                </span>
                              )}
                              {controller.user ? (
                                <span className="text-sm text-neutral-300">
                                  {controller.user.name}
                                </span>
                              ) : (
                                <span className="text-sm text-neutral-400/70 italic">
                                  Sin propietario
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Estado vinculación */}
                          <td className="px-3 py-4 font-mono text-xs sm:px-6 sm:py-5">
                            <Badge
                              style={LinkStatusStyle[controller.linkStatus]}
                              text={getControllerLinkStatus(
                                controller.linkStatus,
                              )}
                            />
                          </td>

                          {/* Estado operativo */}
                          <td className="hidden px-3 py-4 text-center lg:table-cell sm:px-6 sm:py-5">
                            <span className="flex justify-center">
                              <Badge
                                style={
                                  controller.operativeStatus === "ON"
                                    ? "success"
                                    : "default"
                                }
                                text={getControllerOperationLabel(
                                  controller.operativeStatus,
                                )}
                              />
                            </span>
                          </td>

                          {/* Conexión */}
                          <td className="hidden px-3 py-4 text-center lg:table-cell sm:px-6 sm:py-5">
                            <span className="flex justify-center">
                              <Badge
                                style={
                                  controller.connectionStatus === "ONLINE"
                                    ? "info"
                                    : "default"
                                }
                                text={getControllerConnectionLabel(
                                  controller.connectionStatus,
                                )}
                              />
                            </span>
                          </td>

                          {/* Temperatura */}
                          <td className="hidden px-3 py-4 text-center font-mono text-neutral-300 lg:table-cell sm:px-6 sm:py-5">
                            {controller.temp == null ? (
                              <span className="text-neutral-400/70 font-sans italic">
                                No disponible
                              </span>
                            ) : (
                              `${controller.temp.toFixed(1)} °C`
                            )}
                          </td>

                          {/* Amperaje switch */}
                          <td className="hidden px-3 py-4 text-center font-mono text-neutral-300 md:table-cell sm:px-6 sm:py-5">
                            {controller.switchAmps}
                          </td>

                          {/* Tipo switch */}
                          <td className="hidden px-3 py-4 text-center md:table-cell sm:px-6 sm:py-5">
                            <span className="flex items-center justify-center">
                              <Badge
                                style="default"
                                text={SWITCH_LABELS[controller.switchType]}
                              />
                            </span>
                          </td>

                          {/* Botones de Acción */}
                          <td className="px-2 py-4 text-center text-base sm:px-6 sm:py-5 sm:text-lg">
                            <div className="flex justify-center gap-2">
                              {/* Comando toggle */}
                              <button
                                onClick={() =>
                                  handleControllerCommand(
                                    controller,
                                    controller.operativeStatus === "ON"
                                      ? "OFF"
                                      : "ON",
                                  )
                                }
                                disabled={
                                  Boolean(commandLoadingId) ||
                                  !controller.kiln ||
                                  controller.connectionStatus !== "ONLINE"
                                }
                                className={
                                  "hidden rounded-lg p-2 text-neutral-400 transition-colors enabled:hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 md:inline-flex " +
                                  (controller.operativeStatus === "ON"
                                    ? "enabled:hover:text-red-400 enabled:hover:bg-red-400/10"
                                    : "enabled:hover:text-green-400 enabled:hover:bg-green-400/10")
                                }
                                title={
                                  !controller.kiln
                                    ? "Requiere horno vinculado"
                                    : controller.operativeStatus === "ON"
                                      ? "Apagar horno"
                                      : "Encender horno"
                                }
                              >
                                <LuPower />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedControllerId((current) =>
                                    current === controller.controllerId
                                      ? null
                                      : controller.controllerId,
                                  )
                                }
                                className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white md:hidden"
                                title={
                                  expandedControllerId ===
                                  controller.controllerId
                                    ? "Ocultar detalles"
                                    : "Ver detalles"
                                }
                                aria-label={
                                  expandedControllerId ===
                                  controller.controllerId
                                    ? `Ocultar detalles del controlador ${controller.controllerId}`
                                    : `Ver detalles del controlador ${controller.controllerId}`
                                }
                                aria-expanded={
                                  expandedControllerId ===
                                  controller.controllerId
                                }
                              >
                                {expandedControllerId ===
                                controller.controllerId ? (
                                  <LuEyeOff />
                                ) : (
                                  <LuEye />
                                )}
                              </button>

                              {/* Enlazar/Desenlazar usuario */}
                              <button
                                onClick={() => openLinkUserModal(controller)}
                                className={
                                  "hidden rounded-lg p-2 text-neutral-400 transition-colors hover:cursor-pointer md:inline-flex" +
                                  (controller.user
                                    ? " hover:text-red-400 hover:bg-red-400/10"
                                    : " hover:text-green-400 hover:bg-green-400/10")
                                }
                                title={
                                  controller.user
                                    ? "Desvincular usuario"
                                    : "Asignar usuario"
                                }
                              >
                                {controller.user ? (
                                  <LuUserRoundMinus />
                                ) : (
                                  <LuUserRoundPlus />
                                )}
                              </button>

                              {/* Editar datos */}
                              <button
                                onClick={() => openEditModal(controller)}
                                className="hidden rounded-lg p-2 text-neutral-400 transition-colors hover:cursor-pointer hover:bg-neutral-800 hover:text-white md:inline-flex"
                                title="Editar datos"
                              >
                                <LuPencil />
                              </button>

                              {/* Eliminar */}
                              <button
                                onClick={() => {
                                  setSelectedController(controller);
                                  setIsAlertOpen(true);
                                }}
                                className="hidden rounded-lg p-2 text-neutral-400 transition-colors hover:cursor-pointer hover:bg-red-400/10 hover:text-red-400 md:inline-flex"
                                title="Eliminar controlador"
                              >
                                <LuTrash2 />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedControllerId === controller.controllerId && (
                          <tr className="bg-neutral-950/60 md:hidden">
                            <td colSpan="9" className="px-3 py-3">
                              <dl className="grid grid-cols-2 gap-x-3 gap-y-4 text-xs">
                                <div>
                                  <dt className="font-bold text-neutral-400">
                                    Estado y Conexión
                                  </dt>
                                  <dd className="mt-1 flex flex-wrap gap-1.5">
                                    <Badge
                                      style={
                                        controller.operativeStatus === "ON"
                                          ? "success"
                                          : "default"
                                      }
                                      text={getControllerOperationLabel(
                                        controller.operativeStatus,
                                      )}
                                    />
                                    {controller.operativeStatus === "ON" && (
                                      <Badge
                                        style={
                                          controller.connectionStatus ===
                                          "ONLINE"
                                            ? "info"
                                            : "default"
                                        }
                                        text={getControllerConnectionLabel(
                                          controller.connectionStatus,
                                        )}
                                      />
                                    )}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="font-bold text-neutral-400">
                                    Switch
                                  </dt>
                                  <dd className="mt-1 text-neutral-200">
                                    {SWITCH_LABELS[controller.switchType]}{" "}
                                    {controller.switchAmps}A
                                  </dd>
                                </div>
                                <div>
                                  <dt className="font-bold text-neutral-400">
                                    Temperatura
                                  </dt>
                                  <dd className="mt-1 font-mono text-neutral-200">
                                    {controller.temp == null ? (
                                      <span className="font-sans italic text-neutral-400/70">
                                        No disponible
                                      </span>
                                    ) : (
                                      `${controller.temp.toFixed(1)} °C`
                                    )}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="font-bold text-neutral-400">
                                    PIN
                                  </dt>
                                  <dd className="mt-1 font-mono text-neutral-200">
                                    {controller.pin || "Inactivo"}
                                  </dd>
                                </div>
                              </dl>
                              <div className="mt-4 border-t border-neutral-800 pt-3">
                                <p className="mb-2 text-xs font-bold text-neutral-400">
                                  Acciones
                                </p>
                                <div className="flex flex-wrap items-center gap-2 text-base">
                                  <button
                                    onClick={() =>
                                      handleControllerCommand(
                                        controller,
                                        controller.operativeStatus === "ON"
                                          ? "OFF"
                                          : "ON",
                                      )
                                    }
                                    disabled={
                                      Boolean(commandLoadingId) ||
                                      !controller.kiln ||
                                      controller.connectionStatus !== "ONLINE"
                                    }
                                    className={
                                      "inline-flex rounded-lg p-2 text-neutral-400 transition-colors enabled:hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 " +
                                      (controller.operativeStatus === "ON"
                                        ? "enabled:hover:text-red-400 enabled:hover:bg-red-400/10"
                                        : "enabled:hover:text-green-400 enabled:hover:bg-green-400/10")
                                    }
                                    title={
                                      !controller.kiln
                                        ? "Requiere horno vinculado"
                                        : controller.operativeStatus === "ON"
                                          ? "Apagar horno"
                                          : "Encender horno"
                                    }
                                  >
                                    <LuPower />
                                  </button>
                                  <button
                                    onClick={() =>
                                      openLinkUserModal(controller)
                                    }
                                    className={
                                      "inline-flex rounded-lg p-2 text-neutral-400 transition-colors hover:cursor-pointer" +
                                      (controller.user
                                        ? " hover:text-red-400 hover:bg-red-400/10"
                                        : " hover:text-green-400 hover:bg-green-400/10")
                                    }
                                    title={
                                      controller.user
                                        ? "Desvincular usuario"
                                        : "Asignar usuario"
                                    }
                                  >
                                    {controller.user ? (
                                      <LuUserRoundMinus />
                                    ) : (
                                      <LuUserRoundPlus />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => openEditModal(controller)}
                                    className="inline-flex rounded-lg p-2 text-neutral-400 transition-colors hover:cursor-pointer hover:bg-neutral-800 hover:text-white"
                                    title="Editar datos"
                                  >
                                    <LuPencil />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedController(controller);
                                      setIsAlertOpen(true);
                                    }}
                                    className="inline-flex rounded-lg p-2 text-neutral-400 transition-colors hover:cursor-pointer hover:bg-red-400/10 hover:text-red-400"
                                    title="Eliminar controlador"
                                  >
                                    <LuTrash2 />
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="9"
                        className="px-6 py-12 text-center text-neutral-500"
                      >
                        No se encontraron controladores que coincidan con "
                        {searchTerm}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )
          ) : (
            <p className="text-neutral-300 text-sm/relaxed p-4 text-center">
              No hay controladores registrados. <br />
              Haz click en el botón{" "}
              <span className="rounded-lg font-medium">
                Añadir nuevo controlador
              </span>{" "}
              para registrar un controlador.
            </p>
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
          modalMode === "create"
            ? "Crear Nuevo Controlador"
            : "Editar Controlador"
        }
        fields={controllerFields}
        initialData={selectedController}
        submitLabel={
          modalMode === "create" ? "Crear Controlador" : "Guardar Cambios"
        }
        onSubmit={handleSubmitController}
        error={modalError}
        loading={loading}
        onClearError={setModalError}
      />

      <Modal
        isOpen={isLinkUserModalOpen}
        onClose={closeLinkUserModal}
        title={
          (selectedControllerHasOwner
            ? "Desvincular usuario de"
            : "Asignar usuario a") +
          " Controlador ID " +
          `...${selectedController?.controllerId.slice(-6)}`
        }
        fields={linkUserFields}
        submitLabel={
          selectedControllerHasOwner ? "Desvincular usuario" : "Asignar usuario"
        }
        onSubmit={
          selectedControllerHasOwner ? handleUnlinkUser : handleLinkUserSubmit
        }
        error={linkUserError}
        loading={false}
        onClearError={setLinkUserError}
        renderContent={({ setFormData, onClearError, error }) => {
          return (
            <div className="flex flex-col gap-6">
              {!selectedControllerHasOwner && (
                <div className="flex flex-col gap-3">
                  <div className="relative" ref={linkUserSearchRef}>
                    <label className="text-sm font-medium text-neutral-400 ml-1">
                      Busca por nombre, correo electrónico o ID de usuario
                    </label>
                    <input
                      type="text"
                      name="userId"
                      value={linkUserSearchTerm}
                      placeholder="Juan, matias@argilla.cl, 5..."
                      onChange={(e) => {
                        const value = e.target.value;
                        setLinkUserSearchTerm(value);
                        setFormData((prev) => ({ ...prev, userId: "" }));

                        onClearError("userId");
                      }}
                      aria-invalid={hasFormError(error, "userId") || undefined}
                      aria-describedby={hasFormError(error, "userId") ? "controller-user-error" : undefined}
                      className="mt-2 w-full bg-[#0a0a0a] border-2 border-neutral-700 rounded-lg px-3 py-2.5 text-white outline-none focus:border-red-600 transition-colors"
                    />
                    <FieldError error={error} field="userId" id="controller-user-error" />

                    {linkUserSearchTerm.trim() && (
                      <FloatingDropdown
                        anchorRef={linkUserSearchRef}
                        open
                        onRequestClose={() => setLinkUserSearchTerm("")}
                      >
                        {loading ? (
                          <div className="px-4 py-3 text-sm text-neutral-500">
                            Cargando usuarios...
                          </div>
                        ) : filteredUsersForLink.length > 0 ? (
                          filteredUsersForLink.map((user) => {
                            const isSelected =
                              selectedUserToLink?.userId === user.userId;

                            const isOwner =
                              selectedControllerHasOwner &&
                              selectedController?.user?.userId === user.userId;

                            if (isSelected || isOwner) return;

                            return (
                              <button
                                key={user.userId}
                                type="button"
                                onClick={() => {
                                  if (isSelected || isOwner) {
                                    return false;
                                  }

                                  setSelectedUserToLink(user);
                                  setLinkUserSearchTerm("");
                                  setFormData((prev) => ({
                                    ...prev,
                                    userId: String(user.userId),
                                  }));
                                  onClearError("userId");
                                }}
                                className="flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-neutral-900 hover:cursor-pointer"
                              >
                                <span className="text-sm font-medium text-white">
                                  {user.name}
                                </span>
                                <span className="text-xs font-bold text-neutral-400">
                                  #{user.userId} - {user.email}
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-4 py-3 text-sm text-neutral-500">
                            No se encontraron usuarios con ese criterio.
                          </div>
                        )}
                      </FloatingDropdown>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-400 ml-1">
                      Ingresa el PIN del controlador
                    </label>
                    <input
                      type="password"
                      name="pin"
                      value={linkPin}
                      placeholder="123456..."
                      inputMode="numeric"
                      maxLength={6}
                      onChange={(e) => {
                        const value = e.target.value;
                        setLinkPin(value);
                        setFormData((prev) => ({ ...prev, pin: value }));

                        onClearError("pin");
                      }}
                      aria-invalid={hasFormError(error, "pin") || undefined}
                      aria-describedby={hasFormError(error, "pin") ? "controller-pin-error" : undefined}
                      required
                      className="mt-2 w-full bg-[#0a0a0a] border-2 border-neutral-700 rounded-lg px-3 py-2.5 text-white outline-none focus:border-red-600 transition-colors"
                    />
                    <FieldError error={error} field="pin" id="controller-pin-error" />
                  </div>
                </div>
              )}
              {!selectedControllerHasOwner && selectedController?.kiln && (
                <p className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-300">
                  Si el horno asociado está libre, también se vinculará a este
                  propietario.
                </p>
              )}
              {selectedController?.user && (
                <div className="flex flex-col gap-4">
                  <p className="text-neutral-300 text-pretty">
                    {selectedController?.kiln
                      ? "El usuario será desvinculado del controlador y del horno asociado."
                      : "El usuario será desvinculado del controlador."}
                  </p>
                  <div className="rounded-xl border border-neutral-500 bg-neutral-800 px-4 py-3 flex flex-row flex-wrap items-center justify-between">
                    <p className="text-sm text-neutral-300">
                      Propietario actual
                    </p>
                    <p className="text-base">
                      {selectedController?.user?.name} -{" "}
                      {selectedController?.user?.email}
                    </p>
                  </div>
                </div>
              )}

              {!selectedControllerHasOwner && selectedUserToLink && (
                <>
                  <div className="rounded-xl border border-neutral-500 bg-neutral-800 px-4 py-3 flex flex-row flex-wrap items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-300">
                        Nuevo propietario
                      </p>
                      <p className="mt-1">
                        {selectedUserToLink.name} - {selectedUserToLink.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedUserToLink(null)}
                      className="inline-flex items-center rounded-lg bg-neutral-700 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700 hover:cursor-pointer"
                    >
                      Quitar selección
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        }}
      />

      <AlertDialog
        isOpen={isAlertOpen}
        onClose={() => {
          setIsAlertOpen(false);
          setSelectedController(null);
        }}
        onConfirm={confirmDelete}
        title="¿Eliminar controlador?"
        CustomMessage={() => (
          <p className="text-neutral-300">
            El controlador{" "}
            <span
              title={selectedController?.controllerId}
              className="font-mono hover:cursor-help"
            >
              ...{selectedController?.controllerId?.slice(-6)}
            </span>{" "}
            será eliminado permanentemente
          </p>
        )}
        type="danger"
        confirmText="Eliminar controlador"
        cancelText="Cancelar"
        isLoading={loading}
      />
    </div>
  );
}
