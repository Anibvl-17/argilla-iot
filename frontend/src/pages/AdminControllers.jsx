import { Fragment, useCallback, useEffect, useState } from "react";
import {
  LuCopy,
  LuEye,
  LuEyeOff,
  LuPencil,
  LuPlus,
  LuPower,
  LuTrash2,
} from "react-icons/lu";
import { toast } from "sonner";
import AlertDialog from "@components/AlertDialog";
import { Badge } from "@components/Badge";
import Modal from "@components/Modal";
import Pagination from "@components/Pagination";
import { useAuth } from "@context/AuthContext";
import { useControllerRealtime } from "@hooks/useControllerRealtime";
import {
  CONTROLLER_ACTIVITY_STYLES,
  getControllerActivityLabel,
  getControllerConnectionLabel,
  getFiringCommandLabel,
  getOperationalStatusLabel,
  getSwitchLabel,
  OPERATIONAL_STATUS_OPTIONS,
} from "@constants/controller.constants";
import {
  createController,
  deleteController,
  getAllControllers,
  sendAdminControllerCommand,
  updateController,
} from "@services/controller.service";
import { normalizeFormError } from "../utils/formError";
import { getPageAfterDeletion } from "../utils/pagination";

const PAGE_SIZE = 10;
const today = () => new Date().toISOString().slice(0, 10);

const controllerFields = [
  {
    name: "switchCurrentCapacity",
    label: "Capacidad del switch (A)",
    type: "number",
    placeholder: "20",
    inputProps: { min: 1, max: 500, step: 1 },
  },
  {
    name: "switchType",
    label: "Tipo de switch",
    type: "select",
    options: [
      { value: "CONTACTOR", label: "Contactor" },
      { value: "SSR", label: "SSR" },
    ],
  },
  { name: "manufacturedAt", label: "Fecha de fabricación", type: "date" },
  {
    name: "deliveredAt",
    label: "Fecha de entrega",
    type: "date",
    required: false,
  },
  {
    name: "firmwareVersion",
    label: "Versión de firmware",
    type: "text",
    placeholder: "1.0.0",
  },
  {
    name: "firmwareUpdatedAt",
    label: "Última actualización de firmware",
    type: "date",
    required: false,
  },
];

const defaultController = {
  switchCurrentCapacity: 20,
  switchType: "CONTACTOR",
  manufacturedAt: today(),
  deliveredAt: "",
  firmwareVersion: "1.0.0",
  firmwareUpdatedAt: "",
};

const connectionStyle = { ONLINE: "info", OFFLINE: "default" };
const operationalStyle = {
  OPERATIONAL: "success",
  MAINTENANCE: "warning",
  OUT_OF_SERVICE: "danger",
};

