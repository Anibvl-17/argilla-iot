import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LuArrowLeft, LuCircuitBoard, LuPencil, LuSave, LuX } from "react-icons/lu";
import ControllerStatus from "@components/ControllerStatus";
import { getMyKiln, renameMyKiln } from "@services/kiln.service";
import { useControllerRealtime } from "@hooks/useControllerRealtime";

function Detail({ label, value }) {
  return <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4"><dt className="text-sm text-neutral-500">{label}</dt><dd className="mt-1 font-medium text-neutral-100">{value}</dd></div>;
}

export default function KilnDetails() {
  const { kilnId } = useParams();
  const [kiln, setKiln] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

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
    return () => { active = false; };
  }, [kilnId]);

  const handleTelemetry = useCallback((telemetry) => {
    setKiln((current) => {
      if (current?.controller?.controllerCode !== telemetry.controllerCode) return current;
      return { ...current, controller: { ...current.controller, ...telemetry } };
    });
  }, []);

  useControllerRealtime(handleTelemetry);

  async function handleRename(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const result = await renameMyKiln(kilnId, name.trim());
    setSaving(false);
    if (!result.success) {
      setFormError(result.message);
      return;
    }
    setKiln(result.data);
    setName(result.data.name);
    setEditing(false);
  }

  if (loading) return <div className="py-20 text-center text-neutral-400">Cargando horno...</div>;
  if (error || !kiln) return <div className="mx-auto max-w-3xl rounded-2xl border border-red-900/60 bg-red-950/20 p-6"><h1 className="font-semibold text-red-300">Horno no encontrado</h1><p className="mt-2 text-sm text-red-200/70">{error}</p><Link to="/kilns" className="mt-5 inline-flex items-center gap-2 text-sm text-white"><LuArrowLeft /> Volver a mis hornos</Link></div>;

  const controller = kiln.controller;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Link to="/kilns" className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-white"><LuArrowLeft /> Volver a mis hornos</Link>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-red-500">Detalle del horno</p>
          {editing ? (
            <form onSubmit={handleRename} className="mt-2 max-w-xl">
              <div className="flex gap-2"><input autoFocus value={name} onChange={(event) => { setName(event.target.value); setFormError(""); }} minLength={2} maxLength={80} required className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-[#0a0a0a] px-3 py-2 text-xl font-semibold outline-none focus:border-red-600" /><button disabled={saving} className="rounded-lg bg-red-700 px-3 text-white hover:bg-red-600" title="Guardar"><LuSave /></button><button type="button" onClick={() => { setEditing(false); setName(kiln.name); setFormError(""); }} className="rounded-lg border border-neutral-700 px-3 text-neutral-300 hover:bg-neutral-800" title="Cancelar"><LuX /></button></div>
              {formError && <p className="mt-2 text-sm text-red-400">{formError}</p>}
            </form>
          ) : (
            <div className="mt-2 flex items-center gap-3"><h1 className="truncate text-3xl font-semibold tracking-tight">{kiln.name}</h1><button onClick={() => setEditing(true)} className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white" title="Editar nombre"><LuPencil /></button></div>
          )}
        </div>
        <ControllerStatus controller={controller} />
      </div>

      <section className="mt-8 rounded-2xl border border-neutral-800 bg-[#141414] p-6">
        <h2 className="text-lg font-semibold">Información del horno</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Detail label="Capacidad" value={`${kiln.liters} litros`} /><Detail label="Amperaje" value={`${kiln.amps} A`} /><Detail label="Voltaje" value={`${kiln.volts} V`} /><Detail label="Fases" value={kiln.phases === 1 ? "Monofásico" : "Trifásico"} /></dl>
      </section>

      <section className="mt-5 rounded-2xl border border-neutral-800 bg-[#141414] p-6">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-950/50 text-red-500"><LuCircuitBoard /></div><div><h2 className="text-lg font-semibold">Controlador</h2><p className="text-sm text-neutral-500">Información técnica y telemetría actual</p></div></div>
        {controller ? (
          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Detail label="Identificador" value={`...${controller.controllerCode}`} /><Detail label="Estado operativo" value={controller.operativeStatus} /><Detail label="Temperatura" value={controller.temp == null ? "No disponible" : `${controller.temp.toFixed(1)} °C`} /><Detail label="Tipo de switch" value={controller.switchType} /><Detail label="Amperaje soportado" value={`${controller.switchAmps} A`} /></dl>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-neutral-700 p-8 text-center text-neutral-500">Este horno no tiene un controlador vinculado.</div>
        )}
      </section>
    </div>
  );
}
