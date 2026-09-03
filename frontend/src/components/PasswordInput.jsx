import { useState } from "react";
import { LuEye, LuEyeOff } from "react-icons/lu";

export default function PasswordInput({
  id,
  visibilityLabel = "contraseña",
  className = "",
  disabled,
  ...inputProps
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...inputProps}
        id={id}
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={`w-full bg-field py-3 pl-4 pr-12 border border-control-border rounded-lg outline-none focus:border-focus focus:bg-field-focus transition-all ${className}`}
      />
      <button
        type="button"
        disabled={disabled}
        aria-label={`${visible ? "Ocultar" : "Mostrar"} ${visibilityLabel}`}
        aria-controls={id}
        onClick={() => setVisible((current) => !current)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted hover:text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
      >
        {visible ? (
          <LuEyeOff size={16} aria-hidden="true" />
        ) : (
          <LuEye size={16} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
