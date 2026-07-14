import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Pagination from "@components/Pagination";
import { Badge } from "@components/Badge";
import { useControllerRealtime } from "@hooks/useControllerRealtime";
import {
  getAdminKiln,
  getAdminKilnTelemetry,
} from "@services/kiln.service";
import {
  getControllerConnectionLabel,
  getControllerOperationLabel,
} from "@constants/controller.constants";
import { LuArrowLeft, LuHistory } from "react-icons/lu";

export default function AdminKilnHistory() {
  const { kilnId } = useParams();
  const [kiln, setKiln] = useState(null);
  const [telemetry, setTelemetry] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [telemetryLoading, setTelemetryLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getAdminKiln(kilnId).then((result) => {
      if (!active) return;
      if (result.success) setKiln(result.data);
      else setError(result.message);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [kilnId]);

  const fetchTelemetry = useCallback(async (page = 1) => {
    setTelemetryLoading(true);
    const result = await getAdminKilnTelemetry(kilnId, page, 10);
    if (result.success) {
      setTelemetry(result.data.items || []);
      setPagination(result.data.pagination || { page: 1, totalPages: 1 });
    } else {
      setError(result.message);
    }
    setTelemetryLoading(false);
  }, [kilnId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTelemetry(1);
  }, [fetchTelemetry]);

  const handleTelemetry = useCallback((event) => {
    setKiln((current) =>
      current?.controller?.controllerId === event.controllerId
        ? { ...current, controller: { ...current.controller, ...event } }
        : current,
    );

    if (event.kilnId === Number(kilnId) && event.telemetrySaved) {
      fetchTelemetry(1);
    }
  }, [fetchTelemetry, kilnId]);

  useControllerRealtime(handleTelemetry);

  if (loading) {
    return <div className="py-20 text-center text-neutral-400">Cargando horno...</div>;
  }

  if (error || !kiln) {
    return (
      <div className="rounded-2xl border border-red-900/60 bg-red-950/20 p-6 text-red-300">
        <p className="font-semibold">No fue posible cargar el historial.</p>
        <p className="mt-2 text-sm text-red-200/70">{error}</p>
        <Link to="/admin/kilns" className="mt-5 inline-flex items-center gap-2 text-sm text-white">
          <LuArrowLeft /> Volver a hornos
        </Link>
      </div>
    );
  }

  const controller = kiln.controller;

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 space-y-5">
      <Link
        to="/admin/kilns"
        className="inline-flex items-center gap-2 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
      >
        <LuArrowLeft /> Volver a hornos
      </Link>

      <header className="flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-red-500">
            Historial del horno
          </p>
          <h1 className="mt-2 wrap-break-word text-2xl font-semibold sm:text-3xl">
            {kiln.name || `Horno #${kiln.kilnId}`}
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            #{kiln.kilnId} - {kiln.user?.name || "Sin propietario"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            style={controller?.connectionStatus === "ONLINE" ? "info" : "default"}
            text={
              controller
                ? getControllerConnectionLabel(controller.connectionStatus)
                : "Sin controlador"
            }
          />
          {controller?.connectionStatus === "ONLINE" && (
            <Badge
              style={controller.operativeStatus === "ON" ? "success" : "default"}
              text={getControllerOperationLabel(controller.operativeStatus)}
            />
          )}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
        <Metric label="Capacidad" value={`${kiln.liters} L`} />
        <Metric label="Amperaje" value={`${kiln.amps} A`} />
        <Metric label="Voltaje" value={`${kiln.volts} V`} />
        <Metric
          label="Controlador"
          value={controller ? `...${controller.controllerId.slice(-6)}` : "Sin vincular"}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-neutral-800 bg-[#141414] shadow-xl">
        <div className="flex items-start gap-3 border-b border-neutral-800 p-4 sm:p-6">
          <LuHistory className="mt-0.5 shrink-0 text-xl text-red-500" />
          <div>
            <h2 className="font-semibold">Historial de temperatura</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Registros paginados de temperatura y estado del switch.
            </p>
          </div>
        </div>
        <div className="max-h-[60dvh] overflow-auto">
          <table className="w-full min-w-120 text-left text-xs sm:text-sm">
            <thead className="sticky top-0 z-10 border-b border-neutral-800 bg-[#0a0a0a] text-xs uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-3 py-3 font-medium sm:px-6">Fecha</th>
                <th className="px-3 py-3 text-center font-medium sm:px-6">Temperatura</th>
                <th className="px-3 py-3 text-center font-medium sm:px-6">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {telemetry.length > 0 ? (
                telemetry.map((item) => (
                  <tr key={item.telemetryId}>
                    <td className="px-3 py-3 text-neutral-300 sm:px-6">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-neutral-200 sm:px-6">
                      {item.temperature.toFixed(1)} °C
                    </td>
                    <td className="px-3 py-3 text-center text-neutral-300 sm:px-6">
                      {item.switchState ? "Encendido" : "Apagado"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center text-neutral-500">
                    {telemetryLoading ? "Cargando historial..." : "Sin registros de telemetría."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={fetchTelemetry}
        />
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-neutral-800 bg-[#141414] p-3 sm:p-5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500 sm:text-xs">
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-base font-semibold text-neutral-100 sm:text-xl" title={value}>
        {value}
      </p>
    </div>
  );
}