function CredentialDialog({ credential, onClose }) {
  if (!credential) return null;
  const copy = async (value, message) => {
    await navigator.clipboard.writeText(value);
    toast.success(message);
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-overlay p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border-2 border-border bg-surface shadow-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border bg-surface-muted px-6 py-4">
          <h3 className="text-xl font-bold">Controlador creado</h3>
        </div>
        <div className="space-y-5 p-6">
          <p className="rounded-lg border border-warning-border bg-warning-soft p-3 text-sm text-warning">
            Guarda la credencial del dispositivo ahora. El secreto no volverá a
            mostrarse.
          </p>
          {[
            ["Identificador", credential.controllerId],
            ["Secreto del dispositivo", credential.deviceSecret],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="mb-1 text-sm font-medium text-muted">{label}</p>
              <div className="flex items-center gap-2 rounded-lg border border-control-border bg-field p-3">
                <code className="min-w-0 flex-1 break-all text-xs">
                  {value}
                </code>
                <button
                  type="button"
                  onClick={() => copy(value, `${label} copiado.`)}
                  className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-content"
                  title={`Copiar ${label.toLowerCase()}`}
                >
                  <LuCopy />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-on-action hover:bg-primary-hover"
          >
            Ya guardé la credencial
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminControllers() {
  const { user } = useAuth();
  const isAdmin = user.role === "ADMIN";
  const [loading, setLoading] = useState(false);
  const [controllers, setControllers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [operationalStatusFilter, setOperationalStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({
    total: 0,
    linkedToKiln: 0,
    linkedToUser: 0,
    fullyLinked: 0,
  });
  const [modalMode, setModalMode] = useState("create");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [selectedController, setSelectedController] = useState(null);
  const [expandedControllerId, setExpandedControllerId] = useState(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [credential, setCredential] = useState(null);
  const [commandLoadingId, setCommandLoadingId] = useState("");

  const fetchControllers = useCallback(async () => {
    setLoading(true);
    const result = await getAllControllers({
      page,
      pageSize: PAGE_SIZE,
      search: searchTerm,
      operationalStatusFilter: operationalStatusFilter || undefined,
    });
    setLoading(false);
    if (!result.success) return toast.error(result.message);
    const payload = result.data || {};
    setControllers(payload.items || []);
    setTotalPages(payload.pagination?.totalPages || 1);
    setSummary((current) => ({ ...current, ...(payload.summary || {}) }));
  }, [operationalStatusFilter, page, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(fetchControllers, 200);
    return () => clearTimeout(timer);
  }, [fetchControllers]);

  useControllerRealtime(
    useCallback((telemetry) => {
      setControllers((current) =>
        current.map((controller) =>
          controller.controllerId === telemetry.controllerId
            ? { ...controller, ...telemetry }
            : controller,
        ),
      );
    }, []),
  );

  function openCreateModal() {
    setModalMode("create");
    setSelectedController(null);
    setModalError(null);
    setIsModalOpen(true);
  }

  function openEditModal(controller) {
    setModalMode("edit");
    setSelectedController({
      ...controller,
      manufacturedAt: controller.manufacturedAt?.slice(0, 10) || today(),
      deliveredAt: controller.deliveredAt?.slice(0, 10) || "",
      firmwareUpdatedAt: controller.firmwareUpdatedAt?.slice(0, 10) || "",
    });
    setModalError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setModalError(null);
    setSelectedController(null);
  }

  async function handleSubmit(formData) {
    setLoading(true);
    setModalError(null);
    const payload = {
      ...formData,
      switchCurrentCapacity: Number(formData.switchCurrentCapacity),
      deliveredAt: formData.deliveredAt || null,
      firmwareUpdatedAt: formData.firmwareUpdatedAt || null,
    };
    const result =
      modalMode === "create"
        ? await createController(payload)
        : await updateController(selectedController.controllerId, payload);
    setLoading(false);

    if (!result.success) {
      setModalError(normalizeFormError(result));
      return;
    }

    if (modalMode === "create")
      setCredential({
        controllerId: result.data.controllerId,
        deviceSecret: result.data.deviceSecret,
      });
    toast.success(
      modalMode === "create"
        ? "Controlador creado exitosamente."
        : "Controlador actualizado exitosamente.",
    );
    closeModal();
    await fetchControllers();
  }

  async function handleCommand(controller) {
    const command = controller.switchState ? "OFF" : "ON";
    setCommandLoadingId(controller.controllerId);
    const result = await sendAdminControllerCommand(
      controller.controllerId,
      command,
    );
    setCommandLoadingId("");
    if (!result.success) return toast.error(result.message);
    toast.success(command === "ON" ? "Quema iniciada." : "Quema detenida.");
  }

  async function confirmDelete() {
    setLoading(true);
    const result = await deleteController(selectedController.controllerId);
    setLoading(false);
    setIsAlertOpen(false);
    if (!result.success) return toast.error(result.message);
    const nextPage = getPageAfterDeletion({
      page,
      itemsOnPage: controllers.length,
    });
    toast.success("Controlador eliminado exitosamente.");
    setSelectedController(null);
    if (nextPage !== page) setPage(nextPage);
    else await fetchControllers();
  }

  function renderControllerActions(controller, withLabels = false) {
    const buttonClass = withLabels
      ? "inline-flex items-center justify-center gap-2 rounded-lg border border-control-border bg-surface px-3 py-2 text-sm text-secondary hover:bg-surface-hover"
      : "rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-content";

    return (
      <>
        <button type="button" onClick={() => openEditModal(controller)} className={buttonClass} title="Editar controlador"><LuPencil className="text-base" /> {withLabels && "Editar"}</button>
        {isAdmin && (
          <>
            <button type="button" disabled={!controller.kiln || controller.connectionStatus !== "ONLINE" || commandLoadingId === controller.controllerId} onClick={() => handleCommand(controller)} className={`${buttonClass} disabled:opacity-40`} title={getFiringCommandLabel(controller.switchState ? "OFF" : "ON")}><LuPower className="text-base" /> {withLabels && getFiringCommandLabel(controller.switchState ? "OFF" : "ON")}</button>
            <button type="button" onClick={() => { setSelectedController(controller); setIsAlertOpen(true); }} className={buttonClass} title="Eliminar controlador"><LuTrash2 className="text-base" /> {withLabels && "Eliminar"}</button>
          </>
        )}
      </>
    );
  }

  return (
    <div className="min-w-0 space-y-6 text-content">
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Controladores
          </h1>
          <p className="mt-1 text-sm text-secondary">
            Gestión centralizada de los controladores de la plataforma.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-on-action transition-colors hover:bg-primary-hover sm:w-auto"
        >
          <LuPlus /> Crear controlador
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {[
          ["Total controladores", summary.total],
          ["Sin horno", Math.max(0, summary.total - summary.linkedToKiln)],
          ["Sin propietario", Math.max(0, summary.total - summary.linkedToUser)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-surface p-3 shadow-card sm:p-5"
          >
            <p className="mb-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-muted sm:text-xs">
              {label}
            </p>
            <p className={`text-xl font-bold sm:text-3xl text-content`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-panel">
        <div className="border-b border-border p-4">
          <p className="mb-2 text-sm text-muted md:text-base">
            Busca por ID de controlador, propietario o ID de horno agregando el
            símbolo # al comienzo.
          </p>
          <div className="grid gap-3 sm:grid-cols-[minmax(16rem,24rem)_14rem]">
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
                placeholder="A1B2C3, Camila, #6..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-control-border bg-field py-2.5 pl-10 pr-4 text-sm outline-none focus:border-focus focus:ring-1 focus:ring-focus"
              />
            </div>
            <select
              aria-label="Filtrar por estado operacional"
              value={operationalStatusFilter}
              onChange={(event) => {
                setOperationalStatusFilter(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-control-border bg-field px-3 py-2.5 text-sm text-content outline-none focus:border-focus focus:ring-1 focus:ring-focus"
            >
              <option value="">Todos los estados</option>
              {OPERATIONAL_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-hidden">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-surface-muted text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="py-4 sm:px-6 text-center gap-2">
                  ID
                </th>
                <th className="hidden px-6 py-4 md:table-cell">Propietario / Horno</th>
                <th className="hidden px-6 py-4 text-center sm:table-cell">Temperatura</th>
                <th className="px-3 py-4 text-center sm:px-6">Conexión</th>
                <th className="hidden px-6 py-4 text-center lg:table-cell">Actividad</th>
                <th className="hidden px-6 py-4 text-center xl:table-cell">Estado</th>
                <th className="px-3 py-4 text-center sm:px-6">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!loading &&
                controllers.map((controller) => (
                  <Fragment key={controller.controllerId}>
                    <tr className="transition-colors hover:bg-surface-hover">
                      <td className="py-5 font-mono sm:px-6 text-accent text-center gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(controller.controllerId.slice(-6));
                            toast.success("¡ID copiada!");
                          }}
                          title="Copiar identificador del controlador"
                          className="text-sm hover:underline hover:cursor-pointer">
                          ...{controller.controllerCode}
                        </button>
                      </td>
                      <td className="hidden px-6 py-5 md:table-cell">
                        {controller.user ? <p>{controller.user.name}</p> : <p className="italic text-muted">Sin propietario</p>}
                        {controller.kiln ? <p className="mt-1 text-secondary">Horno #{controller.kiln.kilnId}</p> : <p className="mt-1 italic text-muted">Sin horno asociado</p>}
                      </td>
                      <td className="hidden px-6 py-5 text-center font-mono font-medium sm:table-cell">
                        {controller.temperature == null ? <span className="italic text-muted">No disponible</span> : `${controller.temperature.toFixed(1)} °C`}
                      </td>
                      <td className="px-3 py-5 sm:px-6">
                        <span className="flex justify-center">
                          <Badge
                            style={connectionStyle[controller.connectionStatus]}
                            text={getControllerConnectionLabel(
                              controller.connectionStatus,
                            )}
                          />
                        </span>
                      </td>
                      <td className="hidden px-6 py-5 lg:table-cell">
                        <span className="flex justify-center">
                          <Badge
                            style={CONTROLLER_ACTIVITY_STYLES[controller.activityStatus]}
                            text={getControllerActivityLabel(
                              controller.activityStatus,
                            )}
                          />
                        </span>
                      </td>
                      <td className="hidden px-6 py-5 xl:table-cell">
                        <span className="flex justify-center">
                          <Badge
                            style={
                              operationalStyle[controller.operationalStatus]
                            }
                            text={getOperationalStatusLabel(
                              controller.operationalStatus,
                            )}
                          />
                        </span>
                      </td>
                      <td className="px-3 py-5 sm:px-6">
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedControllerId(
                                expandedControllerId === controller.controllerId
                                  ? null
                                  : controller.controllerId,
                              )
                            }
                            className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-content"
                            title={
                              expandedControllerId === controller.controllerId
                                ? "Ocultar detalles"
                                : "Ver detalles"
                            }
                          >
                            {expandedControllerId ===
                            controller.controllerId ? (
                              <LuEyeOff className="text-base" />
                            ) : (
                              <LuEye className="text-base" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(controller)}
                            className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-content lg:hidden"
                            title="Editar controlador"
                          >
                            <LuPencil className="text-base" />
                          </button>
                          <div className="hidden justify-center gap-2 lg:flex">{renderControllerActions(controller)}</div>
                        </div>
                      </td>
                    </tr>
                    {expandedControllerId === controller.controllerId && (
                      <tr className="bg-surface-muted">
                        <td colSpan={7} className="px-6 py-5">
                          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                            <div className="md:hidden"><dt className="text-xs font-bold uppercase text-muted">Propietario</dt><dd className="mt-1">{controller.user?.name || <span className="italic text-muted">Sin propietario</span>}</dd></div>
                            <div className="md:hidden"><dt className="text-xs font-bold uppercase text-muted">Horno</dt><dd className="mt-1">{controller.kiln?.name || <span className="italic text-muted">Sin horno asociado</span>}</dd></div>
                            <div className="sm:hidden"><dt className="text-xs font-bold uppercase text-muted">Temperatura</dt><dd className="mt-1">{controller.temperature == null ? <span className="italic text-muted">No disponible</span> : `${controller.temperature.toFixed(1)} °C`}</dd></div>
                            <div className="xl:hidden"><dt className="text-xs font-bold uppercase text-muted">Estado operacional</dt><dd className="mt-1">{getOperationalStatusLabel(controller.operationalStatus)}</dd></div>
                            <div>
                              <dt className="text-xs font-bold uppercase text-muted">
                                Switch
                              </dt>
                              <dd className="mt-1">
                                {getSwitchLabel(controller.switchType)}{" "}
                                {controller.switchCurrentCapacity} A
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-bold uppercase text-muted">
                                Actividad
                              </dt>
                              <dd className="mt-1">
                                {getControllerActivityLabel(
                                  controller.activityStatus,
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-bold uppercase text-muted">
                                Firmware
                              </dt>
                              <dd className="mt-1">
                                {controller.firmwareVersion}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-bold uppercase text-muted">
                                Fabricación
                              </dt>
                              <dd className="mt-1">
                                {new Date(
                                  controller.manufacturedAt,
                                ).toLocaleDateString("es-CL")}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-bold uppercase text-muted">
                                Entrega
                              </dt>
                              <dd className="mt-1">
                                {controller.deliveredAt
                                  ? new Date(
                                      controller.deliveredAt,
                                    ).toLocaleDateString("es-CL")
                                  : <span className="italic text-muted">Pendiente</span>}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-bold uppercase text-muted">
                                Actualización de firmware
                              </dt>
                              <dd className="mt-1">
                                {controller.firmwareUpdatedAt
                                  ? new Date(
                                      controller.firmwareUpdatedAt,
                                    ).toLocaleDateString("es-CL")
                                  : <span className="italic text-muted">Sin registro</span>}
                              </dd>
                            </div>
                          </dl>
                          {isAdmin && (
                            <div className="mt-5 grid gap-2 border-t border-border pt-4 min-[480px]:grid-cols-2 lg:hidden">
                              <button
                                type="button"
                                disabled={
                                  !controller.kiln ||
                                  controller.connectionStatus !== "ONLINE" ||
                                  commandLoadingId === controller.controllerId
                                }
                                onClick={() => handleCommand(controller)}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-control-border bg-surface px-3 py-2.5 text-sm text-secondary hover:bg-surface-hover disabled:opacity-40"
                              >
                                <LuPower className="text-base" />
                                {getFiringCommandLabel(
                                  controller.switchState ? "OFF" : "ON",
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedController(controller);
                                  setIsAlertOpen(true);
                                }}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-danger-border bg-surface px-3 py-2.5 text-sm text-danger hover:bg-danger-soft"
                              >
                                <LuTrash2 className="text-base" /> Eliminar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              {!loading && controllers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted">
                    No se encontraron controladores.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted">
                    Cargando controladores...
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
        title={
          modalMode === "create" ? "Crear controlador" : "Editar controlador"
        }
        fields={controllerFields}
        initialData={
          modalMode === "create" ? defaultController : selectedController
        }
        submitLabel={
          modalMode === "create" ? "Crear controlador" : "Guardar cambios"
        }
        onSubmit={handleSubmit}
        error={modalError}
        loading={loading}
        onClearError={setModalError}
      />
      <CredentialDialog
        credential={credential}
        onClose={() => setCredential(null)}
      />
      <AlertDialog
        isOpen={isAlertOpen}
        onClose={() => {
          setIsAlertOpen(false);
          setSelectedController(null);
        }}
        onConfirm={confirmDelete}
        title="¿Eliminar controlador?"
        message={`El controlador terminado en ${selectedController?.controllerCode || "este código"} será eliminado permanentemente si no conserva información histórica.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isLoading={loading}
      />
    </div>
  );
}
