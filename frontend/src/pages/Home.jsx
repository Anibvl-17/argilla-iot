import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  LuFlame,
  LuGauge,
  LuMoveRight,
  LuPower,
  LuRadio,
} from "react-icons/lu";
import { useAuth } from "@context/AuthContext";
import { getMyKilns } from "@services/kiln.service";
import { useControllerRealtime } from "@hooks/useControllerRealtime";
import ControllerStatus from "@components/ControllerStatus";
import { ROLES } from "../constants/user.constants";

function applyTelemetry(controller, telemetry) {
  return controller?.controllerCode === telemetry.controllerCode
    ? { ...controller, ...telemetry }
    : controller;
}

function Temperature({ value }) {
  return (
    <span className="text-sm text-neutral-400">
      {value == null ? "Temperatura no disponible" : `${value.toFixed(1)} °C`}
    </span>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [data, setData] = useState({ kilns: [], unlinkedControllers: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10">
      <section>
        <div className="mb-6">
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Mis hornos
          </h1>
          <p className="mt-2 text-neutral-400">
            Revisa el estado y la información principal de tus hornos.
          </p>
        </div>

        {!hasEquipment ? (
          <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-900/30 px-6 py-16 text-center">
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
                className="flex min-h-72 flex-col rounded-2xl border border-neutral-800 bg-[#141414] p-6 shadow-xl shadow-black/10 transition-colors hover:border-neutral-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-950/50 text-xl text-red-500">
                    <LuFlame />
                  </div>
                  <ControllerStatus controller={kiln.controller} />
                </div>
                <h2 className="mt-5 truncate text-xl font-semibold">
                  {kiln.name}
                </h2>
                <div className="mt-3 flex items-center gap-2 text-neutral-400">
                  <LuGauge />
                  <span>{kiln.liters} litros</span>
                </div>
                <div className="mt-1">
                  <Temperature value={kiln.controller?.temp} />
                </div>
                <div className="mt-auto flex gap-3 pt-6">
                  <button
                    disabled
                    title="Disponible próximamente"
                    className="flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-neutral-800 px-3 py-2.5 text-sm text-neutral-600"
                  >
                    <LuPower /> Prender
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
                className="rounded-2xl border border-neutral-800 bg-[#141414] p-5"
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
                </dl>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
