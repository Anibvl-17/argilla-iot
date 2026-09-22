import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LuArrowLeft,
  LuClipboardList,
  LuLifeBuoy,
  LuPlus,
  LuSearch,
  LuSettings,
} from "react-icons/lu";
import { toast } from "sonner";
import { useAuth } from "@context/AuthContext";
import { Badge } from "@components/Badge";
import Pagination from "@components/Pagination";
import { getMyKilns } from "@services/kiln.service";
import {
  createSupportReason,
  createSupportTicket,
  getSupportReasons,
  getSupportTickets,
  updateSupportReason,
} from "@services/support.service";
import {
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUS_STYLES,
} from "@constants/support.constants";
import { ROLES } from "@constants/user.constants";

const PAGE_SIZE = 10;
const emptyFilters = {
  search: "",
  status: "",
  supportReasonId: "",
  assignment: "",
  createdFrom: "",
  createdTo: "",
};
const fieldClass =
  "w-full rounded-lg border border-control-border bg-field px-3 py-2.5 text-sm text-content outline-none transition-all focus:border-focus focus:ring-1 focus:ring-focus";
const filterFieldClass = `${fieldClass} h-11`;

function HeaderAction({
  mode,
  hasClientTickets,
  hasAssignedTickets,
  onReasons,
}) {
  const className =
    "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-on-action transition-colors hover:bg-primary-hover sm:w-auto";

  if (mode === "admin") {
    return (
      <button type="button" onClick={onReasons} className={className}>
        <LuSettings /> Gestionar motivos
      </button>
    );
  }
  if (mode === "client-form" && hasClientTickets) {
    return (
      <Link to="/support/requests" className={className}>
        <LuClipboardList /> Mis solicitudes
      </Link>
    );
  }
  if (mode === "client-requests") {
    return (
      <Link to="/support" className={className}>
        <LuPlus /> Nueva solicitud
      </Link>
    );
  }
  if (mode === "technician-open" && hasAssignedTickets) {
    return (
      <Link to="/support/assigned" className={className}>
        <LuClipboardList /> Solicitudes asignadas
      </Link>
    );
  }
  if (mode === "technician-assigned") {
    return (
      <Link to="/support" className={className}>
        <LuLifeBuoy /> Solicitudes abiertas
      </Link>
    );
  }
  return null;
}

