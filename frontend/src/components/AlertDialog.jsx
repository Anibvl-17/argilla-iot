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
          className="w-6 h-6 text-accent"
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
      iconBg: "bg-danger-soft border-danger-border",
      btnConfirm:
        "bg-primary hover:bg-primary-hover text-on-action shadow-card",
    },
    warning: {
      icon: (
        <svg
          className="w-6 h-6 text-warning"
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
      iconBg: "bg-warning-soft border-warning-border",
      btnConfirm:
        "bg-warning-action hover:bg-warning-action-hover text-on-action shadow-card",
    },
    info: {
      icon: (
        <svg
          className="w-6 h-6 text-secondary"
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
      iconBg: "bg-surface-hover border-control-border",
      btnConfirm: "bg-inverse hover:bg-inverse-hover text-on-inverse",
    },
  };

  const config = typeConfig[type] || typeConfig.info;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-overlay p-2 backdrop-blur-sm sm:p-4"
      onClick={!isLoading ? onClose : undefined} // No permite cerrar si está cargando
    >
      <div
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-sm flex-col items-center overflow-y-auto rounded-2xl border border-border bg-surface p-4 text-center shadow-dialog animate-in fade-in zoom-in-95 duration-200 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ícono superior */}
        <div
          className={`w-12 h-12 rounded-full border flex items-center justify-center mb-4 ${config.iconBg}`}
        >
          {config.icon}
        </div>

        {/* Textos */}
        <h3 className="text-xl font-bold text-content tracking-tight mb-2">
          {title}
        </h3>
        {CustomMessage ? (
          <span className="mb-6">
            <CustomMessage className="mb-8" />
          </span>
        ) : (
          <p className="text-sm text-secondary mb-8 leading-relaxed">
            {message}
          </p>
        )}

        {/* Botones */}
        <div className="flex w-full flex-col gap-3 min-[360px]:flex-row">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 border border-control-border hover:bg-surface-hover text-secondary rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
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
