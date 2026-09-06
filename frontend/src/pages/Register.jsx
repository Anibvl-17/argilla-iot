import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@context/AuthContext";
import useAuthForm from "@hooks/useAuthForm";
import { register } from "@services/auth.service";
import { toast } from "sonner";
import FieldError from "@components/FieldError";
import PasswordInput from "@components/PasswordInput";
import { hasFormError } from "../utils/formError";

const Register = ({ setMode }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
        errorData("Las contraseñas no coinciden", "confirmPassword");
        return;
      }

      const result = await register({ name, email, phone: phone || null, password });

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
      <div className="mb-5 sm:mb-8">
        <h1 className="mb-2 text-3xl/relaxed font-bold sm:text-4xl/relaxed">
          ¡Hola!
        </h1>
        <p className="text-base text-muted sm:text-lg">
          Ingresa tus datos para crear tu cuenta
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-5">
        {/* Input email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-secondary font-medium ml-1">Nombre</label>
          <input
            type="text"
            id="name"
            name="name"
            aria-invalid={hasFormError(error, "name") || undefined}
            aria-describedby={
              hasFormError(error, "name") ? "name-error" : undefined
            }
            placeholder="John Doe"
            onChange={(e) => {
              setName(e.target.value);
              handleInputChange(e);
            }}
            className="bg-field py-3 px-4 border border-control-border rounded-lg outline-none focus:border-focus focus:bg-field-focus transition-all"
          />
          <FieldError error={error} field="name" id="name-error" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-secondary font-medium ml-1">Teléfono (opcional)</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={phone}
            placeholder="+56 9 1234 5678"
            onChange={(e) => {
              setPhone(e.target.value);
              handleInputChange(e);
            }}
            className="bg-field py-3 px-4 border border-control-border rounded-lg outline-none focus:border-focus focus:bg-field-focus transition-all"
          />
          <FieldError error={error} field="phone" id="phone-error" />
        </div>

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

        {/* Confirmar contraseña */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="confirm-password"
            className="text-secondary font-medium ml-1"
          >
            Confirma tu contraseña
          </label>
          <PasswordInput
            id="confirm-password"
            name="confirmPassword"
            visibilityLabel="confirmación de contraseña"
            aria-invalid={hasFormError(error, "confirmPassword") || undefined}
            aria-describedby={
              hasFormError(error, "confirmPassword")
                ? "confirm-password-error"
                : undefined
            }
            placeholder="••••••••"
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              handleInputChange(e);
            }}
          />
          <FieldError
            error={error}
            field="confirmPassword"
            id="confirm-password-error"
          />
        </div>

        <FieldError error={error} />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-on-action py-3 rounded-lg mt-4 font-medium transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed "
        >
          {loading ? "Cargando..." : "Crear cuenta"}
        </button>
      </form>
    </>
  );
};

export default Register;
