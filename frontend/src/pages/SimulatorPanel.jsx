import { useCallback, useEffect, useRef, useState } from "react";
import AlertDialog from "@components/AlertDialog";
import { Badge } from "@components/Badge";
import Modal from "@components/Modal";
import Pagination from "@components/Pagination";
import { useAuth } from "@context/AuthContext";
import {
  getControllerConnectionLabel,
  getControllerOperationLabel,
  SWITCH_LABELS,
} from "@constants/controller.constants";
import { useControllerRealtime } from "@hooks/useControllerRealtime";
import {
  clearControllerPin,
  createController,
  deleteController,
  getAccessibleControllers,
  generateControllerPin,
  sendAdminControllerCommand,
  updateController,
} from "@services/controller.service";
import {
  LuPlus,
  LuRefreshCcw,
  LuSearch,
  LuTriangleAlert,
  LuX,
} from "react-icons/lu";
import { toast } from "sonner";
import { normalizeFormError } from "../utils/formError";
import { getPageAfterDeletion } from "../utils/pagination";

const PAGE_SIZE = 6;

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

const normalizeControllerFormData = (formData) => ({
  ...formData,
  switchAmps: Number(formData.switchAmps),
});

export default function SimulatorPanel() {
  const { user } = useAuth();
  const isAdmin = user.role === "ADMIN";
  const [controllers, setControllers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [commandLoadingId, setCommandLoadingId] = useState("");
  const [pinLoadingId, setPinLoadingId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [modalError, setModalError] = useState(null);
  const [selectedController, setSelectedController] = useState(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [connectionFilter, setConnectionFilter] = useState("");
  const [operationFilter, setOperationFilter] = useState("");
  const [kilnFilter, setKilnFilter] = useState("");
  const controllerIdsRef = useRef(new Set());

  const fetchControllers = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    const result = await getAccessibleControllers({
      page,
      pageSize: PAGE_SIZE,
      search: searchTerm,
      connectionStatus: connectionFilter || undefined,
      operativeStatus:
        connectionFilter !== "OFFLINE"
          ? operationFilter || undefined
          : undefined,
      kilnStatus: kilnFilter || undefined,
    });

    if (result.success) {
      const payload = result.data || {};
      const nextControllers = payload.items || [];
      controllerIdsRef.current = new Set(
        nextControllers.map((controller) => controller.controllerId),
      );
      setControllers(nextControllers);
      setTotalPages(payload.pagination?.totalPages || 1);
      setTotalItems(payload.pagination?.total || 0);
    } else {
      setLoadError(
        result.message || "No se pudieron cargar los controladores.",
      );
    }

    setLoading(false);
  }, [connectionFilter, kilnFilter, operationFilter, page, searchTerm]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchControllers();
  }, [fetchControllers]);

  const handleTelemetry = useCallback((telemetry) => {
    setControllers((current) =>
      current.map((controller) =>
        controller.controllerId === telemetry.controllerId
          ? { ...controller, ...telemetry, lastUpdate: new Date() }
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

  const closeModal = () => {
    setIsModalOpen(false);
    setModalError(null);
    setSelectedController(null);
  };

  const handleSubmitController = async (formData) => {
    setActionLoading(true);
    setModalError(null);

    const data = normalizeControllerFormData(formData);
    const response =
      modalMode === "create"
        ? await createController(data)
        : await updateController(selectedController.controllerId, data);

    if (response.success) {
      toast.success(
        modalMode === "create"
          ? "Controlador creado exitosamente."
          : "Controlador actualizado exitosamente.",
      );
      closeModal();
      await fetchControllers();
    } else {
      setModalError(normalizeFormError(response));
    }

    setActionLoading(false);
  };

  const confirmDelete = async () => {
    if (!selectedController) return;

    setActionLoading(true);
    const response = await deleteController(selectedController.controllerId);

    if (response.success) {
      const nextPage = getPageAfterDeletion({
        page,
        itemsOnPage: controllers.length,
      });
      toast.success("Controlador eliminado exitosamente.");
      setIsAlertOpen(false);
      setSelectedController(null);
      if (nextPage !== page) {
        setPage(nextPage);
      } else {
        await fetchControllers();
      }
    } else {
      toast.error("Error al eliminar controlador", {
        description: response.message,
      });
    }

    setActionLoading(false);
  };

  const handleToggleController = async (controller) => {
    if (
      controller.connectionStatus !== "ONLINE" ||
      !controller.kiln ||
      commandLoadingId
    )
      return;

    const command = controller.operativeStatus === "ON" ? "OFF" : "ON";
    setCommandLoadingId(controller.controllerId);

    const response = await sendAdminControllerCommand(
      controller.controllerId,
      command,
    );

    if (response.success) {
      toast.success(
        `Comando "${getControllerOperationLabel(command)}" enviado.`,
      );
      setControllers((current) =>
        current.map((item) =>
          item.controllerId === controller.controllerId
            ? { ...item, operativeStatus: command }
            : item,
        ),
      );
    } else {
      toast.error("Error al enviar comando", {
        description: response.message,
      });
    }

    setCommandLoadingId("");
  };

  const handleGeneratePin = async (controller) => {
    if (controller.connectionStatus !== "ONLINE" || pinLoadingId) return;

    setPinLoadingId(controller.controllerId);
    const response = await generateControllerPin(controller.controllerId);

    if (response.success) {
      toast.success("PIN generado exitosamente.");
      setControllers((current) =>
        current.map((item) =>
          item.controllerId === controller.controllerId
            ? { ...item, pin: response.data?.pin ?? item.pin }
            : item,
        ),
      );
    } else {
      toast.error("Error al generar PIN", {
        description: response.message,
      });
    }

    setPinLoadingId("");
  };

  const handleClearPin = async (controller) => {
    if (pinLoadingId) return;

    setPinLoadingId(controller.controllerId);
    const response = await clearControllerPin(controller.controllerId);

    if (response.success) {
      toast.success("PIN eliminado exitosamente.");
      setControllers((current) =>
        current.map((item) =>
          item.controllerId === controller.controllerId
            ? { ...item, pin: null }
            : item,
        ),
      );
    } else {
      toast.error("Error al eliminar PIN", {
        description: response.message,
      });
    }

    setPinLoadingId("");
  };

  const openDeleteAlert = (controller) => {
    setSelectedController(controller);
    setIsAlertOpen(true);
  };

  const hasActiveFilters = Boolean(
    searchTerm || connectionFilter || operationFilter || kilnFilter,
  );

  return (
    <div className="min-w-0 space-y-6 text-content">
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Controladores en tiempo real
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-secondary">
            {isAdmin
              ? "Simula todos los controladores registrados."
              : "Simula tus controladores."}
          </p>
        </div>

        <div className="flex flex-col gap-2 min-[420px]:flex-row sm:shrink-0">
          <button
            type="button"
            onClick={fetchControllers}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-control-border bg-surface-muted px-4 py-2.5 text-sm font-medium text-content transition-colors enabled:hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LuRefreshCcw className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-on-action transition-colors hover:bg-primary-hover"
            >
              <LuPlus />
              Nuevo controlador
            </button>
          )}
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <p className="flex flex-row items-center justify-between flex-wrap mb-3 text-sm md:text-base text-muted">
          Busca por ID y filtra por conexión, operación o vínculo con horno.
          <span className="text-xs md:text-sm">
            {totalItems} controladores encontrados
          </span>
        </p>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <label className="relative sm:col-span-2 xl:col-span-1">
            <span className="sr-only">Buscar controlador</span>
            <LuSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={searchTerm}
              maxLength={6}
              placeholder="Últimos 6 caracteres"
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-control-border bg-field py-2.5 pl-10 pr-3 text-sm text-content outline-none transition-colors placeholder:text-muted focus:border-focus"
            />
          </label>
          <FilterSelect
            label="Conexión"
            value={connectionFilter}
            onChange={(value) => {
              setConnectionFilter(value);
              if (value === "OFFLINE") setOperationFilter("");
              setPage(1);
            }}
            options={[
              ["ONLINE", "Conectado"],
              ["OFFLINE", "Desconectado"],
            ]}
          />
          {connectionFilter !== "OFFLINE" && (
            <FilterSelect
              label="Operación"
              value={operationFilter}
              onChange={(value) => {
                setOperationFilter(value);
                if (value) setConnectionFilter("ONLINE");
                setPage(1);
              }}
              options={[
                ["ON", "Encendido"],
                ["OFF", "Apagado"],
              ]}
            />
          )}
          <FilterSelect
            label="Horno"
            value={kilnFilter}
            onChange={(value) => {
              setKilnFilter(value);
              setPage(1);
            }}
            options={[
              ["linked", "Vinculado"],
              ["unlinked", "Sin vincular"],
            ]}
          />
        </div>
      </section>

      {loading ? (
        <LoadingState />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={fetchControllers} />
      ) : totalItems === 0 ? (
        hasActiveFilters ? (
          <FilteredEmptyState />
        ) : (
          <EmptyState isAdmin={isAdmin} onCreate={openCreateModal} />
        )
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {controllers.map((controller) => (
              <ControllerCard
                key={controller.controllerId}
                controller={controller}
                isAdmin={isAdmin}
                pending={commandLoadingId === controller.controllerId}
                pinPending={pinLoadingId === controller.controllerId}
                onToggle={() => handleToggleController(controller)}
                onGeneratePin={() => handleGeneratePin(controller)}
                onClearPin={() => handleClearPin(controller)}
                onEdit={() => openEditModal(controller)}
                onDelete={() => openDeleteAlert(controller)}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {isAdmin && (
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
          loading={actionLoading}
          onClearError={setModalError}
        />
      )}

      {isAdmin && (
        <AlertDialog
          isOpen={isAlertOpen}
          onClose={() => {
            setIsAlertOpen(false);
            setSelectedController(null);
          }}
          onConfirm={confirmDelete}
          title="¿Eliminar controlador?"
          CustomMessage={() => (
            <p className="text-secondary">
              El controlador{" "}
              <span
                title={selectedController?.controllerId}
                className="font-mono font-bold"
              >
                ...{selectedController?.controllerId?.slice(-6)}
              </span>{" "}
              será eliminado permanentemente.
            </p>
          )}
          type="danger"
          confirmText="Eliminar controlador"
          cancelText="Cancelar"
          isLoading={actionLoading}
        />
      )}
    </div>
  );
}

function ControllerCard({
  controller,
  isAdmin,
  pending,
  pinPending,
  onToggle,
  onGeneratePin,
  onClearPin,
  onEdit,
  onDelete,
}) {
  const online = controller.connectionStatus === "ONLINE";
  const on = controller.operativeStatus === "ON" && online;
  const hasKiln = Boolean(controller.kiln);
  const canOperate = online && hasKiln && !pending;

  return (
    <article className="relative min-w-0 overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-panel sm:p-5">
      <div
        className={`absolute inset-x-0 top-0 h-0.5 ${
          on
            ? "bg-success"
            : online && canOperate
              ? "bg-info"
              : "bg-surface-hover"
        }`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            title={controller.controllerId}
            className="truncate font-mono text-sm font-bold text-accent"
          >
            ...{controller.controllerId.slice(-6)}
          </p>
          {hasKiln ? (
            <p className="mt-1 text-xs font-bold text-muted">
              Vinculado a horno
            </p>
          ) : (
            <p className="mt-1 text-xs font-bold text-muted flex flex-row items-center justify-start gap-2">
              <LuTriangleAlert className="text-warning text-base" /> No
              vinculado a horno
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          <Badge
            style={online ? "info" : "default"}
            text={getControllerConnectionLabel(controller.connectionStatus)}
          />
          {online && (
            <Badge
              style={on ? "success" : "default"}
              text={getControllerOperationLabel(controller.operativeStatus)}
            />
          )}
        </div>
      </div>

      <div className="mt-5 flex items-end justify-center gap-3">
        <div className="min-w-0">
          <div className="flex items-end gap-1.5">
            <span className="font-mono text-4xl font-bold leading-none tracking-tight sm:text-4xl">
              {controller.temp != null && online && hasKiln
                ? controller.temp.toFixed(1)
                : "--"}
            </span>
            <span className="pb-1 font-mono text-sm text-muted">°C</span>
          </div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface-muted p-3 text-xs">
        <InfoItem label="Switch">
          {SWITCH_LABELS[controller.switchType]}{" "}
          <span className="font-mono">{controller.switchAmps}A</span>
        </InfoItem>
        <InfoItem label="PIN">
          {controller.pin ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="font-mono">{controller.pin}</span>
              {online && (
                <button
                  type="button"
                  onClick={onClearPin}
                  disabled={pinPending}
                  className="hover:cursor-pointer inline-flex rounded-full p-1 text-muted transition-colors enabled:hover:bg-danger-soft enabled:hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                  title="Eliminar PIN"
                  aria-label={`Eliminar PIN del controlador ${controller.controllerId}`}
                >
                  <LuX className="text-sm" />
                </button>
              )}
            </span>
          ) : (
            <span className="font-mono">Inactivo</span>
          )}
        </InfoItem>
        <InfoItem label="Horno">
          {controller.kiln ? `#${controller.kiln.kilnId}` : "Sin horno"}
        </InfoItem>
        <InfoItem label="Propietario">
          {controller.user ? controller.user.name : "Sin propietario"}
        </InfoItem>
      </dl>

      {(online || isAdmin) && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs text-center font-bold text-muted pb-1">
            Acciones
          </p>

          {online && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onToggle}
                disabled={!canOperate}
                className={
                  "inline-flex justify-center items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:bg-surface-hover disabled:text-disabled disabled:cursor-not-allowed disabled:opacity-50 hover:cursor-pointer " +
                  (on
                    ? "bg-danger-soft text-danger enabled:hover:bg-danger-soft enabled:hover:brightness-95 "
                    : "bg-success-soft text-success enabled:hover:bg-success-soft enabled:hover:brightness-95 ") +
                  (!hasKiln ? "col-span-1" : "col-span-2")
                }
              >
                {pending ? "Enviando..." : on ? "Apagar" : "Encender"}
              </button>

              {!hasKiln && (
                <button
                  type="button"
                  onClick={onGeneratePin}
                  disabled={pinPending}
                  className="inline-flex justify-center items-center gap-1.5 rounded-lg bg-surface-hover px-3 py-2 text-xs font-medium text-secondary transition-colors enabled:hover:bg-info-soft enabled:hover:text-info disabled:cursor-not-allowed disabled:opacity-50 hover:cursor-pointer"
                  title="Generar PIN"
                >
                  {pinPending ? "Generando..." : "Generar PIN"}
                </button>
              )}
            </div>
          )}

          {isAdmin && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-surface-hover px-3 py-2 text-xs font-medium text-secondary transition-colors hover:bg-info-soft hover:text-info hover:cursor-pointer"
                title="Editar controlador"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-surface-hover px-3 py-2 text-xs font-medium text-secondary transition-colors hover:bg-danger-soft hover:text-accent hover:cursor-pointer"
                title="Eliminar controlador"
              >
                Eliminar
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function InfoItem({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="font-bold text-muted">{label}</dt>
      <dd className="mt-1 wrap-break-word text-content">{children}</dd>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-control-border bg-field px-3 py-2.5 text-sm text-content outline-none transition-colors focus:border-focus"
      >
        <option value="">{label}: Todos</option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-72 animate-pulse rounded-2xl border border-border bg-surface"
        />
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-danger-border bg-danger-soft p-6 text-center">
      <p className="text-sm text-danger">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-action transition-colors hover:bg-primary-hover"
      >
        <LuRefreshCcw />
        Reintentar
      </button>
    </div>
  );
}

function EmptyState({ isAdmin, onCreate }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 text-center sm:p-10">
      <p className="text-lg font-semibold text-content">
        No hay controladores para mostrar
      </p>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
        {isAdmin
          ? "Crea un controlador para comenzar a monitorearlo desde el simulador."
          : "Cuando tengas controladores asociados a tu cuenta aparecerán aquí automáticamente."}
      </p>
      {isAdmin && (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-on-action transition-colors hover:bg-primary-hover"
        >
          <LuPlus />
          Crear controlador
        </button>
      )}
    </div>
  );
}

function FilteredEmptyState() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-8 text-center">
      <p className="font-semibold text-content">No hay coincidencias</p>
      <p className="mt-2 text-sm text-muted">
        Ajusta la búsqueda o los filtros para ver otros controladores.
      </p>
    </div>
  );
}
