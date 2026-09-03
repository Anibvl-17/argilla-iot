import { useState, useEffect } from "react";
import FieldError from "./FieldError";
import {
  clearFormError,
  hasFormError,
  normalizeFormError,
} from "../utils/formError";

export default function Modal({
  isOpen,
  onClose,
  title,
  fields,
  onSubmit,
  initialData = null,
  submitLabel = "Guardar",
  error = null,
  loading = false,
  onClearError = () => {},
  renderContent = null,
}) {
  const [formData, setFormData] = useState({});

  // Sincroniza el estado del formulario cuando se abre el modal o cambia la data inicial (modo Edición)
  useEffect(() => {
    if (isOpen) {
      const initialFormState = {};
      fields.forEach((field) => {
        initialFormState[field.name] = initialData
          ? initialData[field.name]
          : "";
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(initialFormState);
    }
  }, [isOpen, initialData, fields]);

  if (!isOpen) return null;

  const normalizedError = error ? normalizeFormError(error) : null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (normalizedError) onClearError(clearFormError(normalizedError, name));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    // Backdrop (Fondo oscuro borroso)
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-2 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      {/* Contenedor del Modal */}
      <div
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border-2 border-border bg-surface shadow-dialog animate-in fade-in zoom-in-95 duration-200 sm:max-h-[calc(100dvh-2rem)]"
        onClick={(e) => e.stopPropagation()} // Evita que clics dentro del modal lo cierren
      >
        {/* Cabecera */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface-muted px-4 py-3 sm:px-6 sm:py-4">
          <h3 className="min-w-0 text-lg font-bold tracking-tight text-content sm:text-xl">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-content transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Formulario Dinámico */}
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-col gap-5 overflow-y-auto p-4 sm:gap-8 sm:p-6"
        >
          <div className="space-y-4">
            {renderContent
              ? renderContent({
                  formData,
                  setFormData,
                  handleChange,
                  onClearError: (field) =>
                    onClearError(clearFormError(normalizedError, field)),
                  error: normalizedError,
                })
              : fields.map((field) => {
                  const errorId = `${field.name}-error`;
                  const hasFieldError = hasFormError(
                    normalizedError,
                    field.name,
                  );
                  return (
                    <div key={field.name} className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-secondary ml-1">
                        {field.label}
                      </label>

                      {field.type === "select" ? (
                        <select
                          name={field.name}
                          value={formData[field.name] || ""}
                          onChange={handleChange}
                          required={field.required !== false}
                          aria-invalid={hasFieldError || undefined}
                          aria-describedby={hasFieldError ? errorId : undefined}
                          className="w-full bg-field border border-control-border rounded-lg px-3 py-2.5 text-sm text-content outline-none focus:border-focus transition-colors appearance-none"
                        >
                          <option value="" disabled>
                            Selecciona una opción
                          </option>
                          {field.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          name={field.name}
                          placeholder={field.placeholder || ""}
                          value={formData[field.name] || ""}
                          onChange={handleChange}
                          required={field.required !== false}
                          aria-invalid={hasFieldError || undefined}
                          aria-describedby={hasFieldError ? errorId : undefined}
                          {...(field.inputProps || {})}
                          className="mt-2 w-full bg-field border-2 border-control-border rounded-lg px-3 py-2.5 text-content outline-none focus:border-focus transition-colors"
                        />
                      )}
                      <FieldError
                        error={normalizedError}
                        field={field.name}
                        id={errorId}
                      />
                    </div>
                  );
                })}
          </div>

          <FieldError error={normalizedError} />

          {/* Botones de acción */}
          <div className="flex flex-col gap-3 min-[360px]:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 border border-control-border hover:bg-surface-hover text-secondary rounded-lg text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-on-action rounded-lg text-sm font-medium transition-colors shadow-card"
            >
              {loading ? (
                <>
                  {/* Spinner SVG simple */}
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Procesando...
                </>
              ) : (
                submitLabel
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
