import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { LuFlame, LuPlus, LuRadio } from "react-icons/lu";
import { useAuth } from "@context/AuthContext";
import { getMyKilns } from "@services/kiln.service";
import { getFiringContext, getPrograms } from "@services/firing.service";
import { useControllerRealtime } from "@hooks/useControllerRealtime";
import { useFiringRealtime } from "@hooks/useFiringRealtime";
import ControllerStatus from "@components/ControllerStatus";
import FiringControls from "@components/FiringControls";
import { Badge } from "@components/Badge";
import { ROLES } from "../constants/user.constants";
import { getControllerConnectionLabel } from "@constants/controller.constants";
import { SWITCH_LABELS } from "../constants/controller.constants";
import { pairController } from "@services/controller.service";

function applyTelemetry(controller, telemetry) {
  return controller?.controllerCode === telemetry.controllerCode
    ? { ...controller, ...telemetry }
    : controller;
}

function getDisplayedProgram(kiln, programs) {
  if (kiln.activeFiringCycle?.programConfig) {
    return {
      name: kiln.activeFiringCycle.program?.name || "Programa de quema",
      configuration: kiln.activeFiringCycle.programConfig,
    };
  }
  return (
    kiln.selectedProgram ||
    programs.find(({ programId }) => programId === kiln.selectedProgramId) ||
    null
  );
}

function getRemainingMinutes(kiln, stages) {
  if (!stages.length) return null;
  if (!kiln.activeFiringCycle) {
    return stages.reduce((total, stage) => total + stage.durationMinutes, 0);
  }
  const stageIndex = Number.isInteger(kiln.controller?.stageIndex)
    ? Math.min(kiln.controller.stageIndex, stages.length - 1)
    : 0;
  const elapsed = Number(kiln.controller?.stageElapsedMinutes);
  const currentElapsed = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  return Math.max(0, stages[stageIndex].durationMinutes - currentElapsed) +
    stages
      .slice(stageIndex + 1)
      .reduce((total, stage) => total + stage.durationMinutes, 0);
}

function formatRemainingTime(minutes) {
  if (!Number.isFinite(minutes)) return "-";
  const roundedMinutes = Math.ceil(minutes);
  if (roundedMinutes < 1) return "< 1 min";
  const hours = Math.floor(roundedMinutes / 60);
  const remainder = roundedMinutes % 60;
  return [hours ? `${hours} h` : null, remainder ? `${remainder} min` : null]
    .filter(Boolean)
    .join(" ");
}

