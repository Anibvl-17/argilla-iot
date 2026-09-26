import { useState } from "react";
import {
  getOperationalStatusLabel,
  OPERATIONAL_STATUS_OPTIONS,
} from "@constants/controller.constants";

export default function OperationalStatusDialog({
  equipmentLabel,
  currentStatus,
  isOpen,
  onClose,
  onSubmit,
}) {
  if (!isOpen) return null;

  return (
    <OperationalStatusDialogContent
      key={`${equipmentLabel}-${currentStatus}`}
      equipmentLabel={equipmentLabel}
      currentStatus={currentStatus}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

function OperationalStatusDialogContent({
  equipmentLabel,
  currentStatus,
  onClose,
  onSubmit,
}) {
  const [operationalStatus, setOperationalStatus] = useState(currentStatus);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const result = await onSubmit(operationalStatus);
    setSaving(false);
    if (!result?.success) {
      setError(
        result?.data?.errorDetails ||
          result?.message ||
          "No fue posible actualizar el estado.",
      );
      return;
    }
    onClose();
  }

  const isNonOperational = operationalStatus !== "OPERATIONAL";

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-overlay p-3 backdrop-blur-sm"
      onMouseDown={(event) =>
        event.target === event.currentTarget && !saving && onClose()
      }
      role="presentation"
    >
      <section
        className="w-full max-w-md overflow-hidden rounded-2xl border-2 border-border bg-surface shadow-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="operational-status-dialog-title"
      >
        <header className="flex items-center justify-between border-b border-border bg-surface-muted px-5 py-4">
          <h2
            id="operational-status-dialog-title"
            className="text-lg font-bold"
          >
            Cambiar estado
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar cambio de estado"
            className="rounded-md p-2 text-muted hover:bg-surface-hover hover:text-content disabled:opacity-50"
          >
            ✕
          </button>
        </header>
        <form onSubmit={submit} className="space-y-5 p-5">
          <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm">
            <p className="font-medium text-content">{equipmentLabel}</p>
            <p className="mt-1 text-secondary">
              Estado actual: {getOperationalStatusLabel(currentStatus)}
            </p>
          </div>
          <label className="block text-sm font-medium text-secondary">
            Nuevo estado
            <select
              aria-label="Nuevo estado"
              value={operationalStatus}
              onChange={(event) => {
                setOperationalStatus(event.target.value);
                setError("");
              }}
              className="mt-2 w-full rounded-lg border-2 border-control-border bg-field px-3 py-2.5 text-content outline-none focus:border-focus"
            >
              {OPERATIONAL_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {isNonOperational && (
            <p className="rounded-lg border border-warning-border bg-warning-soft p-3 text-sm text-warning">
              El equipo no podrá utilizarse para iniciar nuevas quemas mientras
              permanezca en este estado.
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-danger-border bg-danger-soft p-3 text-sm text-danger"
            >
              {String(error)}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-control-border px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || operationalStatus === currentStatus}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-action disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar estado"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
