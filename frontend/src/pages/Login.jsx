import { useState, useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@context/AuthContext";
import { login } from "@services/auth.service";
import useLogin from "@hooks/useLogin";
import argillaIcon from "@assets/argilla-icon-light.png";
import kiln from "@assets/kiln-illustration.webp";

/**
 * @todo En pantallas height < 700 y width > 1024, hay problemas de diseño
 */
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { loading: authLoading, user, setUser } = useAuth();
  const { error, errorData, handleInputChange } = useLogin();

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

  // Evita cargar formulario en caso que haya un usuario con sesión iniciada
  if (authLoading) return null;

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    handleInputChange();

    try {
      const result = await login(email, password);

      if (result.success) {
        setUser(result.user);
      } else {
        errorData(result || "Credenciales incorrectas");
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      errorData("Error inesperado al iniciar sesión.");
    }

    setLoading(false);
  };

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
          <div className="mb-8">
            <h1 className="text-4xl/relaxed font-bold mb-2">¡Hola!</h1>
            <p className="text-lg text-neutral-400">
              Ingresa tus credenciales para acceder
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && <p className="text-sm text-yellow-500/80">{error}</p>}

            {/* Input email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-neutral-300 font-medium ml-1">
                Correo electrónico
              </label>
              <input
                type="email"
                id="email"
                placeholder="ejemplo@correo.com"
                onChange={(e) => {
                  setEmail(e.target.value);
                  handleInputChange();
                }}
                className="bg-[#141414] py-3 px-4 border border-neutral-800 rounded-lg outline-none focus:border-red-500 focus:bg-[#1a1a1a] transition-all"
              />
            </div>

            {/* Input contraseña */}
            <div className="flex flex-col gap-1.5">
              <label className="text-neutral-300 font-medium ml-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type="password"
                  id="password"
                  placeholder="••••••••"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    handleInputChange();
                  }}
                  className="w-full bg-[#141414] py-3 px-4 border border-neutral-800 rounded-lg outline-none focus:border-red-500 focus:bg-[#1a1a1a] transition-all"
                />
                {/* Icono ojo */}
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="text-center mt-1">
              <Link className="text-sm text-neutral-400 py-3 underline hover:text-white transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-700 text-white py-3 rounded-lg mt-4 font-medium transition-all hover:bg-red-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(185,28,28,0.2)]"
            >
              {loading ? "Cargando..." : "Iniciar sesión"}
            </button>
          </form>

          <p className="text text-neutral-400 text-center mt-8">
            ¿No tienes cuenta?{" "}
            <Link className="text-white underline hover:text-red-400 transition-colors">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </section>

      {/* ]Columna derecha, visible en pantallas grandes */}
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

export default Login;
