import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LuArrowLeft, LuCircuitBoard, LuCopy, LuEye, LuX } from "react-icons/lu";
import ControllerStatus from "@components/ControllerStatus";
import FiringControls from "@components/FiringControls";
import Pagination from "@components/Pagination";
import TelemetryChart from "@components/TelemetryChart";
import { getMyKiln } from "@services/kiln.service";
import {
  getCycleTelemetry,
  getFiringContext,
  getFiringCycles,
  getPrograms,
} from "@services/firing.service";
import { useControllerRealtime } from "@hooks/useControllerRealtime";
import { useFiringRealtime } from "@hooks/useFiringRealtime";
import {
  getControllerActivityLabel,
  getControllerConnectionLabel,
} from "@constants/controller.constants";
import { SWITCH_LABELS } from "../constants/controller.constants";
import { toast } from "sonner";

const FIRING_STATUS_LABELS = {
  RUNNING: "En ejecución",
  PAUSED: "Pausada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  ERROR: "Error",
  UNKNOWN: "Resultado desconocido",
};

function Detail({ label, value, canCopy }) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted p-4">
      <dt className="text-sm font-medium text-muted">{label}</dt>
      <dd className="flex items-center gap-2 mt-1 font-medium text-content">
        {value}
        {canCopy && (
          <button
            className="text-sm hover:cursor-pointer hover:text-accent"
            title="Copiar ID"
            onClick={() => {
              navigator.clipboard.writeText(value.slice(3));
              toast.success("¡ID copiada!");
            }}
          >
            <LuCopy />
          </button>
        )}
      </dd>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString("es-CL") : "-";
}

