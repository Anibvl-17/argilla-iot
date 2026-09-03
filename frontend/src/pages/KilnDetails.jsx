import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  LuArrowLeft,
  LuCircuitBoard,
  LuCopy,
  LuPencil,
  LuPower,
  LuSave,
  LuX,
} from "react-icons/lu";
import ControllerStatus from "@components/ControllerStatus";
import Pagination from "@components/Pagination";
import {
  getMyKiln,
  getMyKilnTelemetry,
  renameMyKiln,
  sendMyKilnControllerCommand,
} from "@services/kiln.service";
import { useControllerRealtime } from "@hooks/useControllerRealtime";
import {
  getControllerConnectionLabel,
  getControllerOperationLabel,
} from "@constants/controller.constants";
import { SWITCH_LABELS } from "../constants/controller.constants";
import FieldError from "@components/FieldError";
import {
  clearFormError,
  hasFormError,
  normalizeFormError,
} from "../utils/formError";
import { toast } from "sonner";

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

export default function KilnDetails() {
  const { kilnId } = useParams();
  const [kiln, setKiln] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [commandSending, setCommandSending] = useState("");
  const [commandError, setCommandError] = useState("");
  const [telemetry, setTelemetry] = useState([]);
  const [telemetryPagination, setTelemetryPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [telemetryLoading, setTelemetryLoading] = useState(false);

  useEffect(() => {
    let active = true;
    getMyKiln(kilnId).then((result) => {
      if (!active) return;
      if (result.success) {
        setKiln(result.data);
        setName(result.data.name);
      } else setError(result.message);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [kilnId]);

  const fetchTelemetry = useCallback(
    async (page = 1) => {
      setTelemetryLoading(true);
      const result = await getMyKilnTelemetry(kilnId, page, 10);
      setTelemetryLoading(false);

      if (result.success) {
        setTelemetry(result.data.items || []);
        setTelemetryPagination(result.data.pagination);
      }
    },
    [kilnId],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTelemetry(1);
  }, [fetchTelemetry]);

  const handleTelemetry = useCallback(
    (telemetry) => {
      setKiln((current) => {
        if (current?.controller?.controllerCode !== telemetry.controllerCode)
          return current;
        const nextKiln = {
          ...current,
          controller: { ...current.controller, ...telemetry },
        };
        return nextKiln;
      });

      if (telemetry.telemetrySaved) {
        fetchTelemetry(telemetryPagination.page);
      }
    },
    [fetchTelemetry, telemetryPagination.page],
  );

  useControllerRealtime(handleTelemetry);

  async function handleRename(event) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    const result = await renameMyKiln(kilnId, name.trim());
    setSaving(false);
    if (!result.success) {
      setFormError(normalizeFormError(result, "name"));
      return;
    }
    setKiln(result.data);
    setName(result.data.name);
    setEditing(false);
  }

  async function handleCommand(command) {
    setCommandSending(command);
    setCommandError("");

    const result = await sendMyKilnControllerCommand(kilnId, command);
    setCommandSending("");

    if (!result.success) {
      setCommandError(result.message);
    }
  }

  if (loading)
    return (
      <div className="py-20 text-center text-muted">
        Cargando horno...
      </div>
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
  const nextCommand = controller?.operativeStatus === "ON" ? "OFF" : "ON";

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
          {editing ? (
            <form onSubmit={handleRename} className="mt-2 max-w-xl">
              <div className="flex min-w-0 flex-wrap gap-2 min-[400px]:flex-nowrap">
                <input
                  autoFocus
                  name="name"
                  aria-invalid={hasFormError(formError, "name") || undefined}
                  aria-describedby={
                    hasFormError(formError, "name")
                      ? "kiln-name-error"
                      : undefined
                  }
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setFormError((current) => clearFormError(current, "name"));
                  }}
                  minLength={2}
                  maxLength={100}
                  required
                  className="min-w-0 flex-1 rounded-lg border border-control-border bg-field px-3 py-2 text-xl font-semibold outline-none focus:border-focus"
                />
                <button
                  disabled={saving}
                  className="rounded-lg bg-primary px-3 text-on-action hover:bg-primary-hover"
                  title="Guardar"
                >
                  <LuSave />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setName(kiln.name);
                    setFormError(null);
                  }}
                  className="rounded-lg border border-control-border px-3 text-secondary hover:bg-surface-hover"
                  title="Cancelar"
                >
                  <LuX />
                </button>
              </div>
              <FieldError error={formError} field="name" id="kiln-name-error" />
              <FieldError error={formError} />
            </form>
          ) : (
            <div className="mt-2 flex min-w-0 items-center gap-2 sm:gap-3">
              <h1 className="min-w-0 wrap-break-word text-2xl font-semibold tracking-tight sm:text-3xl">
                {kiln.name}
              </h1>
              <button
                onClick={() => setEditing(true)}
                className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-content"
                title="Editar nombre"
              >
                <LuPencil />
              </button>
            </div>
          )}
        </div>
        <ControllerStatus controller={controller} />
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-surface p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Información del horno</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Capacidad" value={`${kiln.liters} litros`} />
          <Detail label="Amperaje" value={`${kiln.amps} A`} />
          <Detail label="Voltaje" value={`${kiln.volts} V`} />
          <Detail
            label="Fases"
            value={kiln.phases === 1 ? "Monofásico" : "Trifásico"}
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
                  controller.temp == null
                    ? "No disponible"
                    : `${controller.temp.toFixed(1)} °C`
                }
              />
              <Detail
                label="Estado operativo"
                value={getControllerOperationLabel(controller.operativeStatus)}
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
                value={`${controller.switchAmps} A`}
              />
            </dl>
            <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-content">
                  Control del switch
                </h3>
                {commandError && (
                  <p className="mt-1 text-sm text-accent">{commandError}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={
                    Boolean(commandSending) ||
                    controller.connectionStatus !== "ONLINE"
                  }
                  onClick={() => handleCommand(nextCommand)}
                  className={
                    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-on-action transition-colors disabled:cursor-not-allowed disabled:opacity-60 " +
                    (nextCommand === "ON"
                      ? "bg-success-action enabled:hover:bg-success-action-hover text-on-action"
                      : "bg-primary enabled:hover:bg-primary-hover text-on-action")
                  }
                >
                  <LuPower />
                  {commandSending
                    ? "Enviando..."
                    : nextCommand === "ON"
                      ? "Encender"
                      : "Apagar"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-control-border p-8 text-center font-medium text-muted">
            Este horno no tiene un controlador vinculado.
          </div>
        )}
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-surface">
        <div className="flex flex-col gap-1 border-b border-border p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Historial de temperatura</h2>
          <p className="text-sm text-muted">
            Registros guardados por muestreo de telemetría.
          </p>
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-120 text-left text-sm">
            <thead className="border-b border-border bg-surface-muted text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 font-medium sm:px-6">Fecha</th>
                <th className="px-4 py-3 text-center font-medium sm:px-6">
                  Temperatura
                </th>
                <th className="px-4 py-3 text-center font-medium sm:px-6">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {telemetry.length > 0 ? (
                telemetry.map((item) => (
                  <tr key={item.telemetryId}>
                    <td className="px-4 py-3 text-secondary sm:px-6">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-content sm:px-6">
                      {item.temperature.toFixed(1)} °C
                    </td>
                    <td className="px-4 py-3 text-center text-secondary sm:px-6">
                      {item.switchState ? "Encendido" : "Apagado"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="3"
                    className="px-6 py-10 text-center text-muted"
                  >
                    {telemetryLoading
                      ? "Cargando telemetría..."
                      : "Sin registros de telemetría."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={telemetryPagination.page}
          totalPages={telemetryPagination.totalPages}
          onPageChange={fetchTelemetry}
        />
      </section>
    </div>
  );
}
