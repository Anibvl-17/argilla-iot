import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@context/AuthContext";
import useAuthForm from "@hooks/useAuthForm";
import { register } from "@services/auth.service";
import { toast } from "sonner";

/**
 * @todo En pantallas height < 700 y width > 1024, hay problemas de diseño
 */
const Register = ({ setMode }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { loading: authLoading, user } = useAuth();
  const { error, errorData, handleInputChange } = useAuthForm();

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
      if (password !== confirmPassword) {
        throw Error("Las contraseñas no coinciden");
      }

      const result = await register({ name, email, password });

      if (result.success) {
        toast.success("¡Cuenta creada exitosamente!", {
          description: "Puedes iniciar sesión",
          position: "bottom-left",
        });
        setMode("login");
      } else {
        errorData(result || "Ocurrió un error");
      }
    } catch (error) {
      console.error("Error al registrar usuario:", error);
      errorData("Error inesperado al crear cuenta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-4xl/relaxed font-bold mb-2">¡Hola!</h1>
        <p className="text-lg text-neutral-400">
          Ingresa tus datos para crear tu cuenta
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && <p className="text-sm text-yellow-500/80">{error}</p>}

        {/* Input email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-neutral-300 font-medium ml-1">Nombre</label>
          <input
            type="text"
            id="name"
            placeholder="John Doe"
            onChange={(e) => {
              setName(e.target.value);
              handleInputChange();
            }}
            className="bg-[#141414] py-3 px-4 border border-neutral-800 rounded-lg outline-none focus:border-red-500 focus:bg-[#1a1a1a] transition-all"
          />
        </div>

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

        {/* Confirmar contraseña */}
        <div className="flex flex-col gap-1.5">
          <label className="text-neutral-300 font-medium ml-1">
            Confirma tu contraseña
          </label>
          <div className="relative">
            <input
              type="password"
              id="confirm-password"
              placeholder="••••••••"
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                handleInputChange();
              }}
              className="w-full bg-[#141414] py-3 px-4 border border-neutral-800 rounded-lg outline-none focus:border-red-500 focus:bg-[#1a1a1a] transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-700 text-white py-3 rounded-lg mt-4 font-medium transition-all hover:bg-red-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(185,28,28,0.2)]"
        >
          {loading ? "Cargando..." : "Crear cuenta"}
        </button>
      </form>
    </>
  );
};

export default Register;
