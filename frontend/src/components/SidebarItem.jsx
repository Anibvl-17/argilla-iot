import { Link, useLocation } from "react-router-dom";

export const SidebarItem = ({ path, title, icon: Icon }) => {
  const location = useLocation();
  let isActive = (path) => location.pathname === path;

  if ((path === "/admin" || path === "/kilns") && location.pathname === "/")
    isActive = () => true;

  return (
    <Link
      to={path}
      className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[10px] font-medium transition-colors md:flex-row md:justify-start md:gap-3 md:px-4 md:py-3 md:text-sm ${
        isActive(path)
          ? "bg-red-900/20 text-red-500"
          : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
      }`}
    >
      {Icon && <Icon className="h-5 w-5 shrink-0 md:h-4 md:w-4" aria-hidden="true" />}
      <span className="max-w-full truncate">{title}</span>
    </Link>
  );
};
