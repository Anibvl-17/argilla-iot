import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@context/AuthContext";
import ControllerStatus from "@components/ControllerStatus";
import {
  getAccessibleControllers,
  sendAdminControllerCommand,
} from "@services/controller.service";
import {
  getControllerActivityLabel,
  getControllerConnectionLabel,
  getFiringCommandLabel,
  getSwitchLabel,
} from "@constants/controller.constants";

export default function SimulatorPanel() {
  const { user } = useAuth();
  const [controllers, setControllers] = useState([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const result = await getAccessibleControllers({ pageSize: 100 });
    if (result.success) setControllers(result.data.items || []);
    else setError(result.message);
  }, []);

  useEffect(() => {
    let active = true;
    getAccessibleControllers({ pageSize: 100 }).then((result) => {
      if (!active) return;
      if (result.success) setControllers(result.data.items || []);
      else setError(result.message);
    });
    return () => {
      active = false;
    };
  }, [load]);

  async function command(controller) {
    const result = await sendAdminControllerCommand(
      controller.controllerId,
      controller.switchState ? "OFF" : "ON",
    );
    if (!result.success) return setError(result.message);
    await load();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Simulador MQTT</h1>
        <p className="mt-2 text-muted">
          El proceso de simulación se ejecuta desde el backend. Para publicar un
          PIN de prueba configura <code>SIMULATOR_PAIRING_PIN</code>; el secreto
          del dispositivo nunca se muestra ni se registra aquí.
        </p>
      </header>
      {error && (
        <p className="rounded-lg border border-danger-border bg-danger-soft p-3 text-danger">
          {error}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {controllers.map((controller) => (
          <article
            key={controller.controllerId}
            className="rounded-2xl border border-border bg-surface p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <code className="text-xs">...{controller.controllerCode}</code>
              <ControllerStatus controller={controller} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">Temperatura</dt>
                <dd>
                  {controller.temperature == null
                    ? "—"
                    : `${controller.temperature.toFixed(1)} °C`}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Conexión</dt>
                <dd>
                  {getControllerConnectionLabel(controller.connectionStatus)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Actividad</dt>
                <dd>{getControllerActivityLabel(controller.activityStatus)}</dd>
              </div>
              <div>
                <dt className="text-muted">Switch</dt>
                <dd>
                  {getSwitchLabel(controller.switchType)}{" "}
                  {controller.switchCurrentCapacity} A
                </dd>
              </div>
            </dl>
            {user.role !== "TECHNICIAN" && controller.kiln && (
              <button
                disabled={controller.connectionStatus !== "ONLINE"}
                onClick={() => command(controller)}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-on-action disabled:opacity-40"
              >
                {getFiringCommandLabel(
                  controller.switchState ? "OFF" : "ON",
                )}
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
