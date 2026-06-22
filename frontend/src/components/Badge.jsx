const defaultStyles = {
  default: "bg-neutral-800/60 border-neutral-700/60 text-neutral-300/80",
  warning: "bg-yellow-800/60 border-yellow-700/60 text-yellow-300/80",
  danger: "bg-red-800/60 border-red-700/60 text-red-300/90 ",
  info: "bg-blue-800/60 border-blue-700/60 text-blue-300/80",
  success: "bg-green-800/60 border-green-700/60 text-green-300/80",
};

export const Badge = ({ style = "default", text, customStyle = null }) => {
  if (!customStyle && !defaultStyles[style]) {
    style = "default";
  }

  return (
    <div
      className={
        customStyle || (defaultStyles[style] +
        " px-2.5 py-1 rounded-md border truncate max-w-max text-xs")
      }
    >
      {text}
    </div>
  );
};
