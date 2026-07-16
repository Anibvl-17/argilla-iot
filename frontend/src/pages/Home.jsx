import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { LuBox, LuFlame, LuMoveRight, LuPower, LuRadio } from "react-icons/lu";
import { useAuth } from "@context/AuthContext";
import {
  getMyKilns,
  sendMyKilnControllerCommand,
} from "@services/kiln.service";
import { useControllerRealtime } from "@hooks/useControllerRealtime";
import ControllerStatus from "@components/ControllerStatus";
import { ROLES } from "../constants/user.constants";
import { getControllerConnectionLabel } from "@constants/controller.constants";

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
  }, []);

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

    const command = kiln.controller.operativeStatus === "ON" ? "OFF" : "ON";
    setCommandLoadingId(String(kiln.kilnId));
    const result = await sendMyKilnControllerCommand(kiln.kilnId, command);
    setCommandLoadingId("");

    if (!result.success) {
      setError(result.message);
    }
  }

  if (user.role === ROLES.ADMIN) return <Navigate to="/admin" replace />;

  if (loading) {
    return (
      <div className="py-20 text-center text-neutral-400">
        Cargando tus hornos...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-900/60 bg-red-950/20 p-6 text-red-300">
        <h1 className="font-semibold">No pudimos cargar tus hornos</h1>
        <p className="mt-2 text-sm text-red-200/70">{error}</p>
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
          <p className="mt-2 text-neutral-300">
            Revisa el estado y la información principal de tus hornos.
          </p>
        </div>

        {!hasEquipment ? (
          <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-900/30 px-4 py-10 text-center sm:px-6 sm:py-16">
            <LuFlame className="mx-auto mb-4 text-4xl text-neutral-600" />
            <h2 className="text-lg font-medium">
              Aún no tienes hornos vinculados
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              Cuando un horno o controlador sea asociado a tu cuenta aparecerá
              aquí.
            </p>
          </div>
        ) : data.kilns.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6 text-neutral-400">
            No tienes hornos vinculados actualmente.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {data.kilns.map((kiln) => (
              <article
                key={kiln.kilnId}
                className="flex justify-between gap-8 min-w-0 flex-col rounded-2xl border border-neutral-800 bg-[#141414] p-4 shadow-xl shadow-black/10 transition-colors hover:border-neutral-700 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4 pb-2 border-b border-b-neutral-700">
                  <span className="rounded-xl text-neutral-400">
                    {kiln.name}
                  </span>

                  <span className="flex items-center justify-center gap-1 text-neutral-400">
                    <LuBox />
                    {kiln.liters} litros
                  </span>
                </div>

                <h2 className="truncate text-center">
                  {kiln.controller ? (
                    <span className="text-4xl/relaxed tracking-wide font-bold text-neutral-200">
                      {kiln.controller?.temp.toFixed(1)} °C
                    </span>
                  ) : (
                    <p className="text-neutral-300">Sin controlador asociado</p>
                  )}
                </h2>

                {kiln.controller && (
                  <div className="text-neutral-300/90 pb-2 border-b border-b-neutral-700">
                    <div
                      className={
                        "flex flex-row items-center " +
                        (kiln.controller?.connectionStatus === "ONLINE"
                          ? "justify-between"
                          : "justify-center")
                      }
                    >
                      <p className="text-sm text-neutral-400">
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
                          ? kiln.controller.operativeStatus === "ON"
                            ? "Apagar horno"
                            : "Encender horno"
                          : "Requiere controlador"
                    }
                    className={
                      "flex flex-1 items-center justify-center gap-2 rounded-lg border border-neutral-700 px-3 py-2.5 text-sm text-neutral-200 transition-colors disabled:cursor-not-allowed disabled:border-neutral-800 disabled:text-neutral-600 hover:cursor-pointer " +
                      (kiln.controller?.operativeStatus === "ON"
                        ? "enabled:hover:bg-red-400/10 enabled:hover:text-red-400 enabled:hover:border-red-400/60"
                        : "enabled:hover:bg-green-400/10 enabled:hover:text-green-400 enabled:hover:border-green-400/50")
                    }
                  >
                    <LuPower />
                    {commandLoadingId === String(kiln.kilnId)
                      ? "Enviando..."
                      : kiln.controller?.operativeStatus === "ON"
                        ? "Apagar"
                        : "Encender"}
                  </button>
                  <Link
                    to={`/kilns/${kiln.kilnId}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-700 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-red-600"
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
            <p className="mt-1 text-sm text-neutral-500">
              Estos controladores pertenecen a tu cuenta, pero aún no están
              asociados a un horno.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.unlinkedControllers.map((controller) => (
              <article
                key={controller.controllerCode}
                className="min-w-0 rounded-2xl border border-neutral-800 bg-[#141414] p-4 sm:p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 font-medium">
                    <LuRadio className="text-red-500" /> Controlador ...
                    {controller.controllerCode}
                  </div>
                  <ControllerStatus controller={controller} />
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-neutral-500">Temperatura</dt>
                    <dd className="mt-1">
                      {controller.temp == null
                        ? "No disponible"
                        : `${controller.temp.toFixed(1)} °C`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Switch</dt>
                    <dd className="mt-1">{controller.switchType}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Capacidad</dt>
                    <dd className="mt-1">{controller.switchAmps} A</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Conexión</dt>
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
