import { Link, useLocation } from "react-router-dom";

export const SidebarItem = ({ path, title }) => {
  const location = useLocation();
  let isActive = (path) => location.pathname === path;

  if (path === "/admin" && location.pathname === "/") isActive = () => true;

  return (
    <Link
      to={path}
      className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
        isActive(path)
          ? "bg-red-900/20 text-red-500"
          : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
      }`}
    >
      {title}
    </Link>
  );
};
