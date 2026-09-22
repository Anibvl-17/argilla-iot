import { Fragment, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LuArrowLeft,
  LuEye,
  LuEyeOff,
  LuHistory,
  LuPencil,
  LuPlus,
  LuTrash2,
  LuUnlink,
  LuUserRoundMinus,
} from "react-icons/lu";
import { toast } from "sonner";
import AlertDialog from "@components/AlertDialog";
import { Badge } from "@components/Badge";
import HeatingCircuitEditor from "@components/HeatingCircuitEditor";
import Modal from "@components/Modal";
import Pagination from "@components/Pagination";
import { SearchableCatalogField } from "@components/UserContactFields";
import { useAuth } from "@context/AuthContext";
import { useControllerRealtime } from "@hooks/useControllerRealtime";
import {
  ASSOCIATION_ELIGIBLE_OPERATIONAL_STATUSES,
  getControllerActivityLabel,
  getControllerConnectionLabel,
  getOperationalStatusLabel,
  getSwitchLabel,
  OPERATIONAL_STATUS_OPTIONS,
  OPERATIONAL_STATUS_STYLES,
} from "@constants/controller.constants";
import { ROLES } from "@constants/user.constants";
import { getAllControllers } from "@services/controller.service";
import {
  createKiln,
  deleteKiln,
  getAllKilns,
  linkController,
  linkUser,
  unlinkController,
  unlinkUser,
  updateKiln,
} from "@services/kiln.service";
import { getAllUsers } from "@services/user.service";
import {
  createDefaultCircuit,
  summarizeHeatingCircuit,
} from "../utils/heatingCircuit";
import { getPageAfterDeletion } from "../utils/pagination";

const PAGE_SIZE = 10;
const today = () => new Date().toISOString().slice(0, 10);
function emptyForm() {
  return {
    name: "",
    liters: 40,
    phaseCount: 1,
    nominalVoltage: 220,
    nominalCurrent: 20,
    manufacturedAt: today(),
    deliveredAt: "",
    manufacturer: "Argillá",
    heatingCircuitConfiguration: createDefaultCircuit(),
  };
}

function Field({ label, children }) {
  return (
    <label className="text-sm font-medium text-secondary">
      {label}
      {children}
    </label>
  );
}

const fieldClass =
  "mt-2 w-full rounded-lg border-2 border-control-border bg-field px-3 py-2.5 text-content outline-none transition-colors focus:border-focus";

