export default function AlertDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  CustomMessage = null,
  type = "danger", // danger | warning | info
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isLoading = false,
}) {
  if (!isOpen) return null;

  // Diccionario de estilos y configuraciones según el tipo de alerta
  const typeConfig = {
    danger: {
      icon: (
        <svg
          className="w-6 h-6 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
      iconBg: "bg-red-500/10 border-red-500/20",
      btnConfirm:
        "bg-red-700 hover:bg-red-600 text-white shadow-lg shadow-red-900/20",
    },
    warning: {
      icon: (
        <svg
          className="w-6 h-6 text-yellow-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      iconBg: "bg-yellow-500/10 border-yellow-500/20",
      btnConfirm:
        "bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg shadow-yellow-900/20",
    },
    info: {
      icon: (
        <svg
          className="w-6 h-6 text-neutral-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      iconBg: "bg-neutral-800 border-neutral-700",
      btnConfirm: "bg-neutral-200 hover:bg-white text-black",
    },
  };

  const config = typeConfig[type] || typeConfig.info;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={!isLoading ? onClose : undefined} // No permite cerrar si está cargando
    >
      <div
        className="bg-[#141414] border border-neutral-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6 flex flex-col items-center text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ícono superior */}
        <div
          className={`w-12 h-12 rounded-full border flex items-center justify-center mb-4 ${config.iconBg}`}
        >
          {config.icon}
        </div>

        {/* Textos */}
        <h3 className="text-xl font-bold text-white tracking-tight mb-2">
          {title}
        </h3>
        {CustomMessage ? (
          <span className="mb-6">
            <CustomMessage className="mb-8" />
          </span>
        ) : (
          <p className="text-sm text-neutral-400 mb-8 leading-relaxed">
            {message}
          </p>
        )}

        {/* Botones */}
        <div className="flex w-full gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex justify-center items-center gap-2 disabled:opacity-50 ${config.btnConfirm}`}
          >
            {isLoading ? (
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
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
