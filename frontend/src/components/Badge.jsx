const defaultStyles = {
  default: "bg-surface-hover border-border text-secondary",
  warning: "bg-warning-soft border-warning-border text-warning",
  danger: "bg-danger-soft border-danger-border text-danger",
  info: "bg-info-soft border-info-border text-info",
  success: "bg-success-soft border-success-border text-success",
};

const textStyles = {
  default: "text-secondary",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  success: "text-success",
};

export const Badge = ({
  style = "default",
  text,
  customStyle = null,
  description = null,
}) => {
  if (!customStyle && !defaultStyles[style]) {
    style = "default";
  }

  return (
    <div
      className={
        customStyle ||
        defaultStyles[style] +
          " max-w-max text-pretty rounded-md border px-1.5 py-0.5 text-xs leading-tight sm:px-2.5 sm:py-1 sm:text-xs"
      }
    >
      {text}
      {description && (
        <>
          <br />
          <span
            className={
              textStyles[style] +
              " max-w-max truncate text-xs leading-tight sm:text-xs"
            }
          >
            {description}
          </span>
        </>
      )}
    </div>
  );
};
