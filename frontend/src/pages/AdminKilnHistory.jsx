import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LuArrowLeft } from "react-icons/lu";
import { Badge } from "@components/Badge";
import ControllerStatus from "@components/ControllerStatus";
import {
  ControllerEquipmentDetails,
  KilnEquipmentDetails,
} from "@components/EquipmentInformation";
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

      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Información del equipo</h2>
        <div className="mt-5 grid gap-7 lg:grid-cols-2 lg:gap-0">
          <div className="min-w-0 lg:border-r lg:border-border lg:pr-8">
            <h3 className="font-semibold">Información del horno</h3>
            <KilnEquipmentDetails
              kiln={kiln}
              controller={controller}
              showFiringCount
              showSwitch={false}
              className="mt-5"
            />
          </div>
          <div className="min-w-0 border-t border-border pt-7 lg:border-t-0 lg:pl-8 lg:pt-0">
            <h3 className="font-semibold">Información del controlador</h3>
            {controller ? (
              <ControllerEquipmentDetails
                controller={controller}
                showLiveDetails
                className="mt-5"
              />
            ) : (
              <p className="mt-5 text-sm text-muted">
                El horno no tiene un controlador vinculado actualmente.
              </p>
            )}
          </div>
        </div>
      </section>

      <FiringCycleHistory
        kilnId={kilnId}
        getCycles={getAdminKilnCycles}
        getTelemetry={getAdminKilnCycleTelemetry}
      />
    </div>
  );
}