function formatDuration(startedAt, endedAt) {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "-";
  const totalMinutes = Math.floor((end - start) / 60_000);
  if (totalMinutes < 1) return "< 1 min";
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return [
    days ? `${days} d` : null,
    hours ? `${hours} h` : null,
    minutes || (!days && !hours) ? `${minutes} min` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function CycleDetail({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="font-semibold text-content">{label}</dt>
      <dd className="mt-1 wrap-break-word text-secondary">{value}</dd>
    </div>
  );
}

function TelemetryModal({
  cycle,
  telemetry,
  chartTelemetry,
  loading,
  chartLoading,
  pagination,
  onPageChange,
  onClose,
}) {
  if (!cycle) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-2 backdrop-blur-sm sm:p-4"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="telemetry-modal-title"
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-dialog sm:max-h-[calc(100dvh-2rem)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface-muted px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <h2 id="telemetry-modal-title" className="text-lg font-semibold sm:text-xl">
              Detalle del ciclo
            </h2>
            <p className="mt-1 text-sm text-muted">Ciclo #{cycle.firingCycleId}</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar detalle del ciclo"
            onClick={onClose}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-content"
          >
            <LuX />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto">
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4 border-b border-border px-4 py-5 sm:grid-cols-3 sm:px-6 lg:grid-cols-5">
            <CycleDetail label="Inicio" value={formatDateTime(cycle.startedAt)} />
            <CycleDetail label="Término" value={formatDateTime(cycle.endedAt)} />
            <CycleDetail label="Duración" value={formatDuration(cycle.startedAt, cycle.endedAt)} />
            <CycleDetail label="Estado" value={FIRING_STATUS_LABELS[cycle.status] || cycle.status} />
            <CycleDetail label="Programa" value={cycle.program?.name || "No disponible"} />
          </dl>

          <section className="border-b border-border px-4 py-5 sm:px-6">
            <h3 className="mb-3 font-semibold">Temperatura del ciclo</h3>
            {chartTelemetry.length ? (
              <TelemetryChart telemetry={chartTelemetry} />
            ) : (
              <p className="py-8 text-center text-sm text-muted">
                {chartLoading ? "Cargando gráfico…" : "Sin muestras para graficar."}
              </p>
            )}
          </section>

          <div className="overflow-x-auto">
            <table className="w-full min-w-120 text-left text-xs sm:text-sm">
              <thead className="border-b border-border bg-surface-muted text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-2 py-3 font-medium sm:px-4 text-center">Etapa</th>
                  <th className="px-2 py-3 font-medium sm:px-4">Hora</th>
                  <th className="px-2 py-3 font-medium sm:px-4">Temperatura</th>
                  <th className="px-2 py-3 font-medium sm:px-4">Setpoint</th>
                  <th className="px-2 py-3 font-medium sm:px-4">Switch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {telemetry.length ? (
                  telemetry.map((item) => {
                    const timestamp = new Date(item.timestamp);
                    return (
                      <tr key={item.telemetryId}>
                        <td className="text-center px-2 py-2.5 sm:px-4 sm:py-3">
                          {item.stageIndex == null ? "-" : item.stageIndex + 1}
                        </td>
                        <td className="px-2 py-2.5 sm:px-4 sm:py-3">
                          <span className="block whitespace-nowrap font-medium">
                            {timestamp.toLocaleTimeString("es-CL", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                          <span className="mt-0.5 hidden text-xs text-muted sm:block">
                            {timestamp.toLocaleDateString("es-CL")}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2.5 sm:px-4 sm:py-3">{item.temperature.toFixed(1)} °C</td>
                        <td className="whitespace-nowrap px-2 py-2.5 sm:px-4 sm:py-3">{item.setpointTemperature.toFixed(1)} °C</td>
                        <td className="whitespace-nowrap px-2 py-2.5 sm:px-4 sm:py-3">{item.switchState ? "Activo" : "Inactivo"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-muted">
                      {loading ? "Cargando…" : "Sin muestras históricas."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={onPageChange}
          />
        </div>
      </section>
    </div>
  );
}

export default function KilnDetails() {
  const { kilnId } = useParams();
  const [kiln, setKiln] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [programs, setPrograms] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [telemetry, setTelemetry] = useState([]);
  const [chartTelemetry, setChartTelemetry] = useState([]);
  const [cyclePagination, setCyclePagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [telemetryPagination, setTelemetryPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);

  const fetchKiln = useCallback(async () => {
    const [result, context] = await Promise.all([
      getMyKiln(kilnId),
      getFiringContext(kilnId),
    ]);
    if (result.success) {
      setKiln({
        ...result.data,
        ...(context.success
          ? { reconciliation: context.data.reconciliation }
          : {}),
      });
    }
    else setError(result.message);
    setLoading(false);
  }, [kilnId]);

  const fetchCycles = useCallback(
    async (page = 1) => {
      const result = await getFiringCycles(kilnId, page, 10);
      if (result.success) {
        const items = result.data.items || [];
        setCycles(items);
        setCyclePagination(result.data.pagination);
        setSelectedCycle((current) =>
          current
            ? items.find(
                ({ firingCycleId }) => firingCycleId === current.firingCycleId,
              ) || null
            : null,
        );
      }
    },
    [kilnId],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchKiln();
    void fetchCycles(1);
    getPrograms().then((result) => {
      if (result.success) setPrograms(result.data || []);
    });
  }, [fetchCycles, fetchKiln]);

  const fetchTelemetry = useCallback(
    async (page = 1, cycleId = selectedCycle?.firingCycleId) => {
      if (!cycleId) {
        setTelemetry([]);
        return;
      }
      setTelemetryLoading(true);
      const result = await getCycleTelemetry(kilnId, cycleId, page, 10);
      setTelemetryLoading(false);
      if (result.success) {
        setTelemetry(result.data.items || []);
        setTelemetryPagination(result.data.pagination);
      }
    },
    [kilnId, selectedCycle?.firingCycleId],
  );

  const fetchTelemetryChart = useCallback(
    async (cycleId) => {
      if (!cycleId) {
        setChartTelemetry([]);
        return;
      }
      setChartLoading(true);
      const firstResult = await getCycleTelemetry(kilnId, cycleId, 1, 100);
      if (!firstResult.success) {
        setChartTelemetry([]);
        setChartLoading(false);
        return;
      }
      const allItems = [...(firstResult.data.items || [])];
      const totalPages = firstResult.data.pagination?.totalPages || 1;
      if (totalPages > 1) {
        const remaining = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            getCycleTelemetry(kilnId, cycleId, index + 2, 100),
          ),
        );
        remaining.forEach((result) => {
          if (result.success) allItems.push(...(result.data.items || []));
        });
      }
      setChartTelemetry(allItems);
      setChartLoading(false);
    },
    [kilnId],
  );

  const handleTelemetry = useCallback(
    (telemetry) => {
      setKiln((current) => {
        if (current?.controller?.controllerCode !== telemetry.controllerCode)
          return current;
        const nextKiln = {
          ...current,
          controller: { ...current.controller, ...telemetry },
          ...(telemetry.firingStateConfirmed
            ? { reconciliation: { ready: true, reason: null } }
            : {}),
        };
        return nextKiln;
      });
      if (
        telemetry.telemetrySaved &&
        telemetry.kilnId === Number(kilnId) &&
        telemetry.controllerCycleId === selectedCycle?.controllerCycleId
      ) {
        void fetchTelemetry(1, selectedCycle.firingCycleId);
        void fetchTelemetryChart(selectedCycle.firingCycleId);
      }
    },
    [fetchTelemetry, fetchTelemetryChart, kilnId, selectedCycle],
  );

  useControllerRealtime(handleTelemetry);
  const handleFiringUpdate = useCallback(
    (event) => {
      if (event.kilnId !== Number(kilnId)) return;
      setKiln((current) =>
        current
          ? {
              ...current,
              ...(event.reconciliation
                ? { reconciliation: event.reconciliation }
                : {}),
              ...(!event.reconciliation || event.reconciliation.ready || event.cycle
                ? {
                    activeFiringCycle: ["RUNNING", "PAUSED"].includes(
                      event.cycle?.status,
                    )
                      ? event.cycle
                      : null,
                  }
                : {}),
            }
          : current,
      );
      void fetchCycles(1);
    },
    [fetchCycles, kilnId],
  );
  useFiringRealtime(handleFiringUpdate);

  if (loading)
    return (
      <div className="py-20 text-center text-muted">Cargando horno...</div>
    );
  if (error || !kiln)
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-danger-border bg-danger-soft p-6">
        <h1 className="font-semibold text-danger">Horno no encontrado</h1>
        <p className="mt-2 text-sm text-danger">{error}</p>
        <Link
          to="/kilns"
          className="mt-5 inline-flex items-center gap-2 text-sm text-content"
        >
          <LuArrowLeft /> Volver a mis hornos
        </Link>
      </div>
    );

  const controller = kiln.controller;

  function openCycleDetails(cycle) {
    setSelectedCycle(cycle);
    setTelemetry([]);
    setChartTelemetry([]);
    void fetchTelemetry(1, cycle.firingCycleId);
    void fetchTelemetryChart(cycle.firingCycleId);
  }

  function closeCycleDetails() {
    setSelectedCycle(null);
    setTelemetry([]);
    setChartTelemetry([]);
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <Link
        to="/kilns"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-content"
      >
        <LuArrowLeft /> Volver a mis hornos
      </Link>
      <div className="flex min-w-0 flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
            Detalle del horno
          </p>
          <h1 className="mt-2 min-w-0 wrap-break-word text-2xl font-semibold tracking-tight sm:text-3xl">
            {kiln.name}
          </h1>
        </div>
        <ControllerStatus controller={controller} />
      </div>

      {controller && (
        <section className="mt-6 rounded-2xl border border-border bg-surface p-4 sm:p-6">
          <h2 className="mb-3 text-lg font-semibold">Programa y control de quema</h2>
          <FiringControls
            kiln={kiln}
            programs={programs}
            onRefresh={async () => {
              await fetchKiln();
              await fetchCycles(1);
            }}
          />
        </section>
      )}

      <section className="mt-5 rounded-2xl border border-border bg-surface p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Información del horno</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Detail label="Capacidad" value={`${kiln.liters} litros`} />
          <Detail label="Amperaje" value={`${kiln.nominalCurrent} A`} />
          <Detail label="Voltaje" value={`${kiln.nominalVoltage} V`} />
          <Detail
            label="Fases"
            value={kiln.phaseCount === 1 ? "Monofásico" : "Trifásico"}
          />
          <Detail
            label="Quemas realizadas"
            value={kiln.firingCycleCount ?? cyclePagination.total ?? 0}
          />
        </dl>
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-surface p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-soft text-accent">
            <LuCircuitBoard />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Controlador</h2>
            <p className="text-sm font-medium text-muted">
              Información técnica y estado actual
            </p>
          </div>
        </div>
        {controller ? (
          <>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Detail
                label="Temperatura"
                value={
                  controller.temperature == null
                    ? "No disponible"
                    : `${controller.temperature.toFixed(1)} °C`
                }
              />
              <Detail
                label="Actividad"
                value={getControllerActivityLabel(controller.activityStatus)}
              />
              <Detail
                label="Conexión"
                value={getControllerConnectionLabel(
                  controller.connectionStatus,
                )}
              />
              <span className="font-mono">
                <Detail
                  label="Identificador"
                  canCopy
                  value={`...${controller.controllerCode}`}
                />
              </span>
              <Detail
                label="Tipo de switch"
                value={SWITCH_LABELS[controller.switchType]}
              />
              <Detail
                label="Amperaje soportado"
                value={`${controller.switchCurrentCapacity} A`}
              />
            </dl>
          </>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-control-border p-8 text-center font-medium text-muted">
            Este horno no tiene un controlador vinculado.
          </div>
        )}
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-surface">
        <div className="flex flex-col gap-1 border-b border-border p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Historial de ciclos</h2>
          <p className="text-sm text-muted">
            Revisa el detalle y las muestras históricas de cada ciclo.
          </p>
        </div>
        <div className="overflow-auto">
          <table className="w-full table-fixed text-left text-sm sm:table-auto">
            <thead className="border-b border-border bg-surface-muted text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 font-medium sm:px-6">Inicio</th>
                <th className="px-4 py-3 font-medium sm:px-6">Programa</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell sm:px-6">Duración</th>
                <th className="px-4 py-3 font-medium sm:px-6">Estado</th>
                <th className="px-4 py-3 text-center font-medium sm:px-6">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cycles.length > 0 ? (
                cycles.map((cycle) => (
                  <tr key={cycle.firingCycleId}>
                    <td className="whitespace-nowrap px-4 py-3 sm:px-6">{formatDate(cycle.startedAt)}</td>
                    <td className="px-4 py-3 sm:px-6">{cycle.program?.name || "Programa no disponible"}</td>
                    <td className="hidden whitespace-nowrap px-4 py-3 sm:table-cell sm:px-6">{formatDuration(cycle.startedAt, cycle.endedAt)}</td>
                    <td className="px-4 py-3 sm:px-6">{FIRING_STATUS_LABELS[cycle.status] || cycle.status}</td>
                    <td className="px-4 py-3 text-center sm:px-6">
                      <button
                        type="button"
                        aria-label={`Ver detalle del ciclo ${cycle.firingCycleId}`}
                        className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-accent transition-colors hover:bg-surface-hover sm:px-3"
                        onClick={() => openCycleDetails(cycle)}
                      >
                        <LuEye />
                        <span className="hidden md:inline">Ver detalle</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-muted">
                    Sin ciclos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={cyclePagination.page}
          totalPages={cyclePagination.totalPages}
          onPageChange={fetchCycles}
        />
      </section>

      <TelemetryModal
        cycle={selectedCycle}
        telemetry={telemetry}
        chartTelemetry={chartTelemetry}
        loading={telemetryLoading}
        chartLoading={chartLoading}
        pagination={telemetryPagination}
        onPageChange={(page) =>
          fetchTelemetry(page, selectedCycle?.firingCycleId)
        }
        onClose={closeCycleDetails}
      />
    </div>
  );
}
