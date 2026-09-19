import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  LuArrowLeft,
  LuChevronDown,
  LuCircuitBoard,
  LuCopy,
  LuFlame,
  LuSearch,
  LuWrench,
} from "react-icons/lu";
import { toast } from "sonner";
import { useAuth } from "@context/AuthContext";
import FloatingDropdown from "@components/FloatingDropdown";
import Pagination from "@components/Pagination";
import {
  assignSupportTicket,
  claimSupportTicket,
  createTicketMaintenance,
  getSupportAssignees,
  getSupportDiagnostics,
  getSupportTelemetry,
  getSupportTicket,
  updateTicketMaintenance,
  updateSupportTicketStatus,
} from "@services/support.service";
import {
  FIRING_CYCLE_EXECUTION_TYPE_LABELS,
  FIRING_CYCLE_STATUS_LABELS,
  MAINTENANCE_TYPE_LABELS,
} from "@constants/support.constants";
import {
  getControllerConnectionLabel,
  getOperationalStatusLabel,
  getPhaseCountLabel,
} from "@constants/controller.constants";
import { ROLES, ROLE_LABELS } from "@constants/user.constants";

const inputClass =
  "w-full rounded-lg border-2 border-control-border bg-field px-3 py-2 text-sm text-content outline-none focus:border-focus";

function Detail({ label, value, copyValue }) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted p-3">
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 flex items-center gap-2 wrap-break-word text-sm font-medium">
        <span>{value ?? "No disponible"}</span>
        {copyValue && (
          <button
            type="button"
            title="Copiar ID"
            aria-label="Copiar ID del controlador"
            onClick={() => {
              navigator.clipboard.writeText(copyValue);
              toast.success("¡ID copiada!");
            }}
            className="shrink-0 text-muted transition-colors hover:cursor-pointer hover:text-accent"
          >
            <LuCopy />
          </button>
        )}
      </dd>
    </div>
  );
}

