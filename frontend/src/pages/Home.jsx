import { useAuth } from "@context/AuthContext";
import { ROLES } from "../constants/user.constants";
import { Navigate } from "react-router-dom";

// ==========================================
// 1. DATOS SIMULADOS (Pronto vendrán de MQTT/Backend)
// ==========================================
const mockKilns = [
  {
    id: "k-001",
    name: "Horno Principal 120L",
    status: "HEATING", // Calentando
    currentTemp: 845,
    targetTemp: 1040,
    currentCurve: "Bizcocho Lento",
    elapsedTime: "04:20:15",
  },
  {
    id: "k-002",
    name: "Horno Pruebas 20L",
    status: "COOLING", // Enfriando
    currentTemp: 320,
    targetTemp: 25, // Temperatura ambiente objetivo
    currentCurve: "Esmalte Alta 1240°C",
    elapsedTime: "12:05:00",
  },
  {
    id: "k-003",
    name: "Horno Taller 60L",
    status: "OFFLINE", // Apagado / Desconectado
    currentTemp: 22,
    targetTemp: null,
    currentCurve: "Ninguna",
    elapsedTime: "--:--:--",
  },
];

// ==========================================
// 2. COMPONENTES AUXILIARES (Para UI limpia)
// ==========================================
const StatusBadge = ({ status }) => {
  const styles = {
    HEATING: "bg-red-500/10 text-red-500 border-red-500/20",
    COOLING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    OFFLINE: "bg-neutral-800 text-neutral-400 border-neutral-700",
  };

  const labels = {
    HEATING: "Calentando",
    COOLING: "Enfriando",
    OFFLINE: "Apagado",
  };

  return (
    <span
      className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
};

// ==========================================
// 3. COMPONENTE PRINCIPAL
// ==========================================
export default function Home() {
  const { user } = useAuth();

  if (user.role === ROLES.ADMIN) {
    return <Navigate to={"/admin"} replace />
  }
  console.log(user);
  

  return (
    <div className="flex flex-col h-full text-white">
      {/* Cabecera de la sección */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Panel de Control</h1>
        <p className="text-neutral-400">
          Monitorea el estado térmico de tus equipos en tiempo real.
        </p>
      </div>

      {/* Cuadrícula de Hornos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {mockKilns.map((kiln) => (
          <div
            key={kiln.id}
            className="bg-[#141414] border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-700 transition-colors flex flex-col"
          >
            {/* Header de la Card */}
            <div className="flex justify-between items-center p-5 border-b border-neutral-800/50">
              <h3 className="font-semibold text-lg">{kiln.name}</h3>
              <StatusBadge status={kiln.status} />
            </div>

            {/* Cuerpo de la Card (Temperatura Principal) */}
            <div className="p-6 flex-1 flex flex-col items-center justify-center relative">
              {/* Efecto de resplandor sutil de fondo si está calentando */}
              {kiln.status === "HEATING" && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-red-600/10 blur-2xl rounded-full"></div>
              )}

              <div className="relative z-10 flex items-start gap-1">
                <span className="text-6xl font-bold tracking-tight">
                  {kiln.currentTemp}
                </span>
                <span className="text-2xl font-medium text-neutral-500 mt-2">
                  °C
                </span>
              </div>

              {kiln.targetTemp && (
                <p className="text-sm text-neutral-500 mt-2">
                  Objetivo:{" "}
                  <span className="text-neutral-300">{kiln.targetTemp}°C</span>
                </p>
              )}
            </div>

            {/* Footer de la Card (Detalles técnicos) */}
            <div className="bg-[#0a0a0a] p-4 text-sm border-t border-neutral-800/50 flex justify-between items-center">
              <div className="flex flex-col gap-1">
                <span className="text-neutral-500">Curva actual</span>
                <span
                  className="font-medium truncate max-w-[150px]"
                  title={kiln.currentCurve}
                >
                  {kiln.currentCurve}
                </span>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <span className="text-neutral-500">Tiempo</span>
                <span className="font-medium font-mono">
                  {kiln.elapsedTime}
                </span>
              </div>
            </div>

            {/* Botón de acción */}
            <button className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-sm font-medium transition-colors border-t border-neutral-800 flex justify-center items-center gap-2">
              Ver detalles de quema
              {/* <ChevronRight size={16} /> */}
            </button>
          </div>
        ))}

        {/* Card para "Añadir Nuevo Horno" */}
        <button className="bg-[#0a0a0a] border-2 border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center p-8 hover:border-neutral-600 hover:bg-[#141414] transition-all group min-h-[350px]">
          <div className="w-12 h-12 rounded-full bg-neutral-900 group-hover:bg-neutral-800 flex items-center justify-center mb-4 transition-colors">
            <span className="text-2xl text-neutral-400 group-hover:text-white">
              +
            </span>
          </div>
          <span className="font-medium text-neutral-400 group-hover:text-white">
            Registrar nuevo equipo
          </span>
        </button>
      </div>
    </div>
  );
}
