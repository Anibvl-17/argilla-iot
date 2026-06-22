import { Link, Outlet } from "react-router-dom";
import { useAuth } from "@context/AuthContext";
import { logout } from "@services/auth.service";
import { SidebarItem } from "./SidebarItem";
import argillaIcon from "@assets/argilla-icon-light.png";
import { Toaster } from "sonner";

export default function HomeLayout() {
  const { user, setUser } = useAuth();
  const userRole = user.role;

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden">
      <Toaster theme="dark"/>

      {/* Sidebar */}
      <aside className="w-64 bg-[#141414] border-r border-neutral-800 flex flex-col">
        {/* Logo*/}
        <div className="h-20 flex items-center gap-3 px-6">
          <div className="w-8 h-8 rounded-full flex items-center justify-center">
            <img src={argillaIcon} alt="Logo" />
          </div>
          <p className="font-[Pinyon_Script] text-2xl">
            <span className="text-red-500">a</span>rgilla
          </p>
        </div>

        {/* Navegación Principal */}
        <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
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
        <div className="p-4 border-t border-neutral-800">
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
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 border-b border-neutral-800 flex items-center justify-between px-8 shrink-0">
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
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
