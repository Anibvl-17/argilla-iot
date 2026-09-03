import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "@context/AuthContext";
import { SidebarItem } from "@components/SidebarItem";
import ProfileModal from "@components/ProfileModal";
import ThemeToggle from "@components/ThemeToggle";
import argillaIcon from "@assets/argilla-icon-light.png";
import {
  LuChartNoAxesCombined,
  LuCircuitBoard,
  LuFlame,
  LuMicrochip,
  LuUser,
  LuUsers,
} from "react-icons/lu";

export default function HomeLayout() {
  const { user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const userRole = user.role;

  return (
    <div className="flex h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-app font-sans text-content xl:flex-row">
      {/* Sidebar */}
      <aside className="flex w-full shrink-0 flex-col border-b border-nav-border bg-nav text-nav-content xl:w-64 xl:border-b-0 xl:border-r">
        {/* Logo*/}
        <div className="hidden h-14 shrink-0 items-center gap-3 px-3 sm:h-16 sm:px-4 xl:flex xl:h-20 xl:px-6">
          <div className="w-8 h-8 rounded-full flex items-center justify-center">
            <img src={argillaIcon} alt="Logo" />
          </div>
          <p className="hidden font-[Pinyon_Script] text-2xl sm:block">
            <span className="text-nav-accent">a</span>rgilla
          </p>
        </div>

        {/* Navegación Principal */}
        <nav
          className={`grid min-w-0 gap-1 px-2 py-1.5 xl:flex xl:flex-1 xl:flex-col xl:items-stretch xl:gap-2 xl:px-4 xl:py-6 ${userRole === "ADMIN" ? "grid-cols-5" : "grid-cols-2"}`}
        >
          {/* Opciones usuario */}
          {userRole === "USER" && (
            <>
              <SidebarItem path="/kilns" title="Mis hornos" icon={LuFlame} />
            </>
          )}

          {/* Opciones admin */}
          {userRole === "ADMIN" && (
            <>
              <SidebarItem
                path="/admin"
                title="Resumen"
                icon={LuChartNoAxesCombined}
              />
              <SidebarItem
                path="/admin/users"
                title="Usuarios"
                icon={LuUsers}
              />
              <SidebarItem path="/admin/kilns" title="Hornos" icon={LuFlame} />
              <SidebarItem
                path="/admin/controllers"
                title="Controladores"
                icon={LuCircuitBoard}
              />
            </>
          )}
          <SidebarItem path="/simulator" title="Simulador" icon={LuMicrochip} />
        </nav>
      </aside>

      {/* Vista central */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden xl:h-dvh">
        <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-3 py-2 sm:px-4 md:min-h-20 md:px-8">
          <h2 className="min-w-0 truncate text-base font-semibold sm:text-xl">
            {user.role === "ADMIN" ? (
              "Panel Administrativo"
            ) : (
              <>
                Hola,{" "}
                <span className="text-accent">{user.name}</span>
              </>
            )}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 rounded-md border border-control-border bg-surface px-3 py-2 text-sm transition-colors hover:bg-surface-hover sm:px-4 hover:cursor-pointer"
              aria-label="Mi perfil"
            >
              <LuUser className="text-lg" />
              <span className="hidden sm:inline">Mi perfil</span>
            </button>
          </div>
        </header>

        {/* Area de contenido */}
        <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 md:p-8">
          <Outlet />
        </div>
      </main>
      {isProfileOpen && (
        <ProfileModal onClose={() => setIsProfileOpen(false)} />
      )}
    </div>
  );
}
