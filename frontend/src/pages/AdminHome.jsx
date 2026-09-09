import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LuArrowRight, LuCircuitBoard, LuFlame, LuUsers } from "react-icons/lu";
import { getAdminSummary } from "@services/admin.service";
import { useAdminSummaryRealtime } from "@hooks/useAdminSummaryRealtime";

function SummaryCard({ icon: Icon, title, metrics, to, linkLabel }) {
  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-panel">
      <div className="flex items-center gap-3 px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl text-accent">
          <Icon className="text-2xl" aria-hidden="true" />
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>

      <dl className="grid flex-1 grid-cols-2 gap-px border-y border-border bg-border">
        {metrics.map(
          ({ label, value, tone = "text-content", wide = false }) => (
            <div
              key={label}
              className={`min-w-0 bg-surface p-4 ${wide ? "col-span-2" : ""}`}
            >
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                {label}
              </dt>
              <dd className={`mt-1 text-2xl font-bold ${tone}`}>{value}</dd>
            </div>
          ),
        )}
      </dl>

      <Link
        to={to}
        className="flex items-center justify-end gap-3 px-5 py-4 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-content"
      >
        {linkLabel}
        <LuArrowRight className="text-base" aria-hidden="true" />
      </Link>
    </section>
  );
}

function LoadingCards() {
  return (
    <div
      className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
      aria-label="Cargando resumen"
    >
      {[0, 1, 2].map((card) => (
        <div
          key={card}
          className="h-72 animate-pulse rounded-2xl border border-border bg-surface"
        />
      ))}
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
      <div className="space-y-6 text-content">
        <PageHeading />
        <LoadingCards />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="space-y-6 text-content">
        <PageHeading />
        <div className="rounded-2xl border border-danger-border bg-danger-soft p-6 text-danger">
          <h2 className="font-semibold">No pudimos cargar el resumen</h2>
          <p className="mt-2 text-sm">{error}</p>
          <button
            type="button"
            onClick={loadSummary}
            className="mt-5 rounded-lg border border-danger-border px-4 py-2 text-sm font-medium transition-colors hover:bg-danger-soft"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const hasRecords =
    summary.kilns.total > 0 ||
    summary.controllers.total > 0 ||
    summary.users.total > 0;

  return (
    <div className="space-y-6 text-content">
      <PageHeading />

      {!hasRecords && (
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          Aún no hay registros en el sistema. Puedes comenzar desde cualquiera
          de las secciones de administración.
        </p>
      )}

      <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          icon={LuFlame}
          title="Hornos"
          to="/management/kilns"
          linkLabel="Ver hornos"
          metrics={[
            { label: "Total", value: summary.kilns.total },
            { label: "Con propietario", value: summary.kilns.withOwner },
            {
              label: "Operativos",
              value: summary.kilns.operational,
              tone:
                summary.kilns.operational > 0 ? "text-info" : "text-warning",
            },
            {
              label: "Fuera de servicio",
              value: summary.kilns.outOfService,
              tone:
                summary.kilns.outOfService > 0
                  ? "text-warning"
                  : "text-content",
            },
          ]}
        />

        <SummaryCard
          icon={LuCircuitBoard}
          title="Controladores"
          to="/management/controllers"
          linkLabel="Ver controladores"
          metrics={[
            { label: "Total", value: summary.controllers.total },
            {
              label: "Con propietario",
              value: summary.controllers.withOwner,
            },
            {
              label: "Operativos",
              value: summary.controllers.operational,
              tone:
                summary.controllers.operational > 0
                  ? "text-info"
                  : "text-warning",
            },
            {
              label: "Fuera de servicio",
              value: summary.controllers.outOfService,
              tone:
                summary.controllers.outOfService > 0
                  ? "text-warning"
                  : "text-content",
            },
          ]}
        />

        <SummaryCard
          icon={LuUsers}
          title="Usuarios"
          to="/management/users"
          linkLabel="Ver usuarios"
          metrics={[
            { label: "Total", value: summary.users.total, wide: true },
            { label: "Técnicos", value: summary.users.technicians },
            { label: "Clientes", value: summary.users.clients },
          ]}
        />
      </div>
    </div>
  );
};

function PageHeading() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Resumen</h1>
      <p className="mt-1 text-sm text-secondary">
        Estado general de los equipos y usuarios de la plataforma.
      </p>
    </div>
  );
}
