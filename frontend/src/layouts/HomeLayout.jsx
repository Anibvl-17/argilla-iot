import { Link, Outlet } from "react-router-dom";
import { useAuth } from "@context/AuthContext";
import { logout } from "@services/auth.service";
import { SidebarItem } from "@components/SidebarItem";
import argillaIcon from "@assets/argilla-icon-light.png";

export default function HomeLayout() {
  const { user, setUser } = useAuth();
  const userRole = user.role;

  return (
    <div className="flex h-screen flex-col bg-[#0a0a0a] text-white font-sans overflow-hidden md:flex-row">

      {/* Sidebar */}
      <aside className="flex w-full shrink-0 flex-row border-b border-neutral-800 bg-[#141414] md:w-64 md:flex-col md:border-b-0 md:border-r">
        {/* Logo*/}
        <div className="flex h-16 items-center gap-3 px-4 md:h-20 md:px-6">
          <div className="w-8 h-8 rounded-full flex items-center justify-center">
            <img src={argillaIcon} alt="Logo" />
          </div>
          <p className="hidden font-[Pinyon_Script] text-2xl sm:block">
            <span className="text-red-500">a</span>rgilla
          </p>
        </div>

        {/* Navegación Principal */}
        <nav className="flex flex-1 flex-row items-center gap-2 overflow-x-auto px-2 py-2 md:flex-col md:items-stretch md:px-4 md:py-6">
          {/* Opciones usuario */}
          {userRole === "USER" && (
            <>
              <SidebarItem path="/kilns" title="Mis hornos" />
            </>
          )}

          {/* Opciones admin */}
          {userRole === "ADMIN" && (
            <>
              <SidebarItem path="/admin" title="Resumen" />
              <SidebarItem path="/admin/users" title="Usuarios" />
              <SidebarItem path="/admin/kilns" title="Hornos" />
              <SidebarItem path="/admin/controllers" title="Controladores" />
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="hidden border-t border-neutral-800 p-4 md:block">
          <Link
            to="/profile"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-white">
              {user.name[0]}
            </div>
            <span>Mi Perfil</span>
          </Link>
        </div>
      </aside>

      {/* Vista central */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden md:h-screen">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-800 px-4 md:h-20 md:px-8">
          <h2 className="text-xl font-semibold">
            {user.role === "ADMIN" ? (
              "Panel Administrativo"
            ) : (
              <>
                Hola, <span className="text-red-500 text-shadow-sm">{user.name}</span>
              </>
            )}
          </h2>
          <Link
            onClick={async () => {
              await logout();
              setUser(null);
            }}
            className="text-sm rounded-md border bg-neutral-900 border-neutral-700/80 px-4 py-2 hover:bg-neutral-800 transition-colors"
          >
            Cerrar Sesión
          </Link>
        </header>

        {/* Area de contenido */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
