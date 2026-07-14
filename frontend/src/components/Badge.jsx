const defaultStyles = {
  default: "bg-neutral-800/60 border-neutral-700/60 text-neutral-300/80",
  warning: "bg-yellow-800/60 border-yellow-700/60 text-yellow-300/80",
  danger: "bg-red-800/60 border-red-700/60 text-red-300/90 ",
  info: "bg-blue-800/60 border-blue-700/60 text-blue-300/80",
  success: "bg-green-800/60 border-green-700/60 text-green-300/80",
};

const textStyles = {
  default: "text-neutral-300/80",
  warning: "text-yellow-300/80",
  danger: "text-red-300/90 ",
  info: "text-blue-300/80",
  success: "text-green-300/80",
}

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