function TicketFilters({ mode, filters, setFilters, reasons }) {
  const isAdmin = mode === "admin";
  const isClient = mode === "client-requests";
  const isTechnician = mode.startsWith("technician-");
  const update = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  return (
    <div className="border-b border-border p-4">
      <p className="mb-3 text-sm text-muted md:text-base">
        {isAdmin &&
          "Busca por responsable, cliente, horno, título o ID de ticket/horno."}
        {isClient && "Busca por nombre o ID de horno y filtra por estado."}
        {isTechnician &&
          "Filtra las solicitudes por motivo o fecha de creación."}
      </p>
      <div
        className={`grid items-end gap-3 ${isAdmin ? "md:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_12rem_12rem_11rem_11rem_11rem]" : isClient ? "sm:grid-cols-[minmax(16rem,1fr)_12rem]" : "sm:grid-cols-3"}`}
      >
        {(isAdmin || isClient) && (
          <div className="relative">
            <LuSearch className="pointer-events-none absolute left-3 top-3 text-muted" />
            <input
              type="search"
              name="search"
              value={filters.search}
              onChange={update}
              placeholder={
                isAdmin
                  ? "Camila, Técnico, #24, Horno gres..."
                  : "Horno gres, #24..."
              }
              className={`${filterFieldClass} pl-10`}
              aria-label="Buscar solicitudes"
            />
          </div>
        )}
        {(isAdmin || isClient) && (
          <select
            name="status"
            value={filters.status}
            onChange={update}
            className={filterFieldClass}
            aria-label="Estado"
          >
            <option value="">Todos los estados</option>
            {Object.entries(SUPPORT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        )}
        {(isAdmin || isTechnician) && (
          <select
            name="supportReasonId"
            value={filters.supportReasonId}
            onChange={update}
            className={filterFieldClass}
            aria-label="Motivo"
          >
            <option value="">Todos los motivos</option>
            {reasons.map((reason) => (
              <option
                key={reason.supportReasonId}
                value={reason.supportReasonId}
              >
                {reason.name}
              </option>
            ))}
          </select>
        )}
        {isAdmin && (
          <select
            name="assignment"
            value={filters.assignment}
            onChange={update}
            className={filterFieldClass}
            aria-label="Asignación"
          >
            <option value="">Toda asignación</option>
            <option value="unassigned">Sin asignar</option>
            <option value="assigned">Asignadas</option>
          </select>
        )}
        {(isAdmin || isTechnician) && (
          <label className="text-xs text-muted">
            Desde
            <input
              name="createdFrom"
              type="date"
              value={filters.createdFrom}
              onChange={update}
              className={`mt-1 ${filterFieldClass}`}
            />
          </label>
        )}
        {(isAdmin || isTechnician) && (
          <label className="text-xs text-muted">
            Hasta
            <input
              name="createdTo"
              type="date"
              value={filters.createdTo}
              onChange={update}
              className={`mt-1 ${filterFieldClass}`}
            />
          </label>
        )}
      </div>
    </div>
  );
}

function ClientTicketForm({ reasons, kilns, onCreated }) {
  const [form, setForm] = useState({
    supportReasonId: "",
    kilnId: "",
    title: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const update = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    const result = await createSupportTicket({
      ...form,
      supportReasonId: Number(form.supportReasonId),
      kilnId: Number(form.kilnId),
    });
    setSaving(false);
    if (!result.success) return toast.error(result.message);
    setForm({ supportReasonId: "", kilnId: "", title: "", description: "" });
    toast.success("Solicitud de soporte creada.");
    onCreated();
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-6 rounded-2xl border border-border bg-surface p-4 shadow-panel sm:p-6"
    >
      <section>
        <h2 className="text-lg font-semibold">Información de la solicitud</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-secondary">
            Horno
            <select
              required
              name="kilnId"
              value={form.kilnId}
              onChange={update}
              className={`mt-2 ${fieldClass}`}
            >
              <option value="">Selecciona un horno</option>
              {kilns.map((kiln) => (
                <option key={kiln.kilnId} value={kiln.kilnId}>
                  #{kiln.kilnId} - {kiln.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-secondary">
            Motivo
            <select
              required
              name="supportReasonId"
              value={form.supportReasonId}
              onChange={update}
              className={`mt-2 ${fieldClass}`}
            >
              <option value="">Selecciona un motivo</option>
              {reasons
                .filter((reason) => reason.isActive)
                .map((reason) => (
                  <option
                    key={reason.supportReasonId}
                    value={reason.supportReasonId}
                  >
                    {reason.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <label className="mt-4 block text-sm font-medium text-secondary">
          Título
          <input
            required
            minLength="3"
            maxLength="150"
            name="title"
            value={form.title}
            onChange={update}
            className={`mt-2 ${fieldClass}`}
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-secondary">
          Descripción
          <textarea
            required
            minLength="10"
            maxLength="5000"
            rows="6"
            name="description"
            value={form.description}
            onChange={update}
            className={`mt-2 ${fieldClass}`}
          />
        </label>
      </section>
      <p className="rounded-xl border border-border bg-surface-muted p-4 text-sm leading-relaxed text-secondary">
        Para facilitar el diagnóstico y entregar una mejor atención, el personal
        técnico autorizado podrá consultar información técnica y registros de
        uso asociados al horno seleccionado, incluyendo información de su
        controlador y datos de funcionamiento. Esta información será utilizada
        únicamente para evaluar y atender la solicitud de soporte.
      </p>
      <div className="flex justify-end border-t border-border pt-5">
        <button
          disabled={saving || kilns.length === 0}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-on-action hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "Enviando..." : "Enviar solicitud"}
        </button>
      </div>
    </form>
  );
}

function ReasonManager({ reasons, reload, onBack }) {
  const [form, setForm] = useState({ code: "", name: "" });
  const [names, setNames] = useState({});
  async function add(event) {
    event.preventDefault();
    const result = await createSupportReason({
      code: form.code.trim().toUpperCase(),
      name: form.name,
    });
    if (!result.success) return toast.error(result.message);
    setForm({ code: "", name: "" });
    toast.success("Motivo creado.");
    reload();
  }
  async function update(reason, data) {
    const result = await updateSupportReason(reason.supportReasonId, data);
    if (!result.success) return toast.error(result.message);
    toast.success("Motivo actualizado.");
    reload();
  }
  return (
    <div className="min-w-0 space-y-6 text-content">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-content"
      >
        <LuArrowLeft /> Volver a soporte
      </button>
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Motivos de soporte
        </h1>
        <p className="mt-1 text-sm text-secondary">
          Crea, edita y activa los motivos disponibles para nuevas solicitudes.
        </p>
      </div>
      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-panel">
        <form
          onSubmit={add}
          className="grid gap-3 border-b border-border p-4 sm:grid-cols-[1fr_2fr_auto]"
        >
          <input
            required
            pattern="[A-Z][A-Z0-9_]{1,49}"
            value={form.code}
            onChange={(event) =>
              setForm({ ...form, code: event.target.value.toUpperCase() })
            }
            className={fieldClass}
            placeholder="CÓDIGO"
          />
          <input
            required
            minLength="2"
            maxLength="100"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className={fieldClass}
            placeholder="Nombre del motivo"
          />
          <button className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-on-action">
            Crear motivo
          </button>
        </form>
        <div className="divide-y divide-border">
          {reasons.map((reason) => (
            <div
              key={reason.supportReasonId}
              className="grid items-center gap-3 p-4 sm:grid-cols-[1fr_2fr_auto_auto]"
            >
              <code className="text-xs text-muted">{reason.code}</code>
              <input
                value={names[reason.supportReasonId] ?? reason.name}
                onChange={(event) =>
                  setNames({
                    ...names,
                    [reason.supportReasonId]: event.target.value,
                  })
                }
                className={fieldClass}
              />
              <button
                type="button"
                onClick={() =>
                  update(reason, {
                    name: names[reason.supportReasonId] ?? reason.name,
                  })
                }
                className="rounded-lg border border-control-border px-3 py-2 text-sm"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => update(reason, { isActive: !reason.isActive })}
                className="rounded-lg border border-control-border px-3 py-2 text-sm"
              >
                {reason.isActive ? "Desactivar" : "Activar"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TicketTable({ tickets, loading, error, mode }) {
  if (error)
    return (
      <div className="m-4 rounded-xl border border-danger-border bg-danger-soft p-4 text-danger">
        {error}
      </div>
    );
  if (loading)
    return (
      <div className="py-16 text-center text-muted">
        Cargando solicitudes...
      </div>
    );
  if (tickets.length === 0)
    return (
      <div className="py-16 text-center text-muted">
        No hay solicitudes para mostrar.
      </div>
    );
  const isClient = mode === "client-requests";
  const supportReturnPath =
    mode === "client-requests"
      ? "/support/requests"
      : mode === "technician-assigned"
        ? "/support/assigned"
        : "/support";
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed text-left text-sm md:min-w-180 md:table-auto">
        <thead className="border-b border-border bg-surface-muted text-xs uppercase tracking-wider text-muted">
          <tr>
            <th className="w-14 px-3 py-4 md:w-auto md:px-5">ID</th>
            <th className="px-3 py-4 md:px-5">Solicitud</th>
            <th className="hidden px-5 py-4 md:table-cell">
              {isClient ? "Horno" : "Cliente"}
            </th>
            {!isClient && (
              <th className="hidden px-5 py-4 md:table-cell">Responsable</th>
            )}
            <th className="hidden px-5 py-4 text-center md:table-cell">
              Estado
            </th>
            <th className="hidden px-5 py-4 md:table-cell">Fecha</th>
            <th className="w-28 px-3 py-4 text-center md:w-auto md:px-5">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {tickets.map((ticket) => (
            <tr
              key={ticket.supportTicketId}
              className="transition-colors hover:bg-surface-hover"
            >
              <td className="px-3 py-4 font-mono text-muted md:px-5">
                {ticket.supportTicketId}
              </td>
              <td className="text-xs sm:text-sm max-w-72 px-3 py-4 md:px-5">
                <p className="font-medium text-content">
                  {ticket.title}
                </p>
                <p className="mt-1 truncate text-xs text-muted">
                  {ticket.supportReason?.name}
                </p>
              </td>
              <td className="hidden px-5 py-4 md:table-cell">
                <p>
                  {isClient
                    ? ticket.kiln?.name
                    : ticket.createdByUser?.name || "Sin cliente"}
                </p>
                {!isClient && (
                  <p className="mt-1 text-xs text-secondary">
                    Horno #{ticket.kilnId}
                  </p>
                )}
              </td>
              {!isClient && (
                <td className="hidden px-5 py-4 md:table-cell">
                  {ticket.assignedToUser?.name || (
                    <span className="italic text-muted">Sin asignar</span>
                  )}
                </td>
              )}
              <td className="hidden px-5 py-4 md:table-cell">
                <span className="flex justify-center">
                  <Badge
                    text={SUPPORT_STATUS_LABELS[ticket.status]}
                    style={SUPPORT_STATUS_STYLES[ticket.status]}
                  />
                </span>
              </td>
              <td className="hidden px-5 py-4 text-muted md:table-cell">
                {new Date(ticket.createdAt).toLocaleDateString("es-CL")}
              </td>
              <td className="px-3 py-4 text-center md:px-5">
                <Link
                  to={`/support/${ticket.supportTicketId}`}
                  state={{ supportReturnPath }}
                  className="inline-flex items-center gap-2 rounded-lg border border-control-border px-3 py-2 text-xs font-medium text-content transition-colors hover:bg-surface-hover"
                >
                  Ver detalle
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SupportTickets() {
  const { user } = useAuth();
  const location = useLocation();
  const isClient = user.role === ROLES.CLIENT;
  const isAdmin = user.role === ROLES.ADMIN;
  const isAssignedView = location.pathname.endsWith("/assigned");
  const isClientRequests = location.pathname.endsWith("/requests");
  const mode = isAdmin
    ? "admin"
    : isClient
      ? isClientRequests
        ? "client-requests"
        : "client-form"
      : isAssignedView
        ? "technician-assigned"
        : "technician-open";
  const showList = mode !== "client-form";
  const [tickets, setTickets] = useState([]);
  const [reasons, setReasons] = useState([]);
  const [kilns, setKilns] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [hasClientTickets, setHasClientTickets] = useState(false);
  const [hasAssignedTickets, setHasAssignedTickets] = useState(false);
  const [showReasonManager, setShowReasonManager] = useState(false);
  const [loading, setLoading] = useState(showList);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const requestParams = useMemo(() => {
    const shared = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== ""),
    );
    if (mode === "admin") return shared;
    if (mode === "client-requests")
      return {
        search: filters.search || undefined,
        status: filters.status || undefined,
      };
    if (mode === "technician-open")
      return {
        status: "OPEN",
        assignment: "unassigned",
        supportReasonId: filters.supportReasonId || undefined,
        createdFrom: filters.createdFrom || undefined,
        createdTo: filters.createdTo || undefined,
      };
    return {
      assignment: "assigned",
      supportReasonId: filters.supportReasonId || undefined,
      createdFrom: filters.createdFrom || undefined,
      createdTo: filters.createdTo || undefined,
    };
  }, [filters, mode]);

  const loadCatalogs = useCallback(async () => {
    const [reasonResult, kilnResult] = await Promise.all([
      getSupportReasons(isAdmin),
      isClient
        ? getMyKilns()
        : Promise.resolve({ success: true, data: { kilns: [] } }),
    ]);
    if (reasonResult.success) setReasons(reasonResult.data);
    if (kilnResult.success) setKilns(kilnResult.data.kilns || []);
  }, [isAdmin, isClient]);
  const loadAvailability = useCallback(async () => {
    if (isClient) {
      const result = await getSupportTickets({ page: 1, pageSize: 1 });
      if (result.success) setHasClientTickets(result.data.pagination.total > 0);
    } else if (!isAdmin) {
      const result = await getSupportTickets({
        page: 1,
        pageSize: 1,
        assignment: "assigned",
      });
      if (result.success)
        setHasAssignedTickets(result.data.pagination.total > 0);
    }
  }, [isAdmin, isClient]);
  const loadTickets = useCallback(
    async (page = 1) => {
      if (!showList) return;
      setLoading(true);
      const result = await getSupportTickets({
        ...requestParams,
        page,
        pageSize: PAGE_SIZE,
      });
      if (result.success) {
        setTickets(result.data.items || []);
        setPagination(result.data.pagination);
        setError("");
      } else setError(result.message);
      setLoading(false);
    },
    [requestParams, showList],
  );

  useEffect(() => {
    const timer = setTimeout(loadCatalogs, 0);
    return () => clearTimeout(timer);
  }, [loadCatalogs, reloadKey]);
  useEffect(() => {
    const timer = setTimeout(loadAvailability, 0);
    return () => clearTimeout(timer);
  }, [loadAvailability, reloadKey]);
  useEffect(() => {
    const timer = setTimeout(() => loadTickets(1), 200);
    return () => clearTimeout(timer);
  }, [loadTickets, reloadKey]);
  const reload = () => setReloadKey((value) => value + 1);

  if (showReasonManager)
    return (
      <ReasonManager
        reasons={reasons}
        reload={reload}
        onBack={() => setShowReasonManager(false)}
      />
    );
  const heading =
    mode === "client-form"
      ? "Nueva solicitud"
      : mode === "client-requests"
        ? "Mis solicitudes"
        : mode === "technician-assigned"
          ? "Solicitudes asignadas"
          : "Soporte";
  const description =
    mode === "client-form"
      ? "Cuéntanos qué ocurre con uno de tus hornos."
      : mode === "client-requests"
        ? "Revisa el estado y la resolución de tus solicitudes."
        : mode === "technician-open"
          ? "Revisa las solicitudes disponibles para tomar."
          : mode === "technician-assigned"
            ? "Solicitudes que están o estuvieron a tu cargo."
            : "Gestión centralizada de solicitudes y diagnósticos.";

  return (
    <div className="min-w-0 space-y-6 text-content">
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {heading}
          </h1>
          <p className="mt-1 text-sm text-secondary">{description}</p>
        </div>
        <HeaderAction
          mode={mode}
          hasClientTickets={hasClientTickets}
          hasAssignedTickets={hasAssignedTickets}
          onReasons={() => setShowReasonManager(true)}
        />
      </div>
      {mode === "client-form" ? (
        <ClientTicketForm reasons={reasons} kilns={kilns} onCreated={reload} />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-panel">
          <TicketFilters
            mode={mode}
            filters={filters}
            setFilters={setFilters}
            reasons={reasons}
          />
          <TicketTable
            tickets={tickets}
            loading={loading}
            error={error}
            mode={mode}
          />
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={loadTickets}
          />
        </section>
      )}
    </div>
  );
}