export default function Home() {
  const { user } = useAuth();
  const [data, setData] = useState({ kilns: [], unlinkedControllers: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [programs, setPrograms] = useState([]);
  const [pairing, setPairing] = useState({ partialControllerId: "", pin: "" });
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingError, setPairingError] = useState("");
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (user.role !== ROLES.CLIENT) return undefined;
    let active = true;
    getMyKilns().then(async (result) => {
      if (!active) return;
      if (result.success) {
        const kilns = await Promise.all(
          result.data.kilns.map(async (kiln) => {
            const context = await getFiringContext(kiln.kilnId);
            return context.success
              ? { ...kiln, reconciliation: context.data.reconciliation }
              : kiln;
          }),
        );
        if (!active) return;
        setData({ ...result.data, kilns });
      } else setError(result.message);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [reloadKey, user.role]);

  useEffect(() => {
    if (user.role !== ROLES.CLIENT) return;
    getPrograms().then((result) => {
      if (result.success) setPrograms(result.data || []);
    });
  }, [user.role]);

  const handleTelemetry = useCallback((telemetry) => {
    setData((current) => ({
      kilns: current.kilns.map((kiln) => ({
        ...kiln,
        controller: applyTelemetry(kiln.controller, telemetry),
        ...(kiln.controller?.controllerCode === telemetry.controllerCode &&
        telemetry.firingStateConfirmed
          ? { reconciliation: { ready: true, reason: null } }
          : {}),
      })),
      unlinkedControllers: current.unlinkedControllers.map((controller) =>
        applyTelemetry(controller, telemetry),
      ),
    }));
  }, []);

  useControllerRealtime(handleTelemetry);
  const handleFiringUpdate = useCallback((event) => {
    setData((current) => ({
      ...current,
      kilns: current.kilns.map((kiln) =>
        kiln.kilnId === event.kilnId
          ? {
              ...kiln,
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
          : kiln,
      ),
    }));
  }, []);
  useFiringRealtime(handleFiringUpdate);

  if (user.role === ROLES.TECHNICIAN) {
    return <Navigate to="/support" replace />;
  }

  if (user.role === ROLES.ADMIN) {
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
    setIsPairingModalOpen(false);
    setReloadKey((value) => value + 1);
    toast.success("Horno agregado exitosamente.");
  }

  function openPairingModal() {
    setPairingError("");
    setIsPairingModalOpen(true);
  }

  function closePairingModal() {
    if (pairingLoading) return;
    setIsPairingModalOpen(false);
    setPairing({ partialControllerId: "", pin: "" });
    setPairingError("");
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
        <div className="mb-6 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Mis hornos
            </h1>
            <p className="mt-2 text-secondary">
              Revisa el estado y la información principal de tus hornos.
            </p>
          </div>
          <button
            type="button"
            onClick={openPairingModal}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-on-action transition-colors hover:bg-primary-hover sm:w-auto"
          >
            <LuPlus /> Agregar horno
          </button>
        </div>

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
          <div className="grid gap-5 lg:grid-cols-2">
            {data.kilns.map((kiln) => {
              const program = getDisplayedProgram(kiln, programs);
              const stages = program?.configuration?.stages || [];
              const targetTemperature = stages.at(-1)?.targetTemperature;
              const stageIndex = Number.isInteger(kiln.controller?.stageIndex)
                ? Math.min(kiln.controller.stageIndex, stages.length - 1)
                : null;
              return (
                <article
                  key={kiln.kilnId}
                  className="flex min-w-0 flex-col rounded-2xl border border-border bg-surface p-4 shadow-panel transition-colors hover:border-control-border sm:p-6"
                >
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-border pb-4 text-xs sm:text-sm">
                  <span className="whitespace-nowrap text-muted">
                    {kiln.nominalVoltage} V - {kiln.nominalCurrent} A
                  </span>
                  <h2 className="max-w-48 truncate text-center font-semibold text-content">
                    {kiln.name}
                  </h2>
                  <div className="flex min-w-0 flex-wrap justify-end gap-1.5">
                    <Badge
                      style={
                        kiln.controller?.connectionStatus === "ONLINE"
                          ? "info"
                          : "default"
                      }
                      text={
                        kiln.controller
                          ? getControllerConnectionLabel(
                              kiln.controller.connectionStatus,
                            )
                          : "Sin controlador"
                      }
                    />
                    {kiln.controller && (
                      <ControllerStatus controller={kiln.controller} />
                    )}
                  </div>
                </div>

                <div className="pt-3 pb-7 text-center">
                  <p className="pb-4 truncate text-sm text-secondary">
                    Programa: {program?.name || "Sin seleccionar"}
                  </p>
                  {kiln.controller ? (
                    <p className="mt-3 text-5xl font-semibold tracking-tight text-content">
                      {kiln.controller.temperature == null
                        ? "--"
                        : kiln.controller.temperature.toFixed(1)}{" "}
                      °C
                    </p>
                  ) : (
                    <p className="mt-3 text-2xl font-semibold text-muted">
                      No disponible
                    </p>
                  )}
                  <p className="mt-1 text-sm text-muted">Temperatura actual</p>
                </div>

                <dl className="grid grid-cols-3 gap-2 border-b border-border pb-5 text-center">
                  <div className="flex flex-col">
                    <dt className="order-2 mt-1 text-xs text-muted">T° objetivo</dt>
                    <dd className="order-1 font-semibold text-content">
                      {Number.isFinite(targetTemperature)
                        ? `${targetTemperature} °C`
                        : "-"}
                    </dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="order-2 mt-1 text-xs text-muted">Tiempo restante</dt>
                    <dd className="order-1 font-semibold text-content">
                      {formatRemainingTime(getRemainingMinutes(kiln, stages))}
                    </dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="order-2 mt-1 text-xs text-muted">Etapa</dt>
                    <dd className="order-1 truncate font-semibold text-content">
                      {stageIndex == null || !stages.length
                        ? `-`
                        : `${stageIndex + 1} de ${stages.length}`}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5">
                  <FiringControls
                    compact
                    kiln={kiln}
                    programs={programs}
                    detailsHref={`/kilns/${kiln.kilnId}`}
                    onRefresh={() => setReloadKey((value) => value + 1)}
                  />
                </div>
                </article>
              );
            })}
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
                  {controller.connectionStatus === "ONLINE" && (
                    <ControllerStatus controller={controller} />
                  )}
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
                      <Badge
                        style={
                          controller.connectionStatus === "ONLINE"
                            ? "info"
                            : "default"
                        }
                        text={getControllerConnectionLabel(
                          controller.connectionStatus,
                        )}
                      />
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      )}

      {isPairingModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-3 backdrop-blur-sm sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePairingModal();
          }}
          role="presentation"
        >
          <section
            aria-labelledby="pairing-modal-title"
            aria-modal="true"
            className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-border bg-surface shadow-dialog"
            role="dialog"
          >
            <header className="flex items-center justify-between border-b border-border bg-surface-muted px-4 py-3 sm:px-6 sm:py-4">
              <h2
                id="pairing-modal-title"
                className="text-xl font-bold text-content"
              >
                Agregar horno
              </h2>
              <button
                type="button"
                aria-label="Cerrar modal"
                disabled={pairingLoading}
                onClick={closePairingModal}
                className="rounded-md p-1 text-muted transition-colors hover:bg-surface-hover hover:text-content disabled:opacity-40"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </header>

            <form onSubmit={handlePairing} className="space-y-5 p-4 sm:p-6">
              <p className="rounded-lg text-sm leading-relaxed text-secondary">
                Agrega tu horno en 3 simples pasos:
              </p>

              <ol className="space-y-3 text-sm text-secondary">
                <li className="flex items-center gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-content font-semibold text-content">
                    1
                  </span>
                  <span>
                    Enciende el controlador y solicita un PIN de vinculación
                    desde el dispositivo.
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-content font-semibold text-content">
                    2
                  </span>
                  <span>Ingresa el identificador del controlador.</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-content font-semibold text-content">
                    3
                  </span>
                  <span>
                    Ingresa el PIN de vinculación que aparece en el dispositivo.
                  </span>
                </li>
              </ol>

              <p className="text-xs text-secondary">
                El PIN expira en 15 minutos. Después de 10 intentos fallidos, la
                vinculación se bloqueará temporalmente por 2 horas.
              </p>

              <label className="block text-sm font-medium text-muted">
                Identificador del controlador
                <input
                  autoFocus
                  className="mt-2 w-full rounded-lg border-2 border-control-border bg-field px-3 py-2.5 font-mono uppercase text-content outline-none focus:border-focus"
                  placeholder="A1B2C3"
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
                  maxLength={6}
                  required
                />
              </label>

              <label className="block text-sm font-medium text-muted">
                PIN de vinculación
                <input
                  className="mt-2 w-full rounded-lg border-2 border-control-border bg-field px-3 py-2.5 font-mono text-content outline-none focus:border-focus"
                  inputMode="numeric"
                  placeholder="123456"
                  value={pairing.pin}
                  onChange={(event) =>
                    setPairing((current) => ({
                      ...current,
                      pin: event.target.value.replace(/\D/g, "").slice(0, 6),
                    }))
                  }
                  pattern="\d{6}"
                  maxLength={6}
                  required
                />
              </label>

              {pairingError && (
                <p className="rounded-lg border border-danger-border bg-danger-soft p-3 text-sm text-danger">
                  {pairingError}
                </p>
              )}

              <div className="flex flex-row justify-end gap-3 border-t border-border pt-5">
                <button
                  type="button"
                  disabled={pairingLoading}
                  onClick={closePairingModal}
                  className="flex-1 rounded-lg border border-control-border px-4 py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-surface-hover disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pairingLoading}
                  className="flex-2 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-on-action transition-colors hover:bg-primary-hover disabled:opacity-60"
                >
                  <LuPlus />
                  {pairingLoading ? "Vinculando..." : "Agregar horno"}
                </button>
              </div>

              <div className="border-t border-border text-center pt-4">
                <p className="text-sm text-muted">
                  ¿No puedes vincular tu horno?{" "}
                  <a
                    href="#"
                    className="underline transition-all hover:cursor-pointer hover:text-accent"
                  >
                    Solicita ayuda aquí
                  </a>
                </p>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
