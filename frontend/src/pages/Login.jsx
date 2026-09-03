import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@context/AuthContext";
import { login } from "@services/auth.service";
import useAuthForm from "@hooks/useAuthForm";
import FieldError from "@components/FieldError";
import PasswordInput from "@components/PasswordInput";
import { hasFormError } from "../utils/formError";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { loading: authLoading, user, setUser } = useAuth();
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
      const result = await login(email, password);

      if (result.success) {
        setUser(result.user);
      } else {
        errorData(result || "Credenciales incorrectas", "password");
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      errorData("Error inesperado al iniciar sesión.");
    }

    setLoading(false);
  };

  return (
    <>
      <div className="mb-6 sm:mb-8">
        <h1 className="mb-2 text-3xl/relaxed font-bold sm:text-4xl/relaxed">
          ¡Hola!
        </h1>
        <p className="text-base text-muted sm:text-lg">
          Ingresa tus credenciales para acceder
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
        {/* Input email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-secondary font-medium ml-1">
            Correo electrónico
          </label>
          <input
            type="email"
            id="email"
            name="email"
            aria-invalid={hasFormError(error, "email") || undefined}
            aria-describedby={
              hasFormError(error, "email") ? "email-error" : undefined
            }
            placeholder="ejemplo@correo.com"
            onChange={(e) => {
              setEmail(e.target.value);
              handleInputChange(e);
            }}
            className="bg-field py-3 px-4 border border-control-border rounded-lg outline-none focus:border-focus focus:bg-field-focus transition-all"
          />
          <FieldError error={error} field="email" id="email-error" />
        </div>

        {/* Input contraseña */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-secondary font-medium ml-1">
            Contraseña
          </label>
          <PasswordInput
            id="password"
            name="password"
            aria-invalid={hasFormError(error, "password") || undefined}
            aria-describedby={
              hasFormError(error, "password") ? "password-error" : undefined
            }
            placeholder="••••••••"
            onChange={(e) => {
              setPassword(e.target.value);
              handleInputChange(e);
            }}
          />
          <FieldError error={error} field="password" id="password-error" />
        </div>

        <FieldError error={error} />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-on-action py-3 rounded-lg mt-4 font-medium transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed "
        >
          {loading ? "Cargando..." : "Iniciar sesión"}
        </button>
      </form>
    </>
  );
};

export default Login;