export default function AdminKilns() {
  const { user } = useAuth();
  const isAdmin = user.role === ROLES.ADMIN;
  const [loading, setLoading] = useState(false);
  const [kilns, setKilns] = useState([]);
  const [controllers, setControllers] = useState([]);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [operationalStatusFilter, setOperationalStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({
    total: 0,
    withoutController: 0,
    withoutOwner: 0,
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [expandedKilnId, setExpandedKilnId] = useState(null);
  const [selectedKiln, setSelectedKiln] = useState(null);
  const [associationKiln, setAssociationKiln] = useState(null);
  const [associationControllerId, setAssociationControllerId] = useState("");
  const [associationLoading, setAssociationLoading] = useState(false);
  const [controllerInfo, setControllerInfo] = useState(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const fetchKilns = useCallback(async () => {
    setLoading(true);
    const [kilnResult, controllerResult, userResult] = await Promise.all([
      getAllKilns({
        page,
        pageSize: PAGE_SIZE,
        search: searchTerm,
        operationalStatusFilter: operationalStatusFilter || undefined,
      }),
      getAllControllers({ pageSize: 100 }),
      isAdmin
        ? getAllUsers({ pageSize: 100 })
        : Promise.resolve({ success: true, data: { items: [] } }),
    ]);
    setLoading(false);

    if (!kilnResult.success) return toast.error(kilnResult.message);
    const payload = kilnResult.data || {};
    setKilns(payload.items || []);
    setTotalPages(payload.pagination?.totalPages || 1);
    setSummary((current) => ({ ...current, ...(payload.summary || {}) }));
    if (controllerResult.success)
      setControllers(controllerResult.data.items || []);
    if (userResult.success)
      setClients(
        (userResult.data.items || []).filter(
          (item) =>
            item.role === ROLES.CLIENT && item.isActive && !item.anonymizedAt,
        ),
      );
  }, [isAdmin, operationalStatusFilter, page, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(fetchKilns, 200);
    return () => clearTimeout(timer);
  }, [fetchKilns]);

  useControllerRealtime(
    useCallback((telemetry) => {
      setKilns((current) =>
        current.map((kiln) => ({
          ...kiln,
          controller:
            kiln.controller?.controllerId === telemetry.controllerId
              ? { ...kiln.controller, ...telemetry }
              : kiln.controller,
        })),
      );
    }, []),
  );

  function openCreateView() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError("");
    setShowForm(true);
  }

  function openEditView(kiln) {
    setEditingId(kiln.kilnId);
    setForm({
      name: kiln.name || "",
      liters: kiln.liters,
      phaseCount: kiln.phaseCount,
      nominalVoltage: kiln.nominalVoltage,
      nominalCurrent: kiln.nominalCurrent,
      manufacturedAt: kiln.manufacturedAt?.slice(0, 10) || today(),
      deliveredAt: kiln.deliveredAt?.slice(0, 10) || "",
      manufacturer: kiln.manufacturer,
      heatingCircuitConfiguration: kiln.heatingCircuitConfiguration,
    });
    setFormError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.heatingCircuitConfiguration?.elements?.length) {
      setFormError(
        "El circuito de resistencias debe contener al menos un elemento.",
      );
      return;
    }

    setLoading(true);
    const payload = {
      ...form,
      liters: Number(form.liters),
      phaseCount: Number(form.phaseCount),
      nominalVoltage: Number(form.nominalVoltage),
      nominalCurrent: Number(form.nominalCurrent),
      deliveredAt: form.deliveredAt || null,
    };
    if (!isAdmin && editingId) delete payload.name;
    const result = editingId
      ? await updateKiln(editingId, payload)
      : await createKiln(payload);
    setLoading(false);

    if (!result.success) {
      setFormError(result.data?.errorDetails || result.message);
      return;
    }

    toast.success(
      editingId
        ? "Horno actualizado exitosamente."
        : "Horno creado exitosamente.",
    );
    closeForm();
    await fetchKilns();
  }

  async function attach(kiln, controllerId) {
    if (!controllerId) return;
    setAssociationLoading(true);
    const result = await linkController(kiln.kilnId, controllerId);
    setAssociationLoading(false);
    if (!result.success)
      return toast.error(result.data?.errorDetails || result.message);
    toast.success("Controlador asociado exitosamente.");
    closeAssociationModal();
    await fetchKilns();
  }

  function closeAssociationModal() {
    setAssociationKiln(null);
    setAssociationControllerId("");
    setAssociationLoading(false);
  }

  function getAvailableControllerOptions(kiln) {
    return controllers
      .filter(
        (controller) =>
          (!controller.kiln || controller.kiln.kilnId === kiln.kilnId) &&
          ASSOCIATION_ELIGIBLE_OPERATIONAL_STATUSES.includes(
            controller.operationalStatus,
          ) &&
          (!controller.user ||
            !kiln.user ||
            controller.user.userId === kiln.user.userId),
      )
      .map((controller) => ({
        code: controller.controllerId,
        name: `...${controller.controllerCode} - ${controller.user?.name || "Sin propietario"}`,
        secondary: `${getSwitchLabel(controller.switchType)} ${controller.switchCurrentCapacity} A`,
        operationalStatus: controller.operationalStatus,
        searchText: `${controller.controllerId} ...${controller.controllerCode} ${controller.user?.name || ""}`,
      }));
  }

  async function detach(kiln) {
    const result = await unlinkController(kiln.kilnId);
    if (!result.success) return toast.error(result.message);
    toast.success("Controlador desvinculado.");
    await fetchKilns();
  }

  async function assign(kiln, userId) {
    if (!userId) return;
    const result = await linkUser(kiln.kilnId, Number(userId));
    if (!result.success)
      return toast.error(result.data?.errorDetails || result.message);
    toast.success("Propiedad asignada al conjunto horno-controlador.");
    await fetchKilns();
  }

  async function release(kiln) {
    const result = await unlinkUser(kiln.kilnId);
    if (!result.success) return toast.error(result.message);
    toast.success("Propiedad del conjunto liberada.");
    await fetchKilns();
  }

  async function confirmDelete() {
    setLoading(true);
    const result = await deleteKiln(selectedKiln.kilnId);
    setLoading(false);
    setIsAlertOpen(false);
    if (!result.success) return toast.error(result.message);
    const nextPage = getPageAfterDeletion({ page, itemsOnPage: kilns.length });
    toast.success("Horno eliminado exitosamente.");
    setSelectedKiln(null);
    if (nextPage !== page) setPage(nextPage);
    else await fetchKilns();
  }

  if (showForm) {
    return (
      <div className="min-w-0 space-y-6 text-content">
        <button
          type="button"
          onClick={closeForm}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-content"
        >
          <LuArrowLeft /> Volver a hornos
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {editingId ? "Editar horno" : "Crear horno"}
          </h1>
          <p className="mt-1 text-sm text-secondary">
            Completa la información técnica y configura el circuito de resistencias.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-border bg-surface p-4 shadow-panel sm:p-6"
        >
          <section>
            <h2 className="text-lg font-semibold">Información general</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(isAdmin || !editingId) && (
                <Field label="Nombre">
                  <input
                    required
                    minLength={2}
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    className={fieldClass}
                  />
                </Field>
              )}
              <Field label="Capacidad (litros)">
                <input
                  required
                  type="number"
                  min="1"
                  max="500"
                  value={form.liters}
                  onChange={(event) =>
                    setForm({ ...form, liters: event.target.value })
                  }
                  className={fieldClass}
                />
              </Field>
              <Field label="Cantidad de fases">
                <select
                  value={form.phaseCount}
                  onChange={(event) =>
                    setForm({ ...form, phaseCount: event.target.value })
                  }
                  className={fieldClass}
                >
                  <option value={1}>Monofásico</option>
                  <option value={3}>Trifásico</option>
                </select>
              </Field>
              <Field label="Voltaje nominal (V)">
                <input
                  required
                  type="number"
                  min="100"
                  max="600"
                  value={form.nominalVoltage}
                  onChange={(event) =>
                    setForm({ ...form, nominalVoltage: event.target.value })
                  }
                  className={fieldClass}
                />
              </Field>
              <Field label="Corriente nominal (A)">
                <input
                  required
                  type="number"
                  min="1"
                  max="500"
                  value={form.nominalCurrent}
                  onChange={(event) =>
                    setForm({ ...form, nominalCurrent: event.target.value })
                  }
                  className={fieldClass}
                />
              </Field>
              <Field label="Fabricante">
                <input
                  required
                  value={form.manufacturer}
                  onChange={(event) =>
                    setForm({ ...form, manufacturer: event.target.value })
                  }
                  className={fieldClass}
                />
              </Field>
              <Field label="Fecha de fabricación">
                <input
                  required
                  type="date"
                  value={form.manufacturedAt}
                  onChange={(event) =>
                    setForm({ ...form, manufacturedAt: event.target.value })
                  }
                  className={fieldClass}
                />
              </Field>
              <Field label="Fecha de entrega">
                <input
                  type="date"
                  value={form.deliveredAt}
                  onChange={(event) =>
                    setForm({ ...form, deliveredAt: event.target.value })
                  }
                  className={fieldClass}
                />
              </Field>
            </div>
          </section>

          <section className="border-t border-border pt-6">
            <h2 className="mb-4 text-lg font-semibold">Circuito de resistencias</h2>
            <HeatingCircuitEditor
              value={form.heatingCircuitConfiguration}
              onChange={(heatingCircuitConfiguration) =>
                setForm({ ...form, heatingCircuitConfiguration })
              }
            />
          </section>
          {formError && (
            <p className="rounded-lg border border-danger-border bg-danger-soft p-3 text-sm text-danger">
              {String(formError)}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeForm}
              disabled={loading}
              className="rounded-lg border border-control-border px-5 py-2.5 text-sm font-medium text-secondary hover:bg-surface-hover"
            >
              Cancelar
            </button>
            <button
              disabled={loading}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-on-action hover:bg-primary-hover disabled:opacity-60"
            >
              {loading
                ? "Guardando..."
                : editingId
                  ? "Guardar cambios"
                  : "Crear horno"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6 text-content">
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Hornos
          </h1>
          <p className="mt-1 text-sm text-secondary">
            Gestión centralizada de los hornos y sus asociaciones.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateView}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-on-action transition-colors hover:bg-primary-hover sm:w-auto"
        >
          <LuPlus /> Crear horno
        </button>
      </div>

      <div className="hidden grid-cols-3 gap-4 sm:grid">
        {[
          ["Total hornos", summary.total],
          ["Sin controlador", summary.withoutController],
          ["Sin propietario", summary.withoutOwner],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-surface p-3 shadow-card sm:p-5"
          >
            <p className="mb-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-muted sm:text-xs sm:tracking-wider">
              {label}
            </p>
            <p className="text-xl font-bold text-content sm:text-3xl">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-panel">
        <div className="border-b border-border p-4">
          <p className="mb-2 text-sm text-muted md:text-base">
            Busca por ID de horno, fabricante, propietario o controlador.
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
                placeholder="6, Argillá, Camila, A1B2C3..."
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
                <th className="px-4 py-4 sm:px-6">ID</th>
                <th className="px-3 py-4 sm:px-6">
                  <span className="lg:hidden">Propietario<br />Controlador</span>
                  <span className="hidden lg:inline">Propietario</span>
                </th>
                <th className="hidden px-6 py-4 text-center lg:table-cell">
                  Capacidad
                </th>
                <th className="hidden px-6 py-4 text-center lg:table-cell">
                  Datos eléctricos
                </th>
                <th className="hidden px-6 py-4 text-center lg:table-cell">
                  Controlador
                </th>
                <th className="hidden px-6 py-4 text-center lg:table-cell">
                  Estado
                </th>
                <th className="py-4 pl-3 pr-5 text-center sm:px-6">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!loading &&
                kilns.map((kiln) => {
                  const availableControllerOptions =
                    getAvailableControllerOptions(kiln);
                  const circuitSummary = summarizeHeatingCircuit(
                    kiln.heatingCircuitConfiguration,
                  );
                  return (
                    <Fragment key={kiln.kilnId}>
                      <tr className="transition-colors hover:bg-surface-hover">
                        <td className="px-4 py-5 sm:px-6">
                          <p className="font-mono text-sm text-muted">
                            {kiln.kilnId}
                          </p>
                        </td>
                        <td className="max-w-44 px-3 py-5 sm:px-6 lg:max-w-none">
                          {kiln.user ? (
                            <>
                              <p>{kiln.user.name}</p>
                              {isAdmin && (
                                <p className="mt-1 hidden break-all text-secondary lg:block">
                                  {kiln.user.email}
                                </p>
                              )}
                            </>
                          ) : (
                            <span className="italic text-muted">
                              Sin propietario
                            </span>
                          )}
                          <div className="mt-1 font-mono text-accent lg:hidden">
                            {kiln.controller ? (
                              <button
                                type="button"
                                className="text-accent hover:cursor-pointer hover:underline"
                                title="Ver información del controlador"
                                onClick={() => setControllerInfo(kiln.controller)}
                              >
                                ...{kiln.controller.controllerCode}
                              </button>
                            ) : (
                              <p className="font-sans italic text-muted">
                                Sin controlador
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="hidden px-3 py-5 text-center lg:table-cell">
                          <p className="font-medium">{kiln.liters} litros</p>
                        </td>
                        <td className="font-mono hidden px-3 py-5 text-center lg:table-cell">
                          <p className="font-medium">
                            {kiln.nominalVoltage} V - {kiln.nominalCurrent} A
                          </p>
                          <p className="mt-1 text-secondary text-xs">
                            {kiln.phaseCount === 1 ? "Monofásico" : "Trifásico"}
                          </p>
                        </td>
                        <td className="hidden px-6 py-5 lg:table-cell text-center">
                          {kiln.controller ? (
                            <button
                              type="button"
                              className="font-mono text-accent hover:cursor-pointer hover:underline"
                              title="Ver información del controlador"
                              onClick={() => setControllerInfo(kiln.controller)}
                            >
                              ...{kiln.controller.controllerCode}
                            </button>
                          ) : (
                            <span className="italic text-muted">
                              Sin asociar
                            </span>
                          )}
                        </td>
                        <td className="hidden px-6 py-5 lg:table-cell">
                          <span className="flex justify-center">
                            <Badge
                              style={
                                OPERATIONAL_STATUS_STYLES[
                                  kiln.operationalStatus
                                ]
                              }
                              text={getOperationalStatusLabel(
                                kiln.operationalStatus,
                              )}
                            />
                          </span>
                        </td>
                        <td className="py-5 pl-3 pr-5 sm:px-6">
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedKilnId(
                                  expandedKilnId === kiln.kilnId
                                    ? null
                                    : kiln.kilnId,
                                )
                              }
                              className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-content"
                              title={
                                expandedKilnId === kiln.kilnId
                                  ? "Ocultar detalles"
                                  : "Ver detalles"
                              }
                            >
                              {expandedKilnId === kiln.kilnId ? (
                                <LuEyeOff className="text-base" />
                              ) : (
                                <LuEye className="text-base" />
                              )}
                            </button>
                            {(isAdmin || !kiln.user) && (
                              <button
                                type="button"
                                onClick={() => openEditView(kiln)}
                                className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-content"
                                title="Editar horno"
                              >
                                <LuPencil className="text-base" />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedKiln(kiln);
                                  setIsAlertOpen(true);
                                }}
                                className="rounded-lg p-2 text-muted hover:bg-danger-soft hover:text-danger"
                                title="Eliminar horno"
                              >
                                <LuTrash2 className="text-base" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedKilnId === kiln.kilnId && (
                        <tr className="bg-surface-muted">
                          <td colSpan={7} className="px-6 py-5">
                            <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                              {isAdmin && (
                                <div>
                                  <dt className="text-xs font-bold uppercase text-muted">
                                    Nombre
                                  </dt>
                                  <dd className="mt-1">{kiln.name}</dd>
                                </div>
                              )}
                              <div className="lg:hidden">
                                <dt className="text-xs font-bold uppercase text-muted">
                                  Capacidad
                                </dt>
                                <dd className="mt-1">{kiln.liters} litros</dd>
                              </div>
                              <div className="lg:hidden">
                                <dt className="text-xs font-bold uppercase text-muted">
                                  Datos eléctricos
                                </dt>
                                <dd className="mt-1">
                                  <p>
                                    {kiln.nominalVoltage} V -{" "}
                                    {kiln.nominalCurrent} A
                                  </p>
                                  <p className="mt-1 text-secondary">
                                    {kiln.phaseCount === 1
                                      ? "Monofásico"
                                      : "Trifásico"}
                                  </p>
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs font-bold uppercase text-muted">
                                  Circuito
                                </dt>
                                <dd className="mt-1">
                                  <p>
                                    {circuitSummary.groups}{" "}
                                    {circuitSummary.groups === 1
                                      ? "grupo"
                                      : "grupos"}
                                  </p>
                                  <p className="mt-1 text-secondary">
                                    {circuitSummary.channels}{" "}
                                    {circuitSummary.channels === 1
                                      ? "canal de resistencia"
                                      : "canales de resistencia"}
                                  </p>
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs font-bold uppercase text-muted">
                                  Fabricante
                                </dt>
                                <dd className="mt-1">{kiln.manufacturer}</dd>
                              </div>
                              <div>
                                <dt className="text-xs font-bold uppercase text-muted">
                                  Estado
                                </dt>
                                <dd className="mt-1">
                                  {getOperationalStatusLabel(
                                    kiln.operationalStatus,
                                  )}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs font-bold uppercase text-muted">
                                  Quemas realizadas
                                </dt>
                                <dd className="mt-1">
                                  {kiln.firingCycleCount ?? 0}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs font-bold uppercase text-muted">
                                  Fabricación
                                </dt>
                                <dd className="mt-1">
                                  {new Date(
                                    kiln.manufacturedAt,
                                  ).toLocaleDateString("es-CL")}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs font-bold uppercase text-muted">
                                  Entrega
                                </dt>
                                <dd className="mt-1">
                                  {kiln.deliveredAt ? (
                                    new Date(
                                      kiln.deliveredAt,
                                    ).toLocaleDateString("es-CL")
                                  ) : (
                                    <span className="italic text-muted">
                                      Pendiente
                                    </span>
                                  )}
                                </dd>
                              </div>
                              {kiln.controller && (
                                <>
                                  {isAdmin && (
                                    <div>
                                      <dt className="text-xs font-bold uppercase text-muted">
                                        Actividad
                                      </dt>
                                      <dd className="mt-1">
                                        {getControllerActivityLabel(
                                          kiln.controller.activityStatus,
                                        )}
                                      </dd>
                                    </div>
                                  )}
                                  <div>
                                    <dt className="text-xs font-bold uppercase text-muted">
                                      Switch
                                    </dt>
                                    <dd className="mt-1">
                                      {getSwitchLabel(
                                        kiln.controller.switchType,
                                      )}{" "}
                                      {kiln.controller.switchCurrentCapacity} A
                                    </dd>
                                  </div>
                                </>
                              )}
                            </dl>
                            {(isAdmin || !kiln.controller) && (
                              <div className="mt-5 grid items-end gap-3 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-3">
                              {kiln.controller ? (
                                isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => detach(kiln)}
                                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-control-border bg-surface px-4 text-sm font-medium hover:bg-surface-hover"
                                  >
                                    <LuUnlink className="text-base" /> Desvincular
                                    controlador
                                  </button>
                                )
                              ) : (
                                isAdmin ? (
                                  <SearchableCatalogField
                                    label="Asociar controlador"
                                    value=""
                                    options={availableControllerOptions}
                                    onSelect={(controllerId) =>
                                      attach(kiln, controllerId)
                                    }
                                    placeholder="Selecciona un controlador"
                                    searchPlaceholder="Buscar por ID o cliente"
                                    searchPrompt="Busca un controlador por sus últimos 6 dígitos o cliente, si está disponible."
                                    noResultsMessage="No encontramos controladores disponibles para esa búsqueda."
                                    listboxLabel="Controladores disponibles"
                                    getSearchText={(option) => option.searchText}
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAssociationKiln(kiln);
                                      setAssociationControllerId("");
                                    }}
                                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-control-border bg-surface px-4 text-sm font-medium hover:bg-surface-hover"
                                  >
                                    Asociar controlador
                                  </button>
                                )
                              )}
                              {isAdmin &&
                                (kiln.user ? (
                                  <button
                                    type="button"
                                    onClick={() => release(kiln)}
                                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-control-border bg-surface px-4 text-sm font-medium hover:bg-surface-hover"
                                  >
                                    <LuUserRoundMinus className="text-base" />{" "}
                                    Liberar propiedad
                                  </button>
                                ) : (
                                  <label className="w-full text-sm font-medium text-muted">
                                    Asignación excepcional
                                    <select
                                      disabled={!kiln.controller}
                                      defaultValue=""
                                      onChange={(event) =>
                                        assign(kiln, event.target.value)
                                      }
                                      className="mt-2 w-full rounded-lg border border-control-border bg-field px-3 py-2.5 text-content disabled:opacity-40"
                                    >
                                      <option value="">
                                        Selecciona un cliente
                                      </option>
                                      {clients.map((client) => (
                                        <option
                                          key={client.userId}
                                          value={client.userId}
                                        >
                                          {client.name}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                ))}
                              {isAdmin && (
                                <Link
                                  to={`/management/kilns/${kiln.kilnId}/history`}
                                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-control-border bg-surface px-4 text-sm font-medium hover:bg-surface-hover"
                                >
                                  <LuHistory className="text-base" /> Ver
                                  historial
                                </Link>
                              )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              {!loading && kilns.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted">
                    No se encontraron hornos.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted">
                    Cargando hornos...
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
        isOpen={Boolean(controllerInfo)}
        onClose={() => setControllerInfo(null)}
        title="Información del controlador"
        fields={[]}
        onSubmit={() => {}}
        showSubmit={false}
        cancelLabel="Cerrar"
        renderContent={() => {
          const items = [
            ["ID", controllerInfo?.controllerCode || "No disponible", true],
            [
              "Switch",
              controllerInfo
                ? `${getSwitchLabel(controllerInfo.switchType)} ${controllerInfo.switchCurrentCapacity} A`
                : "No disponible",
            ],
            [
              "Conexión",
              getControllerConnectionLabel(controllerInfo?.connectionStatus),
            ],
            [
              "Estado",
              getOperationalStatusLabel(controllerInfo?.operationalStatus),
            ],
            [
              "Temperatura",
              controllerInfo?.temperature == null
                ? "No disponible"
                : `${controllerInfo.temperature.toFixed(1)} °C`,
            ],
            ["Firmware", controllerInfo?.firmwareVersion || "Sin registro"],
            [
              "Fabricación",
              controllerInfo?.manufacturedAt
                ? new Date(controllerInfo.manufacturedAt).toLocaleDateString(
                    "es-CL",
                  )
                : "Sin registro",
            ],
            [
              "Entrega",
              controllerInfo?.deliveredAt
                ? new Date(controllerInfo.deliveredAt).toLocaleDateString(
                    "es-CL",
                  )
                : "Pendiente",
            ],
            [
              "Actualización de firmware",
              controllerInfo?.firmwareUpdatedAt
                ? new Date(controllerInfo.firmwareUpdatedAt).toLocaleDateString(
                    "es-CL",
                  )
                : "Sin registro",
            ],
          ];

          return (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
              {items.map(([label, value, mono]) => (
                <div key={label} className={label === "ID" ? "col-span-2" : ""}>
                  <dt className="text-xs font-bold uppercase text-muted">
                    {label}
                  </dt>
                  <dd
                    className={`mt-1 break-words ${mono ? "break-all font-mono text-xs" : ""}`}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          );
        }}
      />

      <Modal
        isOpen={!isAdmin && Boolean(associationKiln)}
        onClose={closeAssociationModal}
        title="Asociar controlador"
        fields={[]}
        onSubmit={() =>
          attach(associationKiln, associationControllerId)
        }
        submitLabel="Confirmar vinculación"
        submitDisabled={!associationControllerId}
        loading={associationLoading}
        renderContent={() => (
          <div className="space-y-4">
            <p className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-secondary">
              Horno seleccionado:{" "}
              <span className="font-mono text-content">
                {associationKiln?.kilnId}
              </span>
            </p>
            <p className="text-sm text-secondary">
              Busca un controlador por sus últimos 6 dígitos o cliente, si está
              disponible.
            </p>
            <SearchableCatalogField
              label="Controlador disponible"
              value={associationControllerId}
              options={
                associationKiln
                  ? getAvailableControllerOptions(associationKiln)
                  : []
              }
              onSelect={setAssociationControllerId}
              placeholder="Selecciona un controlador"
              searchPlaceholder="Buscar por ID o cliente"
              searchPrompt="Escribe los últimos 6 dígitos o el nombre del cliente para buscar controladores."
              noResultsMessage="No encontramos controladores disponibles para esa búsqueda."
              listboxLabel="Controladores disponibles"
              getSearchText={(option) => option.searchText}
              disabled={associationLoading}
              renderOption={(option) => (
                <span className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-content">
                      {option.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {option.secondary}
                    </span>
                  </span>
                  <Badge
                    style={
                      OPERATIONAL_STATUS_STYLES[option.operationalStatus]
                    }
                    text={getOperationalStatusLabel(
                      option.operationalStatus,
                    )}
                  />
                </span>
              )}
            />
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
        message={`El horno ${selectedKiln?.name || "seleccionado"} será eliminado permanentemente si no conserva información histórica.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isLoading={loading}
      />
    </div>
  );
}
