import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Modal from "@components/Modal";
import FloatingDropdown from "@components/FloatingDropdown";
import Pagination from "@components/Pagination";
import {
  getAllKilns,
  createKiln,
  updateKiln,
  deleteKiln,
  linkController,
  unlinkUser,
  unlinkController,
} from "@services/kiln.service";
import { getAllUsers } from "@services/user.service";
import {
  LuLink,
  LuEye,
  LuEyeOff,
  LuHistory,
  LuPencil,
  LuPower,
  LuTrash2,
  LuUnlink,
  LuUserRoundPlus,
  LuUserRoundMinus,
} from "react-icons/lu";
import { toast } from "sonner";
import AlertDialog from "@components/AlertDialog";
import { linkUser } from "@services/kiln.service";
import { Badge } from "@components/Badge";
import { sendAdminControllerCommand } from "@services/controller.service";
import { useControllerRealtime } from "@hooks/useControllerRealtime";
import { getControllerOperationLabel } from "@constants/controller.constants";
import {
  formError,
  hasFormError,
  normalizeFormError,
} from "../utils/formError";
import FieldError from "@components/FieldError";
import { getPageAfterDeletion } from "../utils/pagination";

const KilnStatusBadge = ({ controller }) => {
  if (!controller) {
    return <span className="text-sm italic text-neutral-400/70">Inactivo</span>;
  }

  const isOn = controller.operativeStatus === "ON";
  const text =
    isOn && controller.temp != null
      ? `Encendido`
      : getControllerOperationLabel(controller.operativeStatus);

  return <Badge style={isOn ? "success" : "default"} text={text} description={isOn && controller.temp != null ? (controller.temp.toFixed(1) + " °C") : null}/>;
};

const kilnFields = [
  {
    name: "name",
    label: "Nombre del horno",
    type: "text",
    placeholder: "Horno Taller #40",
    inputProps: {
      minLength: 2,
      maxLength: 100,
    },
  },
  {
    name: "liters",
    label: "Capacidad (Litros)",
    type: "number",
    placeholder: "40",
    inputProps: { min: 1, max: 500, step: 1 },
  },
  {
    name: "amps",
    label: "Amperaje",
    type: "number",
    placeholder: "25",
    inputProps: { min: 1, max: 500, step: 1 },
  },
  {
    name: "volts",
    label: "Voltaje",
    type: "number",
    placeholder: "220",
    inputProps: { min: 100, max: 600, step: 1 },
  },
  {
    name: "phases",
    label: "Fases",
    type: "select",
    options: [
      { value: "1", label: "Monofásico" },
      { value: "3", label: "Trifásico" },
    ],
  },
];

const normalizeKilnFormData = (formData) => ({
  ...formData,
  liters: Number(formData.liters),
  amps: Number(formData.amps),
  volts: Number(formData.volts),
  phases: Number(formData.phases),
});

const linkUserFields = [{ name: "userId", label: "Usuario", type: "custom" }];

const linkControllerFields = [
  {
    name: "controllerSuffix",
    label: "Últimos 6 caracteres de la UUID del controlador",
    type: "text",
    placeholder: "A1B2C3",
    inputProps: {
      autoComplete: "off",
      maxLength: 6,
    },
  },
  {
    name: "controllerPin",
    label: "PIN de 6 dígitos",
    type: "password",
    placeholder: "123456",
    inputProps: {
      autoComplete: "one-time-code",
      inputMode: "numeric",
      maxLength: 6,
    },
  },
];

const normalizeSearchTerm = (value) => value.trim().toLowerCase();
const PAGE_SIZE = 8;

