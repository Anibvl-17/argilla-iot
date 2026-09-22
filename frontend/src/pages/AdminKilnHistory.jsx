import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LuArrowLeft } from "react-icons/lu";
import { Badge } from "@components/Badge";
import ControllerStatus from "@components/ControllerStatus";
import FiringCycleHistory from "@components/FiringCycleHistory";
import { useControllerRealtime } from "@hooks/useControllerRealtime";
import {
  getAdminKiln,
  getAdminKilnCycles,
  getAdminKilnCycleTelemetry,
} from "@services/kiln.service";
import { getControllerConnectionLabel } from "@constants/controller.constants";

export default function AdminKilnHistory() {
  const { kilnId } = useParams();
  const [kiln, setKiln] = useState(null);
  const [loading, setLoading] = useState(true);
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

  useControllerRealtime(
    useCallback((event) => {
      setKiln((current) =>
        current?.controller?.controllerId === event.controllerId
          ? { ...current, controller: { ...current.controller, ...event } }
          : current,
      );
    }, []),
  );

  if (loading) {
    return (
      <div className="py-20 text-center text-muted">Cargando horno...</div>
    );
  }

  if (error || !kiln) {
    return (
      <div className="rounded-2xl border border-danger-border bg-danger-soft p-6 text-danger">
        <p className="font-semibold">No fue posible cargar el historial.</p>
        <p className="mt-2 text-sm text-danger">{error}</p>
        <Link
          to="/management/kilns"
          className="mt-5 inline-flex items-center gap-2 text-sm text-content"
        >
          <LuArrowLeft /> Volver a hornos
        </Link>
      </div>
    );
  }

  const controller = kiln.controller;

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 space-y-5">
      <Link
        to="/management/kilns"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-content"
      >
        <LuArrowLeft /> Volver a hornos
      </Link>

      <header className="flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
            Historial del horno
          </p>
          <h1 className="mt-2 wrap-break-word text-2xl font-semibold sm:text-3xl">
            {kiln.name || `Horno #${kiln.kilnId}`}
          </h1>
          <p className="mt-1 text-sm text-muted">
            #{kiln.kilnId} - {kiln.user?.name || "Sin propietario"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            style={
              controller?.connectionStatus === "ONLINE" ? "info" : "default"
            }
            text={
              controller
                ? getControllerConnectionLabel(controller.connectionStatus)
                : "Sin controlador"
            }
          />
          {controller?.connectionStatus === "ONLINE" && (
            <ControllerStatus controller={controller} />
          )}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        <Metric label="Capacidad" value={`${kiln.liters} L`} />
        <Metric label="Amperaje" value={`${kiln.nominalCurrent} A`} />
        <Metric label="Voltaje" value={`${kiln.nominalVoltage} V`} />
        <Metric label="Quemas realizadas" value={kiln.firingCycleCount ?? 0} />
        <Metric
          label="Controlador"
          value={
            controller ? `...${controller.controllerCode}` : "Sin vincular"
          }
          mono
        />
      </section>

      <FiringCycleHistory
        kilnId={kilnId}
        getCycles={getAdminKilnCycles}
        getTelemetry={getAdminKilnCycleTelemetry}
      />
    </div>
  );
}

function Metric({ label, value, mono = false }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-surface p-3 sm:p-5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted sm:text-xs">
        {label}
      </p>
      <p
        className={`mt-1 truncate text-base font-semibold text-content sm:text-xl ${mono ? "font-mono" : ""}`}
        title={String(value)}
      >
        {value}
      </p>
    </div>
  );
}
