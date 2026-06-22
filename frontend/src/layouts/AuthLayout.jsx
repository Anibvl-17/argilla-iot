import { useMemo, useState } from "react";
import argillaIcon from "@assets/argilla-icon-light.png";
import kiln from "@assets/kiln-illustration.webp";
import Login from "../pages/Login";
import Register from "../pages/Register";

/**
 * @todo En pantallas height < 700 y width > 1024, hay problemas de diseño
 */
const AuthLayout = () => {
  const [mode, setMode] = useState("login");

  const renderDecorativeSquares = (prefix) => {
    const squares = Array.from({ length: 12 });
    return squares.map((_, i) => (
      <div
        key={`${prefix}-${i}`}
        className={`bg-white rounded-sm ${Math.random() > 0.5 ? "opacity-10" : "opacity-5"}`}
        style={{
          width: `${Math.random() * 20 + 10}px`,
          height: `${Math.random() * 20 + 10}px`,
        }}
      />
    ));
  };

  const topSquares = useMemo(() => renderDecorativeSquares("top"), []);
  const bottomSquares = useMemo(() => renderDecorativeSquares("bottom"), []);

  return (
    <main className="min-h-screen flex w-full font-sans">
      {/* Columna izquierda */}
      <section className="w-full lg:w-1/2 bg-[#0a0a0a] text-white flex flex-col relative py-8 px-8 sm:px-16 md:px-24 not-lg:bg-linear-to-b not-lg:from-red-700/30 not-lg:to-30% not-lg:to-[#0a0a0a]">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-16 lg:mb-0 lg:absolute lg:top-8 lg:left-12">
          <div className="not-lg:hidden w-10 h-10 rounded-full flex items-center justify-center">
            <img src={argillaIcon} />
          </div>
          <p className="font-[Pinyon_Script] text-3xl not-lg:m-auto">
            <span className="text-red-500">a</span>rgilla
          </p>
        </div>

        {/* Contenedor formulario */}
        <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
          {mode === "login" ? <Login /> : <Register setMode={setMode} />}
          <p className="text text-neutral-400 text-center mt-8">
            {mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
            <button
              onClick={() =>
                mode === "login" ? setMode("register") : setMode("login")
              }
              className="text-neutral-300 underline hover:text-red-400 transition-colors"
            >
              {mode === "login" ? "Crea una cuenta" : "Inicia sesión"}
            </button>
          </p>
        </div>
      </section>

      {/* Columna derecha, visible en pantallas grandes */}
      <section className="hidden lg:flex lg:w-1/2 bg-[#450a0a] relative items-center justify-center overflow-hidden">
        {/* Decoraciones superior derecho */}
        <div className="absolute top-0 right-0 p-12 flex flex-wrap gap-3 w-48 justify-end opacity-40">
          {topSquares}
        </div>

        {/* Decoraciones inferior izquierdo */}
        <div className="absolute bottom-0 left-0 p-12 flex flex-wrap gap-3 w-48 justify-start opacity-40">
          {bottomSquares}
        </div>

        {/* Contenedor cards minifoto y gráfica */}
        <div className="relative w-full max-w-lg h-100">
          {/* Card Horno inclinada hacia la izquierda */}
          <div className="absolute top-4 left-10 w-64 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-3 -rotate-6 z-10 hover:rotate-0 hover:z-30 transition-all duration-300">
            <img
              src={kiln}
              alt="Horno cerámico"
              className="w-full h-40 object-cover rounded-xl"
            />
            <div className="p-3 flex flex-col items-start gap-2">
              <p className="text-sm ml-1 font-medium">Horno Taller 60L</p>
              <p className="text-xs py-1 px-3 bg-green-900/40 border border-green-500/40 rounded-md">
                Activo
              </p>
            </div>
          </div>

          {/* Card Control de Temperatura, inclinada hacia la derecha, superpuesta */}
          <div className="absolute bottom-4 right-10 w-72 bg-[#0a0a0a] border border-neutral-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-5 rotate-3 z-20 hover:rotate-0 hover:scale-105 transition-all duration-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-medium text-sm">Curva de Quema</h3>
              <span className="text-red-500 text-sm font-bold px-2 py-1 bg-red-500/10 rounded-md">
                1240°C
              </span>
            </div>
            {/* Gráfico simulado */}
            <div className="w-full h-32 flex items-end gap-2 border-b border-neutral-800 pb-2 relative">
              {/* Línea de tendencia */}
              <svg
                className="absolute inset-0 w-full h-full"
                preserveAspectRatio="none"
              >
                <path
                  d="M0,100 Q40,90 80,40 T150,20 T250,5"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              {/* Barras de fondo  */}
              <div className="w-1/5 h-[20%] bg-neutral-900 rounded-t-sm"></div>
              <div className="w-1/5 h-[40%] bg-neutral-900 rounded-t-sm"></div>
              <div className="w-1/5 h-[60%] bg-neutral-900 rounded-t-sm"></div>
              <div className="w-1/5 h-[80%] bg-neutral-900 rounded-t-sm"></div>
              <div className="w-1/5 h-full bg-red-900/40 rounded-t-sm"></div>
            </div>
          </div>
        </div>

        {/* Textos descriptivos debajo de las cards */}
        <div className="absolute bottom-20 flex flex-col items-center text-center px-12 z-20">
          <h2 className="text-2xl font-semibold text-white mb-3">
            Te damos la bienvenida
          </h2>
          <p className="text-sm text-red-200/70 max-w-md leading-relaxed">
            Monitorea tus hornos, diseña curvas de quema y mantén el control
            absoluto de tus quemas desde cualquier lugar.
          </p>
        </div>
      </section>
    </main>
  );
};

export default AuthLayout;
