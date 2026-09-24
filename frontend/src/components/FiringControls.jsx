import { useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { LuArrowRight, LuCirclePause, LuPlay, LuSquare } from "react-icons/lu";
import AlertDialog from "./AlertDialog";
import ProgramChart from "./ProgramChart";
import {
  commandFiringCycle,
  selectFiringProgram,
  startProgram,
} from "@services/firing.service";

const STATUS_LABELS = {
  RUNNING: "En ejecución",
  PAUSED: "Pausada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  ERROR: "Error",
  UNKNOWN: "Resultado desconocido",
};

export default function FiringControls({
  kiln,
  programs,
  compact = false,
  detailsHref,
  onRefresh,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const active = kiln.activeFiringCycle;
  const selected =
    programs.find(({ programId }) => programId === kiln.selectedProgramId) ||
    kiln.selectedProgram;
  const online = kiln.controller?.connectionStatus === "ONLINE";
  const reconciled = kiln.reconciliation?.ready !== false;
  const controlsAvailable = online && reconciled;

  async function run(action) {
    setBusy(true);
    setError("");
    const result = await action();
    setBusy(false);
    if (!result.success) {
      setError(result.message);
      return false;
    }
    await onRefresh?.();
    return true;
  }

  async function changeProgram(event) {
    const programId = event.target.value;
    if (!programId) return;
    await run(() => selectFiringProgram(kiln.kilnId, programId));
  }

  async function send(command) {
    if (!active) return;
    const ok = await run(() =>
      commandFiringCycle(kiln.kilnId, active.firingCycleId, command),
    );
    if (ok) setConfirmCancel(false);
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex min-w-0 flex-wrap items-stretch gap-2">
          {online && !active && (
            <>
              <select
                aria-label="Programa de quema"
                value={kiln.selectedProgramId || ""}
                onChange={changeProgram}
                disabled={busy || !controlsAvailable}
                className="min-w-0 flex-1 rounded-lg border border-control-border bg-field px-2 py-2 text-xs"
              >
                <option value="">Seleccionar programa</option>
                {programs.map((program) => (
                  <option key={program.programId} value={program.programId}>
                    {program.name}
                  </option>
                ))}
              </select>
              <button
                disabled={busy || !controlsAvailable || !selected}
                onClick={() => run(() => startProgram(kiln.kilnId))}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-2 text-xs text-on-action disabled:opacity-50"
              >
                {busy ? "Confirmando…" : "Iniciar quema"}
              </button>
            </>
          )}

          {online && active?.status === "RUNNING" && (
            <button
              disabled={busy || !controlsAvailable}
              onClick={() => send("PAUSE")}
              className="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-control-border px-3 py-2 text-xs"
            >
              <LuCirclePause /> Pausar quema
            </button>
          )}
          {online && active?.status === "PAUSED" && (
            <button
              disabled={busy || !controlsAvailable}
              onClick={() => send("RESUME")}
              className="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-control-border px-3 py-2 text-xs"
            >
              <LuPlay /> Reanudar quema
            </button>
          )}
          {online && active && (
            <button
              disabled={busy || !controlsAvailable}
              onClick={() => setConfirmCancel(true)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-2 text-xs text-on-action"
            >
              <LuSquare /> Detener quema
            </button>
          )}

          {detailsHref && (
            <Link
              to={detailsHref}
              className={
                "inline-flex shrink-0 basis-full items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-control-border px-3 py-2 text-xs font-medium transition-colors hover:bg-surface-hover min-[480px]:basis-auto " +
                (!online ? "w-full" : "")
              }
            >
              Ver detalles <LuArrowRight />
            </Link>
          )}
        </div>

        {online && !reconciled && (
          <p className="text-xs text-muted">
            Reconciliando el estado del controlador…
          </p>
        )}
        {error && <p className="text-xs text-danger">{error}</p>}

        <AlertDialog
          isOpen={confirmCancel}
          onClose={() => setConfirmCancel(false)}
          onConfirm={() => send("CANCEL")}
          title="¿Detener la quema?"
          message="El ciclo quedará cancelado y no podrá reanudarse."
          confirmText="Detener quema"
          isLoading={busy}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={
          "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
        }
      >
        <div className="flex min-w-0 items-center gap-2">
          <select
            aria-label="Programa de quema"
            value={kiln.selectedProgramId || ""}
            onChange={changeProgram}
            disabled={busy || Boolean(active) || !controlsAvailable}
            className="min-w-0 flex-1 rounded-lg border border-control-border bg-field px-3 py-2 text-sm sm:w-72 sm:flex-none"
          >
            <option value="">Seleccionar programa</option>
            {programs.map((program) => (
              <option key={program.programId} value={program.programId}>
                {program.name}
              </option>
            ))}
          </select>
          {selected && (
            <button
              type="button"
              onClick={() => setDetailsOpen(true)}
              className="shrink-0 rounded-lg border border-control-border px-3 py-2 text-sm"
            >
              Ver programa
            </button>
          )}
        </div>

        {active ? (
          <div className="flex flex-wrap gap-2">
            {active.status === "RUNNING" ? (
              <button
                disabled={busy || !controlsAvailable}
                onClick={() => send("PAUSE")}
                className="inline-flex items-center gap-2 rounded-lg border border-control-border px-3 py-2 text-sm"
              >
                <LuCirclePause /> Pausar
              </button>
            ) : (
              <button
                disabled={busy || !controlsAvailable}
                onClick={() => send("RESUME")}
                className="inline-flex items-center gap-2 rounded-lg border border-control-border px-3 py-2 text-sm"
              >
                <LuPlay /> Reanudar
              </button>
            )}
            <button
              disabled={busy || !controlsAvailable}
              onClick={() => setConfirmCancel(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-on-action"
            >
              <LuSquare /> Detener quema
            </button>
          </div>
        ) : (
          <button
            disabled={busy || !controlsAvailable || !selected}
            onClick={() => run(() => startProgram(kiln.kilnId))}
            className="inline-flex w-fit items-center justify-center gap-2 self-start rounded-lg bg-primary px-4 py-2.5 text-sm text-on-action disabled:opacity-50"
          >
            {busy ? "Confirmando…" : "Iniciar quema"}
          </button>
        )}
      </div>

      {active && (
        <div className="rounded-lg border border-border bg-surface-muted p-3">
          <p className="text-sm font-semibold">
            {STATUS_LABELS[active.status] || active.status}
          </p>
          <p className="mt-1 text-xs text-muted">
            {active.program?.name || selected?.name || "Programa de quema"}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {Number.isFinite(kiln.controller?.setpointTemperature) && (
              <span>
                Setpoint: {kiln.controller.setpointTemperature.toFixed(1)} °C
              </span>
            )}
            {Number.isInteger(kiln.controller?.stageIndex) && (
              <span>Etapa: {kiln.controller.stageIndex + 1}</span>
            )}
            {kiln.controller?.recoveryInProgress && (
              <span className="text-accent">Recuperación térmica en curso</span>
            )}
          </div>
        </div>
      )}
      {!online && (
        <p className="text-sm text-muted">Controlador desconectado.</p>
      )}
      {online && !reconciled && (
        <p className="text-sm text-muted">
          Reconciliando el estado del controlador…
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}

      {detailsOpen &&
        selected &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
            onMouseDown={() => setDetailsOpen(false)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="program-details-title"
              onMouseDown={(event) => event.stopPropagation()}
              className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-border bg-surface p-6"
            >
              <div className="flex justify-between gap-4">
                <div>
                  <h3
                    id="program-details-title"
                    className="text-xl font-semibold"
                  >
                    {selected.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {selected.description}
                  </p>
                </div>
                <button onClick={() => setDetailsOpen(false)}>Cerrar</button>
              </div>
              <div className="mt-5 rounded-xl bg-surface-muted p-3">
                <ProgramChart program={selected} />
              </div>
              <table className="mt-5 w-full text-sm">
                <thead>
                  <tr className="text-left text-muted">
                    <th className="py-2">Etapa</th>
                    <th>Duración</th>
                    <th>Objetivo</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.configuration.stages.map((stage, index) => (
                    <tr
                      key={`${stage.durationMinutes}-${index}`}
                      className="border-t border-border"
                    >
                      <td className="py-2">{index + 1}</td>
                      <td>{stage.durationMinutes} min</td>
                      <td>{stage.targetTemperature} °C</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>,
          document.body,
        )}

      <AlertDialog
        isOpen={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => send("CANCEL")}
        title="¿Detener la quema?"
        message="El ciclo quedará cancelado y no podrá reanudarse."
        confirmText="Detener quema"
        isLoading={busy}
      />
    </div>
  );
}
