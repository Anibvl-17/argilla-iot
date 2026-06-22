import { useState, useEffect } from "react";

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (error) {
      onClearError();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    // Backdrop (Fondo oscuro borroso)
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* Contenedor del Modal */}
      <div
        className="bg-[#141414] border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()} // Evita que clics dentro del modal lo cierren
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/60 bg-[#0a0a0a]/50">
          <h3 className="text-xl font-bold text-white tracking-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition-colors"
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
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-red-400 leading-snug">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {fields.map((field) => (
              <div key={field.name} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-400 ml-1">
                  {field.label}
                </label>

                {field.type === "select" ? (
                  // Input tipo Select
                  <select
                    name={field.name}
                    value={formData[field.name] || ""}
                    onChange={handleChange}
                    required={field.required !== false}
                    className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-red-500 transition-colors appearance-none"
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
                  // Inputs regulares (text, number, email, password)
                  <input
                    type={field.type}
                    name={field.name}
                    placeholder={field.placeholder || ""}
                    value={formData[field.name] || ""}
                    onChange={handleChange}
                    required={field.required !== false}
                    className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-red-500 transition-colors"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Botones de acción */}
          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 rounded-lg text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-red-900/20"
            >
              {loading ? (
                <>
                  {/* Spinner SVG simple */}
                  <svg
                    className="animate-spin h-4 w-4 text-white"
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