function normalizeSearch(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function AssigneeSearch({ assignees, value, onSelect }) {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = assignees.find((assignee) => assignee.userId === value);
  const filteredAssignees = useMemo(() => {
    const query = normalizeSearch(search);
    if (!query) return assignees;
    return assignees.filter((assignee) =>
      normalizeSearch(assignee.name).includes(query),
    );
  }, [assignees, search]);

  function selectAssignee(userId) {
    setOpen(false);
    setSearch("");
    onSelect(userId);
  }

  return (
    <div ref={anchorRef} className="w-full max-w-md">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`${inputClass} flex items-center justify-between gap-3 text-left`}
        aria-label="Asignar responsable"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          className={selected ? "truncate" : "truncate italic text-muted"}
        >
          {selected?.name || "Sin asignar"}
        </span>
        <LuChevronDown className="shrink-0 text-muted" />
      </button>
      <FloatingDropdown
        anchorRef={anchorRef}
        open={open}
        onRequestClose={() => setOpen(false)}
        minWidth={300}
        maxHeight={320}
      >
        <div className="relative border-b border-border bg-surface-muted p-2">
          <LuSearch className="pointer-events-none absolute left-5 top-5 text-muted" />
          <input
            autoFocus
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar técnico por nombre"
            aria-label="Buscar técnico por nombre"
            className={`${inputClass} pl-10`}
          />
        </div>
        <div
          role="listbox"
          aria-label="Responsables disponibles"
          className="max-h-60 overflow-y-auto p-1"
        >
          {filteredAssignees.length ? (
            filteredAssignees.map((assignee) => (
              <button
                key={assignee.userId}
                type="button"
                role="option"
                aria-selected={assignee.userId === value}
                onClick={() => selectAssignee(assignee.userId)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover ${assignee.userId === value ? "bg-surface-hover" : ""}`}
              >
                <span className="truncate">{assignee.name}</span>
                <span className="shrink-0 text-xs text-muted">
                  {ROLE_LABELS[assignee.role] || "Sin rol"}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-6 text-center text-sm text-muted">
              No encontramos responsables con ese nombre.
            </p>
          )}
        </div>
      </FloatingDropdown>
    </div>
  );
}

function Diagnostics({ data, onCycleOpen }) {
  if (!data)
    return (
      <div className="rounded-xl border border-border p-5 text-muted">
        Cargando información técnica...
      </div>
    );
  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <LuFlame className="text-accent" /> Ficha del horno
        </h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Horno" value={`${data.name} (#${data.kilnId})`} />
          <Detail label="Capacidad" value={`${data.liters} L`} />
          <Detail
            label="Eléctrico"
            value={`${data.nominalVoltage} V - ${data.nominalCurrent} A - ${getPhaseCountLabel(data.phaseCount)}`}
          />
          <Detail
            label="Estado"
            value={getOperationalStatusLabel(data.operationalStatus)}
          />
        </dl>
        <h3 className="mt-5 flex items-center gap-2 font-semibold">
          <LuCircuitBoard className="text-accent" /> Controlador actual
        </h3>
        {data.controller ? (
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Detail
              label="Identificador"
              value={`...${data.controller.controllerCode}`}
              copyValue={data.controller.controllerCode}
            />
            <Detail
              label="Conexión"
              value={getControllerConnectionLabel(
                data.controller.connectionStatus,
              )}
            />
            <Detail
              label="Temperatura"
              value={
                data.controller.temperature == null
                  ? "No disponible"
                  : `${data.controller.temperature.toFixed(1)} °C`
              }
            />
            <Detail label="Firmware" value={data.controller.firmwareVersion} />
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted">
            El horno no tiene un controlador vinculado actualmente.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <h2 className="font-semibold">Ciclos recientes</h2>
        {data.firingCycles.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-180 text-left text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr>
                  <th className="py-2">Inicio</th>
                  <th>Fin</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Objetivo</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.firingCycles.map((cycle) => (
                  <tr key={cycle.firingCycleId}>
                    <td className="py-3">
                      {new Date(cycle.startedAt).toLocaleString("es-CL")}
                    </td>
                    <td>
                      {cycle.endedAt
                        ? new Date(cycle.endedAt).toLocaleString("es-CL")
                        : "—"}
                    </td>
                    <td>
                      {FIRING_CYCLE_EXECUTION_TYPE_LABELS[
                        cycle.executionType
                      ] || "No disponible"}
                    </td>
                    <td>
                      {FIRING_CYCLE_STATUS_LABELS[cycle.status] ||
                        "No disponible"}
                    </td>
                    <td>
                      {cycle.targetTemperature == null
                        ? "—"
                        : `${cycle.targetTemperature} °C`}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => onCycleOpen(cycle)}
                        className="rounded-lg border border-control-border px-3 py-2 text-xs font-medium hover:bg-surface-hover"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-muted">
            Sin ciclos registrados.
          </p>
        )}
      </div>
    </section>
  );
}

function CycleTelemetryModal({ ticketId, cycle, onClose, unavailable }) {
  const [telemetry, setTelemetry] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadPage = useCallback(
    async (page = 1) => {
      if (!cycle) return;
      setLoading(true);
      const result = await getSupportTelemetry(
        ticketId,
        cycle.firingCycleId,
        page,
        10,
      );
      setLoading(false);
      if (!result.success) {
        if ([403, 404].includes(result.status))
          return unavailable(result.message);
        setError(result.message);
        return;
      }
      setTelemetry(result.data.items || []);
      setPagination(result.data.pagination);
      setError("");
    },
    [cycle, ticketId, unavailable],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPage(1);
  }, [loadPage]);

  if (!cycle) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-3 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      role="presentation"
    >
      <section
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border-2 border-border bg-surface shadow-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cycle-telemetry-title"
      >
        <header className="flex items-center justify-between border-b border-border bg-surface-muted px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <h2
              id="cycle-telemetry-title"
              className="text-lg font-bold sm:text-xl"
            >
              Telemetría del ciclo #{cycle.firingCycleId}
            </h2>
            <p className="mt-1 text-xs text-muted">
              Iniciado {new Date(cycle.startedAt).toLocaleString("es-CL")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="rounded-md p-2 text-muted hover:bg-surface-hover hover:text-content"
          >
            ✕
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
          {error ? (
            <div className="rounded-xl border border-danger-border bg-danger-soft p-4 text-danger">
              {error}
            </div>
          ) : loading ? (
            <div className="py-16 text-center text-muted">
              Cargando telemetría...
            </div>
          ) : (
            <table className="w-full min-w-180 text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted">
                <tr>
                  <th className="py-3">Fecha</th>
                  <th>Temperatura</th>
                  <th>Temperatura objetivo</th>
                  <th>Voltaje</th>
                  <th>Corriente</th>
                  <th>Estado del relé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {telemetry.length ? (
                  telemetry.map((item) => (
                    <tr key={item.telemetryId}>
                      <td className="py-3">
                        {new Date(item.timestamp).toLocaleString("es-CL")}
                      </td>
                      <td>{item.temperature.toFixed(1)} °C</td>
                      <td>{item.setpointTemperature.toFixed(1)} °C</td>
                      <td>{item.voltage} V</td>
                      <td>{item.current} A</td>
                      <td>{item.switchState ? "Activo" : "Inactivo"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-muted">
                      Este ciclo no tiene registros de telemetría.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <div className="border-t border-border">
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={loadPage}
          />
        </div>
      </section>
    </div>
  );
}

function MaintenanceModal({
  ticketId,
  diagnostics,
  record,
  open,
  onClose,
  onSaved,
}) {
  const isEditing = Boolean(record);
  const [form, setForm] = useState({
    type: record?.type || "INSPECTION",
    title: record?.title || "",
    workPerformed: record?.workPerformed || "",
    performedAt: record?.performedAt
      ? new Date(record.performedAt).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    kiln: record ? Boolean(record.kilnId) : true,
    controller: Boolean(record?.controllerId),
  });
  const [saving, setSaving] = useState(false);
  const update = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  async function submit(event) {
    event.preventDefault();
    if (!form.kiln && !form.controller)
      return toast.error("Selecciona al menos un equipo.");
    setSaving(true);
    const data = {
      type: form.type,
      title: form.title,
      workPerformed: form.workPerformed,
      performedAt: new Date(form.performedAt).toISOString(),
      ...(form.kiln ? { kilnId: diagnostics.kilnId } : {}),
      ...(form.controller
        ? { controllerId: diagnostics.controller?.controllerId }
        : {}),
    };
    const result = isEditing
      ? await updateTicketMaintenance(ticketId, record.maintenanceId, data)
      : await createTicketMaintenance(ticketId, data);
    setSaving(false);
    if (!result.success) return toast.error(result.message);
    toast.success(
      isEditing ? "Mantenimiento actualizado." : "Mantenimiento registrado.",
    );
    await onSaved();
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-3 backdrop-blur-sm"
      onMouseDown={(event) =>
        event.target === event.currentTarget && !saving && onClose()
      }
      role="presentation"
    >
      <section
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border-2 border-border bg-surface shadow-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="maintenance-modal-title"
      >
        <header className="flex items-center justify-between border-b border-border bg-surface-muted px-4 py-3 sm:px-6 sm:py-4">
          <h2
            id="maintenance-modal-title"
            className="flex items-center gap-2 text-lg font-bold sm:text-xl"
          >
            <LuWrench className="text-accent" />
            {isEditing ? "Editar mantenimiento" : "Registrar mantenimiento"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label={
              isEditing
                ? "Cerrar edición de mantenimiento"
                : "Cerrar registro de mantenimiento"
            }
            className="rounded-md p-2 text-muted hover:bg-surface-hover hover:text-content disabled:opacity-50"
          >
            ✕
          </button>
        </header>
        <form
          onSubmit={submit}
          className="min-h-0 space-y-4 overflow-y-auto p-4 sm:p-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-secondary">
              Tipo de mantenimiento
              <select
                name="type"
                value={form.type}
                onChange={update}
                className={`${inputClass} mt-2`}
              >
                {Object.entries(MAINTENANCE_TYPE_LABELS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="text-sm font-medium text-secondary">
              Fecha y hora
              <input
                required
                type="datetime-local"
                name="performedAt"
                value={form.performedAt}
                onChange={update}
                className={`${inputClass} mt-2`}
              />
            </label>
          </div>
          <fieldset>
            <legend className="text-sm font-medium text-secondary">
              Equipos intervenidos
            </legend>
            <div className="mt-2 flex flex-wrap gap-5 text-sm">
              <label>
                <input
                  type="checkbox"
                  checked={form.kiln}
                  onChange={(event) =>
                    setForm({ ...form, kiln: event.target.checked })
                  }
                />
                <span className="ml-2">Horno</span>
              </label>
              <label
                className={!diagnostics.controller ? "text-disabled" : ""}
              >
                <input
                  type="checkbox"
                  disabled={!diagnostics.controller}
                  checked={form.controller}
                  onChange={(event) =>
                    setForm({ ...form, controller: event.target.checked })
                  }
                />
                <span className="ml-2">Controlador</span>
              </label>
            </div>
          </fieldset>
          <label className="block text-sm font-medium text-secondary">
            Título de la intervención
            <input
              required
              minLength="3"
              maxLength="150"
              name="title"
              value={form.title}
              onChange={update}
              className={`${inputClass} mt-2`}
              placeholder="Título de la intervención"
            />
          </label>
          <label className="block text-sm font-medium text-secondary">
            Trabajo realizado
            <textarea
              required
              minLength="3"
              maxLength="5000"
              rows="4"
              name="workPerformed"
              value={form.workPerformed}
              onChange={update}
              className={`${inputClass} mt-2`}
              placeholder="Describe el trabajo realizado"
            />
          </label>
          <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-control-border px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-action disabled:opacity-50"
            >
              {saving
                ? "Guardando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Registrar mantenimiento"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function MaintenanceRecords({ records, currentUserId, onRegister, onEdit }) {
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  function toggleWork(maintenanceId) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(maintenanceId)) next.delete(maintenanceId);
      else next.add(maintenanceId);
      return next;
    });
  }

  return (
    <div className="border-t border-border pt-5">
      <div className="min-w-0">
        <h3 className="font-semibold">Mantenimientos</h3>
        <div className="mt-3 min-w-0">
          {records?.length ? (
            <div className="divide-y divide-border">
              {records.map((record) => (
                <article
                  key={record.maintenanceId}
                  className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <strong>{record.title}</strong>
                    <p className="mt-1 text-sm text-secondary">
                      {MAINTENANCE_TYPE_LABELS[record.type]} -{" "}
                      {record.performedByUser.name}
                    </p>
                    <p className="mt-2 text-xs text-muted">
                      {new Date(record.performedAt).toLocaleString("es-CL")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:col-start-2 sm:row-start-1 sm:self-center sm:justify-end">
                    <button
                      type="button"
                      aria-expanded={expandedIds.has(record.maintenanceId)}
                      aria-controls={`maintenance-work-${record.maintenanceId}`}
                      onClick={() => toggleWork(record.maintenanceId)}
                      className="rounded-lg border border-control-border px-3 py-1.5 text-xs font-medium hover:bg-surface-hover"
                    >
                      {expandedIds.has(record.maintenanceId)
                        ? "Ocultar trabajo"
                        : "Ver trabajo"}
                    </button>
                    {String(
                      record.performedByUserId ??
                        record.performedByUser?.userId,
                    ) === String(currentUserId) && (
                      <button
                        type="button"
                        onClick={() => onEdit(record)}
                        className="rounded-lg border border-control-border px-3 py-1.5 text-xs font-medium hover:bg-surface-hover"
                      >
                        Editar
                      </button>
                      )}
                  </div>
                  {expandedIds.has(record.maintenanceId) && (
                    <p
                      id={`maintenance-work-${record.maintenanceId}`}
                      className="whitespace-pre-wrap text-sm sm:col-span-2"
                    >
                      {record.workPerformed}
                    </p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-muted">
              Sin mantenimientos registrados.
            </p>
          )}
        </div>
        {onRegister && (
          <div className="mt-4 flex sm:justify-end">
            <button
              type="button"
              onClick={onRegister}
              className="inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-lg border border-control-border px-4 py-2 text-sm font-medium hover:bg-surface-hover sm:w-auto sm:whitespace-nowrap"
            >
              <LuWrench /> Registrar mantenimiento
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SupportTicketDetails() {
  const { ticketId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isClient = user.role === ROLES.CLIENT;
  const isAdmin = user.role === ROLES.ADMIN;
  const isAssignedTechnicianView =
    user.role === ROLES.TECHNICIAN &&
    location.state?.supportReturnPath === "/support/assigned";
  const ticketListPath = isClient
    ? "/support/requests"
    : isAssignedTechnicianView
      ? "/support/assigned"
      : "/support";
  const ticketListLabel = isClient
    ? "Volver a mis solicitudes"
    : isAssignedTechnicianView
      ? "Volver a solicitudes asignadas"
      : "Volver a soporte";
  const [ticket, setTicket] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState(null);
  const [assignees, setAssignees] = useState([]);
  const [resolution, setResolution] = useState("");
  const [loading, setLoading] = useState(true);

  const unavailable = useCallback(
    (message) => {
      toast.error(message || "El ticket ya no está disponible.");
      navigate(ticketListPath, { replace: true });
    },
    [navigate, ticketListPath],
  );

  const load = useCallback(async () => {
    const result = await getSupportTicket(ticketId);
    if (!result.success) return unavailable(result.message);
    setTicket(result.data);
    setResolution(result.data.resolution || "");
    if (!isClient) {
      const diagnosticResult = await getSupportDiagnostics(ticketId);
      if (!diagnosticResult.success)
        return unavailable(diagnosticResult.message);
      setDiagnostics(diagnosticResult.data);
    }
    if (isAdmin) {
      const assigneeResult = await getSupportAssignees();
      if (assigneeResult.success) setAssignees(assigneeResult.data);
    }
    setLoading(false);
  }, [isAdmin, isClient, ticketId, unavailable]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function run(action, successMessage) {
    const result = await action();
    if (!result.success) {
      if ([403, 404, 409].includes(result.status)) {
        toast.error(result.message);
        if (
          [403, 404].includes(result.status) ||
          /tomado/i.test(result.message)
        )
          navigate(ticketListPath, { replace: true });
      } else toast.error(result.message);
      return;
    }
    setTicket(result.data);
    setResolution(result.data.resolution || "");
    toast.success(successMessage);
  }

  function resolveTicket() {
    const normalizedResolution = resolution.trim();
    if (normalizedResolution.length < 3) {
      toast.error(
        "Ingresa un diagnóstico y solución de al menos 3 caracteres.",
      );
      return;
    }
    run(
      () =>
        updateSupportTicketStatus(ticketId, {
          status: "RESOLVED",
          resolution: normalizedResolution,
        }),
      "Ticket resuelto.",
    );
  }

  if (loading || !ticket)
    return (
      <div className="py-20 text-center text-muted">Cargando ticket...</div>
    );
  const assignedUserId =
    ticket.assignedToUserId ?? ticket.assignedToUser?.userId;
  const hasAssignee = assignedUserId !== null && assignedUserId !== undefined;
  const sessionUserId = user.id ?? user.userId;
  const canWork =
    isAdmin ||
    (hasAssignee && String(assignedUserId) === String(sessionUserId));
  const canRegisterMaintenance =
    canWork &&
    diagnostics &&
    ["IN_PROGRESS", "RESOLVED"].includes(ticket.status);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <Link
        to={ticketListPath}
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-content"
      >
        <LuArrowLeft />
        {ticketListLabel}
      </Link>

      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <header className="flex flex-col justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-base font-semibold sm:text-lg">
              {ticket.title}
            </h1>
            <p className="mt-1 text-xs text-secondary sm:text-sm">
              Ticket #{ticket.supportTicketId} - {ticket.supportReason.name}
            </p>
          </div>
          <p className="shrink-0 text-xs text-secondary sm:text-sm">
            {new Date(ticket.createdAt).toLocaleString("es-CL")}
          </p>
        </header>
        {!isClient && ticket.createdByUser && (
          <>
            <h2 className="mt-5 text-sm font-semibold">Cliente</h2>
            <p className="mt-1 text-sm text-secondary">
              {ticket.createdByUser.name} - {ticket.createdByUser.email} -{" "}
              {ticket.createdByUser.phone || "Sin teléfono"}
            </p>
          </>
        )}
        <h2 className="mt-5 text-sm font-semibold">Descripción</h2>
        <p className="mt-1 text-sm whitespace-pre-wrap text-secondary">
          {ticket.description}
        </p>
        {ticket.resolution && (
          <div className="mt-5 rounded-xl border border-border bg-surface-muted p-4">
            <h2 className="font-semibold">
              {ticket.status === "IN_PROGRESS"
                ? "Resolución anterior"
                : "Resolución"}
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-secondary">
              {ticket.resolution}
            </p>
          </div>
        )}
      </section>

      {!isClient && (
        <section className="space-y-5 rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Acciones</h2>
              <p className="mt-1 text-sm text-secondary">
                {isAdmin
                  ? hasAssignee
                    ? "Puedes reasignar el ticket."
                    : "Puedes tomar el ticket o asignar un responsable para comenzar la atención."
                  : hasAssignee
                    ? "Para marcar el ticket como resuelto debes ingresar diagnóstico y solución. También puedes registrar mantenimientos asociados a este ticket."
                    : "Puedes tomar el ticket para comenzar a trabajar en la solicitud."}
              </p>
            </div>
            {!hasAssignee && ticket.status === "OPEN" && (
              <button
                onClick={() =>
                  run(() => claimSupportTicket(ticketId), "Ticket asignado.")
                }
                className="shrink-0 self-start rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-action"
              >
                Tomar ticket
              </button>
            )}
            {hasAssignee &&
              canWork &&
              ticket.status === "IN_PROGRESS" && (
                <button
                  type="button"
                  onClick={resolveTicket}
                  className="shrink-0 self-start rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-action"
                >
                  Marcar como resuelto
                </button>
              )}
          </div>

          {(isAdmin || hasAssignee) && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-secondary">Responsable</p>
              {isAdmin ? (
                <AssigneeSearch
                  assignees={assignees}
                  value={assignedUserId}
                  onSelect={(userId) =>
                    run(
                      () => assignSupportTicket(ticketId, userId),
                      "Responsable actualizado.",
                    )
                  }
                />
              ) : (
                <p className="text-sm font-medium text-content">
                  {ticket.assignedToUser?.name || (
                    <span className="italic text-muted">Sin asignar</span>
                  )}
                </p>
              )}
            </div>
          )}

          {hasAssignee &&
            canWork &&
            ticket.status === "IN_PROGRESS" && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-secondary">
                  Diagnóstico y solución
                  <textarea
                    value={resolution}
                    onChange={(event) => setResolution(event.target.value)}
                    rows="3"
                    required
                    minLength="3"
                    maxLength="5000"
                    className={`${inputClass} mt-2`}
                    placeholder="Describe el diagnóstico y la solución aplicada"
                  />
                </label>
              </div>
            )}
          {canWork && ticket.status === "RESOLVED" && (
            <div className="flex flex-col justify-center gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <button
                onClick={() =>
                  run(
                    () =>
                      updateSupportTicketStatus(ticketId, { status: "CLOSED" }),
                    "Ticket cerrado.",
                  )
                }
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-action"
              >
                Cerrar
              </button>
              <button
                onClick={() =>
                  run(
                    () =>
                      updateSupportTicketStatus(ticketId, {
                        status: "IN_PROGRESS",
                      }),
                    "Ticket reabierto.",
                  )
                }
                className="rounded-lg border border-control-border px-4 py-2 text-sm"
              >
                Reabrir
              </button>
            </div>
          )}
          {canWork && ticket.status === "CLOSED" && (
            <div className="flex justify-center border-t border-border pt-5 sm:justify-end">
              <button
                onClick={() =>
                  run(
                    () =>
                      updateSupportTicketStatus(ticketId, {
                        status: "IN_PROGRESS",
                      }),
                    "Ticket reabierto.",
                  )
                }
                className="rounded-lg border border-control-border px-4 py-2 text-sm"
              >
                Reabrir
              </button>
            </div>
          )}
          {hasAssignee && (
            <MaintenanceRecords
              records={ticket.maintenanceRecords}
              currentUserId={sessionUserId}
              onEdit={(record) => {
                setEditingMaintenance(record);
                setMaintenanceOpen(true);
              }}
              onRegister={
                canRegisterMaintenance
                  ? () => {
                      setEditingMaintenance(null);
                      setMaintenanceOpen(true);
                    }
                  : undefined
              }
            />
          )}
        </section>
      )}

      {!isClient && (
        <Diagnostics data={diagnostics} onCycleOpen={setSelectedCycle} />
      )}
      {!isClient && (
        <>
          <CycleTelemetryModal
            ticketId={ticketId}
            cycle={selectedCycle}
            onClose={() => setSelectedCycle(null)}
            unavailable={unavailable}
          />
          {diagnostics && maintenanceOpen && (
            <MaintenanceModal
              ticketId={ticketId}
              diagnostics={diagnostics}
              record={editingMaintenance}
              open={maintenanceOpen}
              onClose={() => {
                setMaintenanceOpen(false);
                setEditingMaintenance(null);
              }}
              onSaved={load}
            />
          )}
        </>
      )}
    </div>
  );
}
