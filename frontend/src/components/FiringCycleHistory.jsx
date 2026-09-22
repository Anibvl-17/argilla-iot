import { useCallback, useEffect, useState } from "react";
import { LuEye, LuX } from "react-icons/lu";
import Pagination from "./Pagination";
import TelemetryChart from "./TelemetryChart";
import { useFiringRealtime } from "@hooks/useFiringRealtime";

const FIRING_STATUS_LABELS = {
  RUNNING: "En ejecución",
  PAUSED: "Pausada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  ERROR: "Error",
  UNKNOWN: "Resultado desconocido",
};

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

function CycleModal({
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
        aria-labelledby="admin-cycle-modal-title"
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-dialog sm:max-h-[calc(100dvh-2rem)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface-muted px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <h2 id="admin-cycle-modal-title" className="text-lg font-semibold sm:text-xl">
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
                  <th className="px-2 py-3 text-center font-medium sm:px-4">Etapa</th>
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
                        <td className="px-2 py-2.5 text-center sm:px-4 sm:py-3">
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
                        <td className="whitespace-nowrap px-2 py-2.5 sm:px-4 sm:py-3">
                          {item.temperature.toFixed(1)} °C
                        </td>
                        <td className="whitespace-nowrap px-2 py-2.5 sm:px-4 sm:py-3">
                          {item.setpointTemperature.toFixed(1)} °C
                        </td>
                        <td className="whitespace-nowrap px-2 py-2.5 sm:px-4 sm:py-3">
                          {item.switchState ? "Activo" : "Inactivo"}
                        </td>
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

export default function FiringCycleHistory({
  kilnId,
  getCycles,
  getTelemetry,
}) {
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [telemetry, setTelemetry] = useState([]);
  const [chartTelemetry, setChartTelemetry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [cyclePagination, setCyclePagination] = useState({ page: 1, totalPages: 1 });
  const [telemetryPagination, setTelemetryPagination] = useState({ page: 1, totalPages: 1 });

  const fetchCycles = useCallback(
    async (page = 1) => {
      setLoading(true);
      const result = await getCycles(kilnId, page, 10);
      setLoading(false);
      if (!result.success) return;
      const items = result.data.items || [];
      setCycles(items);
      setCyclePagination(result.data.pagination || { page: 1, totalPages: 1 });
      setSelectedCycle((current) =>
        current
          ? items.find(({ firingCycleId }) => firingCycleId === current.firingCycleId) || current
          : null,
      );
    },
    [getCycles, kilnId],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchCycles(1);
  }, [fetchCycles]);

  useFiringRealtime(
    useCallback(
      (event) => {
        if (event.kilnId === Number(kilnId)) void fetchCycles(1);
      },
      [fetchCycles, kilnId],
    ),
  );

  const fetchTelemetry = useCallback(
    async (page = 1, cycleId = selectedCycle?.firingCycleId) => {
      if (!cycleId) return;
      setTelemetryLoading(true);
      const result = await getTelemetry(kilnId, cycleId, page, 10);
      setTelemetryLoading(false);
      if (result.success) {
        setTelemetry(result.data.items || []);
        setTelemetryPagination(result.data.pagination || { page: 1, totalPages: 1 });
      }
    },
    [getTelemetry, kilnId, selectedCycle?.firingCycleId],
  );

  const fetchChart = useCallback(
    async (cycleId) => {
      setChartLoading(true);
      const first = await getTelemetry(kilnId, cycleId, 1, 100);
      if (!first.success) {
        setChartTelemetry([]);
        setChartLoading(false);
        return;
      }
      const items = [...(first.data.items || [])];
      const totalPages = first.data.pagination?.totalPages || 1;
      if (totalPages > 1) {
        const remaining = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            getTelemetry(kilnId, cycleId, index + 2, 100),
          ),
        );
        remaining.forEach((result) => {
          if (result.success) items.push(...(result.data.items || []));
        });
      }
      setChartTelemetry(items);
      setChartLoading(false);
    },
    [getTelemetry, kilnId],
  );

  function openCycle(cycle) {
    setSelectedCycle(cycle);
    setTelemetry([]);
    setChartTelemetry([]);
    void fetchTelemetry(1, cycle.firingCycleId);
    void fetchChart(cycle.firingCycleId);
  }

  function closeCycle() {
    setSelectedCycle(null);
    setTelemetry([]);
    setChartTelemetry([]);
  }

  return (
    <section className="rounded-2xl border border-border bg-surface">
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
            {cycles.length ? (
              cycles.map((cycle) => (
                <tr key={cycle.firingCycleId}>
                  <td className="whitespace-nowrap px-4 py-3 sm:px-6">
                    {formatDate(cycle.startedAt)}
                  </td>
                  <td className="px-4 py-3 sm:px-6">
                    {cycle.program?.name || "Programa no disponible"}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 sm:table-cell sm:px-6">
                    {formatDuration(cycle.startedAt, cycle.endedAt)}
                  </td>
                  <td className="px-4 py-3 sm:px-6">
                    {FIRING_STATUS_LABELS[cycle.status] || cycle.status}
                  </td>
                  <td className="px-4 py-3 text-center sm:px-6">
                    <button
                      type="button"
                      aria-label={`Ver detalle del ciclo ${cycle.firingCycleId}`}
                      className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-accent transition-colors hover:bg-surface-hover sm:px-3"
                      onClick={() => openCycle(cycle)}
                    >
                      <LuEye />
                      <span className="hidden md:inline">Ver detalle</span>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-10 text-center text-muted">
                  {loading ? "Cargando ciclos…" : "Sin ciclos registrados."}
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

      <CycleModal
        cycle={selectedCycle}
        telemetry={telemetry}
        chartTelemetry={chartTelemetry}
        loading={telemetryLoading}
        chartLoading={chartLoading}
        pagination={telemetryPagination}
        onPageChange={(page) => fetchTelemetry(page, selectedCycle?.firingCycleId)}
        onClose={closeCycle}
      />
    </section>
  );
}
