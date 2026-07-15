import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  LuArrowLeft,
  LuCircuitBoard,
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

function Detail({ label, value }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
      <dt className="text-sm font-medium text-neutral-400">{label}</dt>
      <dd className="mt-1 font-medium text-neutral-100">{value}</dd>
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

  const fetchTelemetry = useCallback(async (page = 1) => {
    setTelemetryLoading(true);
    const result = await getMyKilnTelemetry(kilnId, page, 10);
    setTelemetryLoading(false);

    if (result.success) {
      setTelemetry(result.data.items || []);
      setTelemetryPagination(result.data.pagination);
    }
  }, [kilnId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTelemetry(1);
  }, [fetchTelemetry]);

  const handleTelemetry = useCallback((telemetry) => {
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
  }, [fetchTelemetry, telemetryPagination.page]);

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
      <div className="py-20 text-center text-neutral-400">
        Cargando horno...
      </div>
    );
  if (error || !kiln)
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-red-900/60 bg-red-950/20 p-6">
        <h1 className="font-semibold text-red-300">Horno no encontrado</h1>
        <p className="mt-2 text-sm text-red-200/70">{error}</p>
        <Link
          to="/kilns"
          className="mt-5 inline-flex items-center gap-2 text-sm text-white"
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
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-neutral-400 transition-colors hover:text-white"
      >
        <LuArrowLeft /> Volver a mis hornos
      </Link>
      <div className="flex min-w-0 flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-red-500">
            Detalle del horno
          </p>
          {editing ? (
            <form onSubmit={handleRename} className="mt-2 max-w-xl">
              <div className="flex min-w-0 flex-wrap gap-2 min-[400px]:flex-nowrap">
                <input
                  autoFocus
                  name="name"
                  aria-invalid={hasFormError(formError, "name") || undefined}
                  aria-describedby={hasFormError(formError, "name") ? "kiln-name-error" : undefined}
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setFormError((current) => clearFormError(current, "name"));
                  }}
                  minLength={2}
                  maxLength={100}
                  required
                  className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-[#0a0a0a] px-3 py-2 text-xl font-semibold outline-none focus:border-red-600"
                />
                <button
                  disabled={saving}
                  className="rounded-lg bg-red-700 px-3 text-white hover:bg-red-600"
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
                  className="rounded-lg border border-neutral-700 px-3 text-neutral-300 hover:bg-neutral-800"
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
                className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
                title="Editar nombre"
              >
                <LuPencil />
              </button>
            </div>
          )}
        </div>
        <ControllerStatus controller={controller} />
      </div>

      <section className="mt-8 rounded-2xl border border-neutral-800 bg-[#141414] p-4 sm:p-6">
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

      <section className="mt-5 rounded-2xl border border-neutral-800 bg-[#141414] p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-950/50 text-red-500">
            <LuCircuitBoard />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Controlador</h2>
            <p className="text-sm font-medium text-neutral-400">
              Información técnica y estado actual
            </p>
          </div>
        </div>
        {controller ? (
          <>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail
              label="Identificador"
              value={`...${controller.controllerCode}`}
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
            <Detail
              label="Temperatura"
              value={
                controller.temp == null
                  ? "No disponible"
                  : `${controller.temp.toFixed(1)} °C`
              }
            />
            <Detail label="Tipo de switch" value={SWITCH_LABELS[controller.switchType]} />
            <Detail
              label="Amperaje soportado"
              value={`${controller.switchAmps} A`}
            />
          </dl>
          <div className="mt-6 flex flex-col gap-3 border-t border-neutral-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">
                Control del switch
              </h3>
              {commandError && (
                <p className="mt-1 text-sm text-red-400">{commandError}</p>
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
                    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 " +
                    (nextCommand === "ON"
                      ? "bg-green-700 enabled:hover:bg-green-600"
                      : "bg-red-700 enabled:hover:bg-red-600")
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
          <div className="mt-5 rounded-xl border border-dashed border-neutral-700 p-8 text-center font-medium text-neutral-500">
            Este horno no tiene un controlador vinculado.
          </div>
        )}
      </section>

      <section className="mt-5 rounded-2xl border border-neutral-800 bg-[#141414]">
        <div className="flex flex-col gap-1 border-b border-neutral-800 p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Historial de temperatura</h2>
          <p className="text-sm text-neutral-500">
            Registros guardados por muestreo de telemetría.
          </p>
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-120 text-left text-sm">
            <thead className="border-b border-neutral-800 bg-[#0a0a0a] text-xs uppercase tracking-wider text-neutral-500">
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
            <tbody className="divide-y divide-neutral-800/60">
              {telemetry.length > 0 ? (
                telemetry.map((item) => (
                  <tr key={item.telemetryId}>
                    <td className="px-4 py-3 text-neutral-300 sm:px-6">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-neutral-200 sm:px-6">
                      {item.temperature.toFixed(1)} °C
                    </td>
                    <td className="px-4 py-3 text-center text-neutral-300 sm:px-6">
                      {item.switchState ? "Encendido" : "Apagado"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="3"
                    className="px-6 py-10 text-center text-neutral-500"
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
