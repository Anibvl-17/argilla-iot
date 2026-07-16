import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  LuArrowRight,
  LuCircuitBoard,
  LuFlame,
  LuLink,
  LuPower,
  LuUsers,
} from "react-icons/lu";
import { getAdminSummary } from "@services/admin.service";
import { useAdminSummaryRealtime } from "@hooks/useAdminSummaryRealtime";

function Metric({
  icon: Icon,
  value,
  valueDescription,
  isLastChild = false,
  tone = "text-neutral-200",
}) {
  return (
    <div
      className={
        "p-4 flex flex-row items-center justify-start gap-2 " +
        (!isLastChild && "border-b border-neutral-800")
      }
    >
      <Icon className={tone + " h-4 w-4"} aria-hidden="true" />
      <p className="mb-1 text-2xl text-neutral-200">
        <span className="mb-1 text-2xl font-bold text-neutral-200">
          {value}
        </span>{" "}
        {valueDescription}
      </p>
    </div>
  );
}

function TotalStat({ icon: Icon, label, value, to }) {
  return (
    <Link
      to={to}
      className="group flex min-w-0 items-center gap-3 rounded-xl border border-neutral-800 bg-[#141414] px-4 py-3 transition-colors hover:border-neutral-700 hover:bg-neutral-900/70"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-400">
        <Icon className="text-2xl" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium uppercase tracking-wider text-neutral-400">
          {label}
        </span>
        <span className="mt-0.5 block text-2xl font-bold text-white">
          {value}
        </span>
      </span>
      <LuArrowRight
        className="h-4 w-4 shrink-0 text-neutral-600 transition-colors group-hover:text-neutral-300"
        aria-hidden="true"
      />
    </Link>
  );
}

function SummaryCard({ icon: Icon, title, metrics, to, linkLabel }) {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-[#141414] shadow-xl">
      <div className="flex items-center gap-3 px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl  text-red-400">
          <Icon className="text-2xl" aria-hidden="true" />
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>

      <div className="grid flex-1 gap-1 px-5">{metrics}</div>

      <Link
        to={to}
        className="mt-4 flex items-center justify-end gap-3 border-t border-neutral-800 px-5 py-4 text-sm font-medium text-neutral-400 transition-colors hover:bg-neutral-900/60 hover:text-white"
      >
        {linkLabel}
        <LuArrowRight className="text-base" aria-hidden="true" />
      </Link>
    </section>
  );
}

function LoadingCards() {
  return (
    <div className="space-y-6" aria-label="Cargando resumen">
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((stat) => (
          <div
            key={stat}
            className="h-20 animate-pulse rounded-xl border border-neutral-800 bg-[#141414]"
          />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {[0, 1].map((card) => (
          <div
            key={card}
            className="h-72 animate-pulse rounded-2xl border border-neutral-800 bg-[#141414]"
          />
        ))}
      </div>
    </div>
  );
}

export const AdminHome = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const receivedRealtime = useRef(false);

  const handleRealtimeSummary = useCallback((nextSummary) => {
    receivedRealtime.current = true;
    setSummary(nextSummary);
    setError("");
    setLoading(false);
  }, []);

  useAdminSummaryRealtime(handleRealtimeSummary);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await getAdminSummary();

    if (result.success) {
      if (!receivedRealtime.current) setSummary(result.data);
    } else if (!receivedRealtime.current) {
      setError(result.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSummary();
  }, [loadSummary]);

  if (loading && !summary) {
    return (
      <div className="space-y-6 text-white">
        <PageHeading />
        <LoadingCards />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="space-y-6 text-white">
        <PageHeading />
        <div className="rounded-2xl border border-red-900/60 bg-red-950/20 p-6 text-red-300">
          <h2 className="font-semibold">No pudimos cargar el resumen</h2>
          <p className="mt-2 text-sm text-red-200/70">{error}</p>
          <button
            type="button"
            onClick={loadSummary}
            className="mt-5 rounded-lg border border-red-800 px-4 py-2 text-sm font-medium transition-colors hover:bg-red-950/60"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const hasRecords =
    summary.kilns.registered > 0 ||
    summary.controllers.registered > 0 ||
    summary.users.registered > 0;

  return (
    <div className="space-y-6 text-white">
      <PageHeading />

      {!hasRecords && (
        <p className="rounded-xl border border-neutral-800 bg-[#141414] p-4 text-sm text-neutral-400">
          Aún no hay registros en el sistema. Puedes comenzar desde cualquiera
          de las secciones de administración.
        </p>
      )}

      <section
        aria-label="Totales registrados"
        className="grid gap-4 sm:grid-cols-3"
      >
        <TotalStat
          icon={LuFlame}
          label="Hornos registrados"
          value={summary.kilns.registered}
          to="/admin/kilns"
        />
        <TotalStat
          icon={LuCircuitBoard}
          label="Controladores registrados"
          value={summary.controllers.registered}
          to="/admin/controllers"
        />
        <TotalStat
          icon={LuUsers}
          label="Usuarios registrados"
          value={summary.users.registered}
          to="/admin/users"
        />
      </section>

      <div className="grid items-stretch gap-5 lg:grid-cols-2">
        <SummaryCard
          icon={LuFlame}
          title="Hornos"
          to="/admin/kilns"
          linkLabel="Ver hornos"
          metrics={
            <>
              <Metric
                icon={LuLink}
                label="Vinculados"
                value={summary.kilns.linked}
                valueDescription="vinculados"
                tone={
                  summary.kilns.linked > 0 ? "text-blue-400" : "text-amber-400"
                }
              />
              <Metric
                icon={LuPower}
                label="En funcionamiento"
                value={summary.kilns.operational}
                valueDescription="en funcionamiento"
                tone={
                  summary.kilns.operational > 0
                    ? "text-green-400"
                    : "text-amber-400"
                }
                isLastChild
              />
            </>
          }
        />

        <SummaryCard
          icon={LuCircuitBoard}
          title="Controladores"
          to="/admin/controllers"
          linkLabel="Ver controladores"
          metrics={
            <>
              <Metric
                icon={LuLink}
                label="Vinculados"
                value={summary.controllers.linked}
                valueDescription="vinculados"
                isLastChild
                tone={
                  summary.controllers.linked > 0
                    ? "text-blue-400"
                    : "text-amber-400"
                }
              />
            </>
          }
        />
      </div>
    </div>
  );
};

function PageHeading() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Resumen</h1>
      <p className="mt-1 text-sm text-neutral-300">
        Estado general de los equipos y usuarios de la plataforma.
      </p>
    </div>
  );
}
