import { LuMoon, LuSun } from "react-icons/lu";
import { useTheme } from "@context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const label = `Cambiar a modo ${theme === "light" ? "oscuro" : "claro"}`;
  const Icon = theme === "light" ? LuMoon : LuSun;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-control-border bg-surface px-3 py-2 text-sm text-content transition-colors hover:bg-surface-hover"
    >
      <Icon className="text-lg" aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
