import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@context/AuthContext";
import { login, logout } from "@services/auth.service";
import useLogin from "@hooks/useLogin";
import argillaIcon from "@assets/argilla-icon-light.png";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { setUser } = useAuth();

  const { error, errorData, handleInputChange } = useLogin();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    handleInputChange();

    try {
      await logout();
      const result = await login(email, password);

      if (result.success) {
        setUser(result.user);
        navigate("/home");
      } else {
        errorData(result || "Credenciales incorrectas");
      }
    } catch (error) {
      console.error("Login error:", error);
      errorData("Error inesperado al iniciar sesión.");
    }

    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col justify-evenly bg-linear-to-b from-red-900/60 to-30% to-black p-8">
      <div className="flex flex-row items-center justify-center gap-6">
        <img src={argillaIcon} className="size-16" />
        <p className="font-[Pinyon_Script] font text-3xl">
          <span className="text-red-500">a</span>rgilla
        </p>
      </div>

      <div className="flex flex-col items-center">
        <form onSubmit={handleSubmit} className="flex flex-col gap-7">
          <div>
            <h1 className="text-3xl/relaxed font-bold">Bienvenido</h1>
            <p className="text-xl text-neutral-400">
              Ingresa tus datos para iniciar sesión
            </p>
          </div>

          <div>
            {error && (
              <p className="text-sm text-yellow-500/80 mb-2">{error}</p>
            )}
            <div className="flex flex-col">
              <label className="sr-only">Correo electrónico</label>
              <input
                type="email"
                id="email"
                placeholder="Correo electrónico"
                onChange={(e) => {
                  setEmail(e.target.value);
                  handleInputChange();
                }}
                className="bg-neutral-900 py-3 px-2 p-2 border border-gray-400 outline-0 border-b-0 rounded-t-md"
              />
            </div>
            <div className="flex flex-col">
              <label className="sr-only">Contraseña</label>
              <input
                type="password"
                id="password"
                onChange={(e) => {
                  setPassword(e.target.value);
                  handleInputChange();
                }}
                placeholder="Contraseña"
                className=" bg-neutral-900 py-3 px-2 border border-gray-400 outline-0 rounded-b-md"
              />
            </div>
          </div>

          <Link className="text-neutral-400 underline text-center py-2">
            ¿Olvidaste tu contraseña?
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="border border-red-500 bg-red-700/90 py-3 rounded-md mt-2 font-semibold transition-all hover:cursor-pointer hover:scale-105"
          >
            {loading ? "Cargando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>

      <p className="text text-neutral-400 text-center">
        ¿No tienes cuenta?{" "}
        <Link className="underline text-neutral-300/80">Registrate aquí</Link>
      </p>
    </div>
  );
};

export default Login;