export default function AdminKilns() {
  const [loading, setLoading] = useState(false);
  const [kilns, setKilns] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalMode, setModalMode] = useState("create");
  const [selectedKiln, setSelectedKiln] = useState(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isLinkUserModalOpen, setIsLinkUserModalOpen] = useState(false);
  const [isLinkControllerModalOpen, setIsLinkControllerModalOpen] =
    useState(false);
  const [linkUserError, setLinkUserError] = useState(null);
  const [linkControllerError, setLinkControllerError] = useState(null);
  const [linkUserSearchTerm, setLinkUserSearchTerm] = useState("");
  const [selectedUserToLink, setSelectedUserToLink] = useState(null);
  const [expandedKilnId, setExpandedKilnId] = useState(null);
  const [commandLoadingId, setCommandLoadingId] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({
    total: 0,
    withoutController: 0,
    withoutOwner: 0,
  });
  const linkUserSearchRef = useRef(null);

  const fetchKilns = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getAllKilns({
        page,
        pageSize: PAGE_SIZE,
        search: searchTerm,
      });
      const payload = result.data || {};
      setKilns(payload.items || []);
      setTotalPages(payload.pagination?.totalPages || 1);
      setSummary((current) => ({ ...current, ...(payload.summary || {}) }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm]);

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchKilns();
  }, [fetchKilns]);

  const handleTelemetry = useCallback((telemetry) => {
    setKilns((current) =>
      current.map((kiln) =>
        kiln.controller?.controllerId === telemetry.controllerId
          ? {
              ...kiln,
              controller: {
                ...kiln.controller,
                operativeStatus: telemetry.operativeStatus,
                connectionStatus: telemetry.connectionStatus,
                temp: telemetry.temp,
              },
            }
          : kiln,
      ),
    );
  }, []);

  useControllerRealtime(handleTelemetry);

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedKiln(null);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (kiln) => {
    setModalMode("edit");
    setSelectedKiln(kiln);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openLinkUserModal = (kiln) => {
    setSelectedKiln(kiln);
    setLinkUserError(null);
    setLinkUserSearchTerm("");
    setSelectedUserToLink(null);
    setIsLinkControllerModalOpen(false);
    setIsAlertOpen(false);
    setIsLinkUserModalOpen(true);

    if (users.length === 0 && !loading) {
      fetchUsers();
    }
  };

  const closeLinkUserModal = () => {
    setIsLinkUserModalOpen(false);
    setLinkUserError(null);
    setLinkUserSearchTerm("");
    setSelectedUserToLink(null);
    setSelectedKiln(null);
  };

  const openLinkControllerModal = (kiln) => {
    setSelectedKiln(kiln);
    setLinkControllerError(null);
    setIsLinkUserModalOpen(false);
    setIsAlertOpen(false);
    setIsLinkControllerModalOpen(true);
  };

  const closeLinkControllerModal = () => {
    setIsLinkControllerModalOpen(false);
    setLinkControllerError(null);
    setSelectedKiln(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalError(null);
    setSelectedKiln(null);
  };

  const handleCreateKiln = async (formData) => {
    setLoading(true);
    setModalError(null);

    try {
      const data = normalizeKilnFormData(formData);
      const response =
        modalMode === "create"
          ? await createKiln(data)
          : await updateKiln(selectedKiln.kilnId, data);

      if (response.success) {
        toast.success(`Horno ${modalMode === "create" ? "creado" : "actualizado"} exitosamente`)
        closeModal();
        fetchKilns();
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
      const response = await deleteKiln(selectedKiln.kilnId);

      if (response.success) {
        const nextPage = getPageAfterDeletion({
          page,
          itemsOnPage: kilns.length,
        });
        toast.success("Horno eliminado exitosamente.");
        if (nextPage !== page) {
          setPage(nextPage);
        } else {
          fetchKilns();
        }
      }
    } catch (error) {
      toast.error("Error al eliminar horno", error.message);
    } finally {
      setIsAlertOpen(false);
      setSelectedKiln(null);
      setLoading(false);
    }
  };

  const handleLinkUserSubmit = async ({ userId }) => {
    if (!selectedKiln) {
      setLinkUserError(formError("Selecciona un horno antes de enlazar un usuario."));
      return;
    }

    if (
      !selectedUserToLink ||
      String(selectedUserToLink.userId) !== String(userId)
    ) {
      setLinkUserError(formError("Selecciona un usuario de la lista para continuar.", "userId"));
      return;
    }

    if (parseInt(selectedKiln?.userId) === parseInt(userId)) {
      setLinkUserError(formError("El horno ya está vinculado al usuario seleccionado", "userId"));
      return;
    }

    try {
      const response = await linkUser(
        parseInt(selectedKiln.kilnId),
        parseInt(userId),
      );
      if (response.success) {
        toast.success(
          `Usuario ${selectedUserToLink.name} enlazado al horno #${selectedKiln.kilnId}.`,
        );
        fetchKilns();
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
    if (!selectedKiln?.userId) {
      setLinkUserError("El horno no tiene un usuario vinculado.");
      return;
    }

    try {
      const response = await unlinkUser(
        parseInt(selectedKiln.kilnId),
        parseInt(selectedKiln.userId),
      );

      if (response.success) {
        toast.success(
          `Usuario desvinculado del horno #${selectedKiln.kilnId}.`,
        );
        fetchKilns();
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

  const handleLinkControllerSubmit = async ({
    controllerSuffix,
    controllerPin,
  }) => {
    const suffix = String(controllerSuffix || "").trim();
    const pin = String(controllerPin || "").trim();

    if (!selectedKiln) {
      setLinkControllerError(formError("Selecciona un horno antes de enlazar un controlador."));
      return;
    }

    const validationErrors = [];
    if (!/^[a-fA-F0-9]{6}$/.test(suffix)) {
      validationErrors.push({
        message: "Ingresa los últimos 6 caracteres válidos de la UUID.",
        field: "partialControllerId",
      });
    }

    if (!/^\d{6}$/.test(pin)) {
      validationErrors.push({
        message: "El PIN debe contener exactamente 6 dígitos.",
        field: "pin",
      });
    }

    if (validationErrors.length) {
      setLinkControllerError(
        normalizeFormError({ errors: validationErrors }),
      );
      return;
    }

    try {
      const response = await linkController(
        parseInt(selectedKiln.kilnId),
        suffix,
        pin,
      );

      if (response.success) {
        toast.success(
          `Controlador enlazado al horno #${selectedKiln.kilnId}.`,
        );
        fetchKilns();
        closeLinkControllerModal();
        return;
      }

      setLinkControllerError(normalizeFormError(response));
    } catch (error) {
      setLinkControllerError(normalizeFormError(error));
    }
  };

  const handleUnlinkController = async () => {
    if (!selectedKiln?.controllerId) {
      setLinkControllerError("El horno no tiene un controlador vinculado.");
      return;
    }

    try {
      const response = await unlinkController(selectedKiln.kilnId);

      if (response.success) {
        toast.success(
          `Controlador desvinculado del horno #${selectedKiln.kilnId}.`,
        );
        fetchKilns();
        closeLinkControllerModal();
        return;
      }

      setLinkControllerError(normalizeFormError(response));
    } catch (error) {
      setLinkControllerError(normalizeFormError(error));
    }
  };

  const handleKilnCommand = async (kiln) => {
    if (!kiln.controller) return;

    const command = kiln.controller.operativeStatus === "ON" ? "OFF" : "ON";
    setCommandLoadingId(String(kiln.kilnId));

    try {
      const response = await sendAdminControllerCommand(
        kiln.controller.controllerId,
        command,
      );

      if (response.success) {
        toast.success(`Comando ${command} enviado al horno ${kiln.kilnId}.`);
        return;
      }

      throw new Error(response.message || "Error al enviar comando");
    } catch (error) {
      toast.error("Error al enviar comando", { description: error.message });
    } finally {
      setCommandLoadingId("");
    }
  };

  const filteredUsersForLink = users
    .filter((user) => {
      if (user.userId === selectedKiln?.user?.userId) return false;
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

  const selectedKilnHasOwner = Boolean(selectedKiln?.user);
  const selectedKilnHasController = Boolean(selectedKiln?.controllerId);

  return (
    <div className="min-w-0 space-y-6 text-white">
      {/* Cabecera */}
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Hornos
          </h1>
          <p className="text-neutral-300 mt-1 text-sm">
            Gestión centralizada de todos los hornos de la plataforma.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="w-full rounded-lg bg-red-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 sm:w-auto"
        >
          Añadir Nuevo Horno
        </button>
      </div>

      {/* Cards de Resumen */}
      <div>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="rounded-xl border border-neutral-800 bg-[#141414] p-2.5 shadow-md sm:p-5">
            <p className="mb-1 text-[9px] font-bold uppercase leading-tight tracking-wide text-neutral-500 sm:text-xs sm:tracking-wider">
              Total Hornos
            </p>
            <p className="text-xl font-bold sm:text-3xl">{summary.total}</p>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-[#141414] p-2.5 shadow-md sm:p-5">
            <p className="mb-1 text-[9px] font-bold uppercase leading-tight tracking-wide text-neutral-500 sm:text-xs sm:tracking-wider">
              Sin Controlador
            </p>
            <p className="text-xl font-bold text-neutral-300 sm:text-3xl">
              {summary.withoutController}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-[#141414] p-2.5 shadow-md sm:p-5">
            <p className="mb-1 text-[9px] font-bold uppercase leading-tight tracking-wide text-neutral-500 sm:text-xs sm:tracking-wider">
              Sin Propietario
            </p>
            <p className="text-xl font-bold text-neutral-300 sm:text-3xl">
              {summary.withoutOwner}
            </p>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-[#141414] shadow-2xl">
        <div className="border-b border-neutral-800 p-4">
          <p className="mb-2 text-sm md:text-base text-neutral-400">
            Busca hornos por ID, propietario o ID del controlador vinculado.
          </p>
          <div className="relative w-full sm:w-96">
          {/* Icono de Lupa  */}
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
            placeholder="3, matias@argilla.cl, 123456..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#0a0a0a] border border-neutral-700 text-sm rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-white placeholder-neutral-500"
          />
          </div>
        </div>

      {/* Contenedor de la Tabla */}
        {summary.total > 0 || searchTerm ? (
          !loading && (
            <div className="overflow-auto">
            <table className="w-full text-left text-xs sm:min-w-190 sm:text-sm">
              {/* Títulos de Columna */}
              <thead className="sticky top-0 z-10 border-b border-neutral-800 bg-[#0a0a0a] text-xs uppercase tracking-wider text-neutral-500">
                <tr>
                  <th
                    scope="col"
                    className="px-3 py-3 font-medium sm:px-6 sm:py-4"
                  >
                    ID
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 font-medium sm:px-6 sm:py-4"
                  >
                    Propietario
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3 font-medium sm:table-cell sm:px-6 sm:py-4"
                  >
                    Controlador
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-center font-medium sm:px-6 sm:py-4"
                  >
                    Estado
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3 text-center font-medium md:table-cell sm:px-6 sm:py-4"
                  >
                    Litros
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3 text-center font-medium md:table-cell sm:px-6 sm:py-4"
                  >
                    Datos eléctricos
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-center font-medium sm:px-6 sm:py-4"
                  >
                    Acciones
                  </th>
                </tr>
              </thead>

              {/* Cuerpo de la Tabla */}
              <tbody className="divide-y divide-neutral-800/60">
                {kilns.length > 0 ? (
                  kilns.map((kiln) => (
                    <Fragment key={kiln.kilnId}>
                      <tr className="hover:bg-neutral-900/30 transition-colors">
                        {/* Columna ID */}
                        <td className="px-3 py-4 font-mono text-neutral-300 sm:px-6 sm:py-5 sm:text-base">
                          {kiln.kilnId}
                        </td>

                        {/* Columna Propietario */}
                        <td className="max-w-32 wrap-break-word px-3 py-4 sm:max-w-none sm:px-6 sm:py-5">
                          <div className="flex flex-col">
                            {kiln.user ? (
                              <>
                                <span className="font-semibold text-neutral-100 text-base">
                                  {kiln.user.name}
                                </span>
                                <span className="text-sm font-medium text-neutral-400 mt-0.5">
                                  {kiln.user.email}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm text-neutral-400/70 italic">
                                Sin propietario
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Columna ID Controlador */}
                        <td className="hidden px-3 py-4 text-sm sm:table-cell sm:px-6 sm:py-5">
                          {kiln.controllerId ? (
                            <span
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  kiln.controllerId,
                                );
                                toast.success("¡ID copiada!");
                              }}
                              title={"Copiar id: " + kiln.controllerId}
                              className="font-mono bg-neutral-800/60 px-2.5 py-1 rounded-md border border-neutral-700/60 text-red-400 truncate hover:underline"
                            >
                              ...{kiln.controllerId.slice(-6)}
                            </span>
                          ) : (
                            <span className="text-neutral-400/70 italic">
                              No vinculado
                            </span>
                          )}
                        </td>

                        {/* Columna Estado badge */}
                        <td className="px-3 py-4 text-center sm:px-6 sm:py-5">
                          <div className="flex flex-row justify-center items-center">
                            <KilnStatusBadge controller={kiln.controller} />
                          </div>
                        </td>

                        {/* Columna Litros */}
                        <td className="hidden px-3 py-4 text-center font-mono text-neutral-400 md:table-cell sm:px-6 sm:py-5 sm:text-base">
                          {kiln.liters}
                        </td>

                        {/* Columna Voltaje Amperaje */}
                        <td className="hidden px-3 py-4 text-center text-neutral-400 md:table-cell sm:px-6 sm:py-5">
                          <span className="font-mono">
                            {kiln.amps}A - {kiln.volts}V
                          </span>{" "}
                          <br />
                          <span className="text-neutral-400/70">
                            {kiln.phases === 1
                              ? "Monofásico"
                              : "Trifásico"}{" "}
                          </span>
                        </td>

                        {/* Botones de Acción */}
                        <td className="px-2 py-4 text-center text-base sm:px-6 sm:py-5 sm:text-lg">
                          <div className="flex justify-center gap-0.5 sm:gap-2">
                            <button
                              type="button"
                              disabled={
                                !kiln.controller ||
                                kiln.controller.connectionStatus !== "ONLINE" ||
                                commandLoadingId === String(kiln.kilnId)
                              }
                              onClick={() => handleKilnCommand(kiln)}
                              className={
                                "hidden rounded-lg p-1.5 text-neutral-400 transition-colors enabled:hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 sm:p-2 md:inline-flex " +
                                (kiln.controller?.operativeStatus === "ON"
                                  ? "enabled:hover:bg-red-400/10 enabled:hover:text-red-400"
                                  : "enabled:hover:bg-green-400/10 enabled:hover:text-green-400")
                              }
                              title={
                                !kiln.controller
                                  ? "Requiere controlador"
                                  : kiln.controller.operativeStatus === "ON"
                                    ? "Apagar horno"
                                    : "Encender horno"
                              }
                            >
                              <LuPower />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedKilnId((current) =>
                                  current === kiln.kilnId ? null : kiln.kilnId,
                                )
                              }
                              className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white md:hidden"
                              title={
                                expandedKilnId === kiln.kilnId
                                  ? "Ocultar detalles"
                                  : "Ver detalles"
                              }
                              aria-label={
                                expandedKilnId === kiln.kilnId
                                  ? `Ocultar detalles del horno ${kiln.kilnId}`
                                  : `Ver detalles del horno ${kiln.kilnId}`
                              }
                              aria-expanded={expandedKilnId === kiln.kilnId}
                            >
                              {expandedKilnId === kiln.kilnId ? (
                                <LuEyeOff />
                              ) : (
                                <LuEye />
                              )}
                            </button>
                            {/* Enlazar/Desenlazar usuario */}
                            <button
                              onClick={() => openLinkUserModal(kiln)}
                              className={
                                "hidden rounded-lg p-2 text-neutral-400 transition-colors hover:cursor-pointer md:inline-flex" +
                                (kiln.user
                                  ? " hover:text-red-400 hover:bg-red-400/10"
                                  : " hover:text-green-400 hover:bg-green-400/10")
                              }
                              title={
                                kiln.user
                                  ? "Desvincular usuario"
                                  : "Asignar usuario"
                              }
                            >
                              {kiln.user ? (
                                <LuUserRoundMinus />
                              ) : (
                                <LuUserRoundPlus />
                              )}
                            </button>

                            {/* Enlazar/Desenlazar controlador */}
                            <button
                              onClick={() => openLinkControllerModal(kiln)}
                              className={
                                "hidden rounded-lg p-2 text-neutral-400 transition-colors hover:cursor-pointer md:inline-flex" +
                                (kiln.controller
                                  ? " hover:text-red-400 hover:bg-red-400/10"
                                  : " hover:text-green-400 hover:bg-green-400/10")
                              }
                              title={
                                kiln.controller
                                  ? "Desvincular controlador"
                                  : "Asignar controlador"
                              }
                            >
                              {kiln.controller ? <LuUnlink /> : <LuLink />}
                            </button>

                            {/* Editar datos */}
                            <Link
                              to={`/admin/kilns/${kiln.kilnId}/history`}
                              className="hidden rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white sm:p-2 md:inline-flex"
                              title="Ver historial"
                              aria-label={`Ver historial del horno ${kiln.kilnId}`}
                            >
                              <LuHistory />
                            </Link>

                            {/* Editar datos */}
                            <button
                              onClick={() => openEditModal(kiln)}
                              className="hidden rounded-lg p-1.5 text-neutral-400 transition-colors hover:cursor-pointer hover:bg-neutral-800 hover:text-white sm:p-2 md:inline-flex"
                              title="Editar datos"
                            >
                              <LuPencil />
                            </button>

                            {/* Eliminar */}
                            <button
                              onClick={() => {
                                setSelectedKiln(kiln);
                                setIsAlertOpen(true);
                              }}
                              className="hidden rounded-lg p-1.5 text-neutral-400 transition-colors hover:cursor-pointer hover:bg-red-400/10 hover:text-red-400 sm:p-2 md:inline-flex"
                              title="Eliminar horno"
                            >
                              <LuTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedKilnId === kiln.kilnId && (
                        <tr className="bg-neutral-950/60 md:hidden">
                          <td colSpan="7" className="px-3 py-3">
                            <dl className="grid grid-cols-2 gap-x-3 gap-y-4 text-xs">
                              <div>
                                <dt className="font-bold text-neutral-400">
                                  Temperatura
                                </dt>
                                <dd className="mt-1 text-neutral-200">
                                  {kiln.controller?.temp == null
                                    ? "No disponible"
                                    : `${kiln.controller.temp.toFixed(1)} °C`}
                                </dd>
                              </div>
                              <div>
                                <dt className="font-bold text-neutral-400">
                                  Capacidad
                                </dt>
                                <dd className="mt-1 text-neutral-200">
                                  {kiln.liters} litros
                                </dd>
                              </div>
                              <div>
                                <dt className="font-bold text-neutral-400">
                                  Datos eléctricos
                                </dt>
                                <dd className="mt-1 text-neutral-200">
                                  <span className="font-mono">
                                    {kiln.amps}A / {kiln.volts}V{" "}
                                  </span>
                                  {kiln.phases === 1
                                    ? "Monofásico"
                                    : "Trifásico"}
                                </dd>
                              </div>
                              <div>
                                <dt className="font-bold text-neutral-400">
                                  Controlador
                                </dt>
                                <dd className="mt-1 break-all font-mono text-neutral-200">
                                  {kiln.controllerId
                                    ? `...${kiln.controllerId.slice(-6)}`
                                    : "No vinculado"}
                                </dd>
                              </div>
                            </dl>
                            <div className="mt-4 border-t border-neutral-800 pt-3">
                              <p className="mb-2 text-xs font-bold text-neutral-400">
                                Acciones
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-base">
                                <button
                                  type="button"
                                  disabled={
                                    !kiln.controller ||
                                    kiln.controller.connectionStatus !== "ONLINE" ||
                                    commandLoadingId === String(kiln.kilnId)
                                  }
                                  onClick={() => handleKilnCommand(kiln)}
                                  className={
                                    "inline-flex rounded-lg p-2 text-neutral-400 transition-colors enabled:hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 " +
                                    (kiln.controller?.operativeStatus === "ON"
                                      ? "enabled:hover:bg-red-400/10 enabled:hover:text-red-400"
                                      : "enabled:hover:bg-green-400/10 enabled:hover:text-green-400")
                                  }
                                  title={
                                    !kiln.controller
                                      ? "Requiere controlador"
                                      : kiln.controller.operativeStatus === "ON"
                                        ? "Apagar horno"
                                        : "Encender horno"
                                  }
                                >
                                  <LuPower />
                                </button>
                                <button
                                  onClick={() => openLinkUserModal(kiln)}
                                  className={
                                    "inline-flex rounded-lg p-2 text-neutral-400 transition-colors hover:cursor-pointer" +
                                    (kiln.user
                                      ? " hover:text-red-400 hover:bg-red-400/10"
                                      : " hover:text-green-400 hover:bg-green-400/10")
                                  }
                                  title={
                                    kiln.user
                                      ? "Desvincular usuario"
                                      : "Asignar usuario"
                                  }
                                >
                                  {kiln.user ? (
                                    <LuUserRoundMinus />
                                  ) : (
                                    <LuUserRoundPlus />
                                  )}
                                </button>
                                <button
                                  onClick={() => openLinkControllerModal(kiln)}
                                  className={
                                    "inline-flex rounded-lg p-2 text-neutral-400 transition-colors hover:cursor-pointer" +
                                    (kiln.controller
                                      ? " hover:text-red-400 hover:bg-red-400/10"
                                      : " hover:text-green-400 hover:bg-green-400/10")
                                  }
                                  title={
                                    kiln.controller
                                      ? "Desvincular controlador"
                                      : "Asignar controlador"
                                  }
                                >
                                  {kiln.controller ? <LuUnlink /> : <LuLink />}
                                </button>
                                <button
                                  onClick={() => openEditModal(kiln)}
                                  className="inline-flex rounded-lg p-2 text-neutral-400 transition-colors hover:cursor-pointer hover:bg-neutral-800 hover:text-white"
                                  title="Editar datos"
                                >
                                  <LuPencil />
                                </button>
                                <Link
                                  to={`/admin/kilns/${kiln.kilnId}/history`}
                                  className="inline-flex rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
                                  title="Ver historial"
                                  aria-label={`Ver historial del horno ${kiln.kilnId}`}
                                >
                                  <LuHistory />
                                </Link>
                                <button
                                  onClick={() => {
                                    setSelectedKiln(kiln);
                                    setIsAlertOpen(true);
                                  }}
                                  className="inline-flex rounded-lg p-2 text-neutral-400 transition-colors hover:cursor-pointer hover:bg-red-400/10 hover:text-red-400"
                                  title="Eliminar horno"
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
                      colSpan="8"
                      className="px-6 py-12 text-center text-neutral-500"
                    >
                      No se encontraron hornos que coincidan con la búsqueda "
                      {searchTerm}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          )
        ) : (
          <p className="text-neutral-300 text-sm/relaxed p-4 text-center">
            No hay hornos registrados. <br />
            Haz click en el botón{" "}
            <span className="rounded-lg font-medium">
              Añadir Nuevo horno
            </span>{" "}
            para registrar un horno.
          </p>
        )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={modalMode === "create" ? "Crear Nuevo Horno" : "Editar Horno"}
        fields={kilnFields}
        initialData={selectedKiln}
        submitLabel={modalMode === "create" ? "Crear Horno" : "Guardar Cambios"}
        onSubmit={handleCreateKiln}
        error={modalError}
        loading={loading}
        onClearError={setModalError}
      />

      <Modal
        isOpen={isLinkUserModalOpen}
        onClose={closeLinkUserModal}
        title={
          (selectedKilnHasOwner
            ? "Desvincular usuario de "
            : "Asignar usuario a ") +
          "Horno #" +
          selectedKiln?.kilnId
        }
        fields={linkUserFields}
        submitLabel={
          selectedKilnHasOwner ? "Desvincular usuario" : "Asignar usuario"
        }
        onSubmit={
          selectedKilnHasOwner ? handleUnlinkUser : handleLinkUserSubmit
        }
        error={linkUserError}
        loading={false}
        onClearError={setLinkUserError}
        renderContent={({ setFormData, onClearError, error }) => {
          return (
            <div className="flex flex-col gap-6">
              {!selectedKilnHasOwner && (
                <div className="flex flex-col gap-1.5">
                  <div className="relative" ref={linkUserSearchRef}>
                    <label className="text-sm font-medium text-neutral-400 ml-1">
                      Busca por nombre, correo electrónico o ID de usuario
                    </label>
                    <input
                      type="text"
                      name="userId"
                      value={linkUserSearchTerm}
                      placeholder="Juan, matias@argilla.cl, 3..."
                      onChange={(e) => {
                        const value = e.target.value;
                        setLinkUserSearchTerm(value);
                        setFormData((prev) => ({ ...prev, userId: "" }));

                        onClearError("userId");
                      }}
                      aria-invalid={hasFormError(error, "userId") || undefined}
                      aria-describedby={hasFormError(error, "userId") ? "kiln-user-error" : undefined}
                      className="mt-2 w-full bg-[#0a0a0a] border-2 border-neutral-700 rounded-lg px-3 py-2.5 text-white outline-none focus:border-red-600 transition-colors"
                    />
                    <FieldError error={error} field="userId" id="kiln-user-error" />

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
                              selectedKilnHasOwner &&
                              selectedKiln?.user?.userId === user.userId;

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
                </div>
              )}
              {!selectedKilnHasOwner && selectedKiln?.controller && (
                <p className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-300">
                  Si el controlador asociado está libre, también se vinculará a
                  este propietario.
                </p>
              )}
              {selectedKiln?.user && (
                <div className="flex flex-col gap-4">
                  <p className="text-neutral-300 text-pretty">
                    {selectedKiln?.controller
                      ? "El usuario será desvinculado del horno y del controlador asociado."
                      : "El usuario será desvinculado del horno."}
                  </p>

                  <div className="rounded-xl border border-neutral-500 bg-neutral-800 px-4 py-3 flex flex-row flex-wrap items-center justify-between">
                    <p className="text-sm text-neutral-300">
                      Propietario actual
                    </p>
                    <p className="text-base">
                      {selectedKiln?.user?.name} - {selectedKiln?.user?.email}
                    </p>
                  </div>
                </div>
              )}

              {!selectedKilnHasOwner && selectedUserToLink && (
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

      <Modal
        isOpen={isLinkControllerModalOpen}
        onClose={closeLinkControllerModal}
        title={
          selectedKilnHasController
            ? `Desvincular controlador ...${selectedKiln.controllerId.slice(-6)}`
            : "Enlazar Controlador"
        }
        fields={linkControllerFields}
        submitLabel={
          selectedKilnHasController
            ? "Desvincular controlador"
            : "Enlazar controlador"
        }
        onSubmit={
          selectedKilnHasController
            ? handleUnlinkController
            : handleLinkControllerSubmit
        }
        error={linkControllerError}
        loading={false}
        onClearError={setLinkControllerError}
        renderContent={({ formData, setFormData, onClearError, error }) => (
          <div className="space-y-6">
            {selectedKiln?.controllerId && (
              <p className="text-neutral-300 text-center">
                El controlador será desvinculado del horno.
              </p>
            )}

            {!selectedKilnHasController && (
              <div className="space-y-4">
                {selectedKiln?.user && (
                  <p className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-300">
                    Si el controlador está libre, también se vinculará al
                    propietario actual del horno.
                  </p>
                )}

                {linkControllerFields.map((field) => {
                  const errorField = field.name === "controllerSuffix" ? "partialControllerId" : "pin";
                  return (
                  <div key={field.name} className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-neutral-400 ml-1">
                      {field.label}
                    </label>

                    <input
                      type={field.type}
                      name={field.name}
                      placeholder={field.placeholder || ""}
                      value={formData[field.name] || ""}
                      onChange={(e) => {
                        const { name, value } = e.target;
                        setFormData((prev) => ({ ...prev, [name]: value }));

                        onClearError(errorField);
                      }}
                      aria-invalid={hasFormError(error, errorField) || undefined}
                      aria-describedby={hasFormError(error, errorField) ? `${field.name}-error` : undefined}
                      required={field.required !== false}
                      className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-red-500 transition-colors"
                      {...(field.inputProps || {})}
                    />
                    <FieldError error={error} field={errorField} id={`${field.name}-error`} />
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      />

      <AlertDialog
        isOpen={isAlertOpen}
        onClose={() => {
          setIsAlertOpen(false);
          setSelectedKiln(null);
        }}
        onConfirm={confirmDelete}
        title="¿Eliminar horno?"
        CustomMessage={() => (
          <p className="text-neutral-300">
            El horno{" "}
            <span className="font-bold">
              {selectedKiln?.kilnId} - "{selectedKiln?.name}"
            </span>{" "}
            será eliminado permanentemente
          </p>
        )}
        type="danger"
        confirmText="Eliminar horno"
        cancelText="Cancelar"
        isLoading={loading}
      />
    </div>
  );
}
