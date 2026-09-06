import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  LuBox,
  LuFlame,
  LuMoveRight,
  LuPlus,
  LuPower,
  LuRadio,
} from "react-icons/lu";
import { useAuth } from "@context/AuthContext";
import {
  getMyKilns,
  sendMyKilnControllerCommand,
} from "@services/kiln.service";
import { useControllerRealtime } from "@hooks/useControllerRealtime";
import ControllerStatus from "@components/ControllerStatus";
import { ROLES } from "../constants/user.constants";
import { getControllerConnectionLabel } from "@constants/controller.constants";
import { SWITCH_LABELS } from "../constants/controller.constants";
import { pairController } from "@services/controller.service";

function applyTelemetry(controller, telemetry) {
  return controller?.controllerCode === telemetry.controllerCode
    ? { ...controller, ...telemetry }
    : controller;
}

export default function Home() {
  const { user } = useAuth();
  const [data, setData] = useState({ kilns: [], unlinkedControllers: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commandLoadingId, setCommandLoadingId] = useState("");
  const [pairing, setPairing] = useState({ partialControllerId: "", pin: "" });
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingError, setPairingError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    getMyKilns().then((result) => {
      if (!active) return;
      if (result.success) setData(result.data);
      else setError(result.message);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const handleTelemetry = useCallback((telemetry) => {
    setData((current) => ({
      kilns: current.kilns.map((kiln) => ({
        ...kiln,
        controller: applyTelemetry(kiln.controller, telemetry),
      })),
      unlinkedControllers: current.unlinkedControllers.map((controller) =>
        applyTelemetry(controller, telemetry),
      ),
    }));
  }, []);

  useControllerRealtime(handleTelemetry);

  async function handleKilnCommand(kiln) {
    if (!kiln.controller) return;

    const command = kiln.controller.switchState ? "OFF" : "ON";
    setCommandLoadingId(String(kiln.kilnId));
    const result = await sendMyKilnControllerCommand(kiln.kilnId, command);
    setCommandLoadingId("");

    if (!result.success) {
      setError(result.message);
    }
  }

  if ([ROLES.ADMIN, ROLES.TECHNICIAN].includes(user.role)) {
    return <Navigate to="/management" replace />;
  }

  async function handlePairing(event) {
    event.preventDefault();
    setPairingLoading(true);
    setPairingError("");
    const result = await pairController(
      pairing.partialControllerId,
      pairing.pin,
    );
    setPairingLoading(false);
    if (!result.success) {
      const details = result.data?.errorDetails;
      setPairingError(
        typeof details === "object" && details?.blockedUntil
          ? `Vinculación bloqueada hasta ${new Date(details.blockedUntil).toLocaleString("es-CL")}`
          : details || result.message,
      );
      return;
    }
    setPairing({ partialControllerId: "", pin: "" });
    setReloadKey((value) => value + 1);
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-muted">Cargando tus hornos...</div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-danger-border bg-danger-soft p-6 text-danger">
        <h1 className="font-semibold">No pudimos cargar tus hornos</h1>
        <p className="mt-2 text-sm text-danger">{error}</p>
      </div>
    );
  }

  const hasEquipment =
    data.kilns.length > 0 || data.unlinkedControllers.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-7 sm:gap-10">
      <section>
        <div className="mb-6">
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Mis hornos
          </h1>
          <p className="mt-2 text-secondary">
            Revisa el estado y la información principal de tus hornos.
          </p>
        </div>

        <form
          onSubmit={handlePairing}
          className="mb-6 grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <label className="text-sm font-medium text-muted">
            Últimos 6 caracteres del controlador
            <input
              className="mt-2 w-full rounded-lg border border-control-border bg-field px-3 py-2 text-content uppercase"
              value={pairing.partialControllerId}
              onChange={(event) =>
                setPairing((current) => ({
                  ...current,
                  partialControllerId: event.target.value
                    .replace(/[^0-9a-f]/gi, "")
                    .slice(0, 6),
                }))
              }
              pattern="[0-9a-fA-F]{6}"
              required
            />
          </label>
          <label className="text-sm font-medium text-muted">
            PIN temporal
            <input
              className="mt-2 w-full rounded-lg border border-control-border bg-field px-3 py-2 text-content"
              inputMode="numeric"
              value={pairing.pin}
              onChange={(event) =>
                setPairing((current) => ({
                  ...current,
                  pin: event.target.value.replace(/\D/g, "").slice(0, 6),
                }))
              }
              pattern="\d{6}"
              required
            />
          </label>
          <button
            disabled={pairingLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-action disabled:opacity-60"
          >
            <LuPlus /> {pairingLoading ? "Vinculando..." : "Agregar horno"}
          </button>
        </form>
        {pairingError && (
          <p className="-mt-3 mb-6 rounded-lg border border-danger-border bg-danger-soft p-3 text-sm text-danger">
            {pairingError}
          </p>
        )}

        {!hasEquipment ? (
          <div className="rounded-2xl border border-dashed border-control-border bg-surface-muted px-4 py-10 text-center sm:px-6 sm:py-16">
            <LuFlame className="mx-auto mb-4 text-4xl text-muted" />
            <h2 className="text-lg font-medium">
              Aún no tienes hornos vinculados
            </h2>
            <p className="mt-2 text-sm text-muted">
              Cuando un horno o controlador sea asociado a tu cuenta aparecerá
              aquí.
            </p>
          </div>
        ) : data.kilns.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface-muted p-6 text-muted">
            No tienes hornos vinculados actualmente.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {data.kilns.map((kiln) => (
              <article
                key={kiln.kilnId}
                className="flex justify-between gap-8 min-w-0 flex-col rounded-2xl border border-border bg-surface p-4 shadow-panel  transition-colors hover:border-control-border sm:p-6"
              >
                <div className="flex items-start justify-between gap-4 pb-2 border-b border-b-border">
                  <span className="rounded-xl text-muted">{kiln.name}</span>

                  <span className="flex items-center justify-center gap-1 text-muted">
                    <LuBox />
                    {kiln.liters} litros
                  </span>
                </div>

                <h2 className="truncate text-center">
                  {kiln.controller ? (
                    <span className="text-4xl/relaxed tracking-wide font-bold text-content">
                      {kiln.controller.temperature == null
                        ? "--"
                        : kiln.controller.temperature.toFixed(1)}{" "}
                      °C
                    </span>
                  ) : (
                    <p className="text-secondary">Sin controlador asociado</p>
                  )}
                </h2>

                {kiln.controller && (
                  <div className="text-secondary pb-2 border-b border-b-border">
                    <div
                      className={
                        "flex flex-row items-center " +
                        (kiln.controller?.connectionStatus === "ONLINE"
                          ? "justify-between"
                          : "justify-center")
                      }
                    >
                      <p className="text-sm text-muted">
                        {getControllerConnectionLabel(
                          kiln.controller.connectionStatus,
                        )}
                      </p>
                      {kiln.controller?.connectionStatus === "ONLINE" && (
                        <ControllerStatus controller={kiln.controller} />
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 min-[380px]:flex-row">
                  <button
                    disabled={
                      !kiln.controller ||
                      kiln.controller.connectionStatus !== "ONLINE" ||
                      commandLoadingId === String(kiln.kilnId)
                    }
                    onClick={() => handleKilnCommand(kiln)}
                    title={
                      kiln.controller?.connectionStatus === "OFFLINE"
                        ? "Controlador desconectado"
                        : kiln.controller
                          ? kiln.controller.switchState
                            ? "Apagar horno"
                            : "Encender horno"
                          : "Requiere controlador"
                    }
                    className={
                      "flex flex-1 items-center justify-center gap-2 rounded-lg border border-control-border px-3 py-2.5 text-sm text-content transition-colors disabled:cursor-not-allowed disabled:border-border disabled:text-disabled hover:cursor-pointer " +
                      (kiln.controller?.switchState
                        ? "enabled:hover:bg-danger-soft enabled:hover:text-accent enabled:hover:border-danger-border"
                        : "enabled:hover:bg-success-soft enabled:hover:text-success enabled:hover:border-success-border")
                    }
                  >
                    <LuPower />
                    {commandLoadingId === String(kiln.kilnId)
                      ? "Enviando..."
                      : kiln.controller?.switchState
                        ? "Apagar"
                        : "Encender"}
                  </button>
                  <Link
                    to={`/kilns/${kiln.kilnId}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium transition-colors hover:bg-primary-hover text-on-action"
                  >
                    Ver detalles <LuMoveRight />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {data.unlinkedControllers.length > 0 && (
        <section>
          <div className="mb-5">
            <h2 className="text-xl font-semibold">Controladores sin horno</h2>
            <p className="mt-1 text-sm text-muted">
              Estos controladores pertenecen a tu cuenta, pero aún no están
              asociados a un horno.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.unlinkedControllers.map((controller) => (
              <article
                key={controller.controllerCode}
                className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 font-medium">
                    <LuRadio className="text-accent" /> Controlador ...
                    {controller.controllerCode}
                  </div>
                  <ControllerStatus controller={controller} />
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted">Temperatura</dt>
                    <dd className="mt-1">
                      {controller.temperature == null ||
                      controller.connectionStatus !== "ONLINE"
                        ? "No disponible"
                        : `${controller.temperature.toFixed(1)} °C`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Switch</dt>
                    <dd className="mt-1">
                      {SWITCH_LABELS[controller.switchType]}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Capacidad</dt>
                    <dd className="mt-1">
                      {controller.switchCurrentCapacity} A
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Conexión</dt>
                    <dd className="mt-1">
                      {getControllerConnectionLabel(
                        controller.connectionStatus,
                      )}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
