import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "@context/AuthContext";
import { SidebarItem } from "@components/SidebarItem";
import ProfileModal from "@components/ProfileModal";
import argillaIcon from "@assets/argilla-icon-light.png";
import {
  LuChartNoAxesCombined,
  LuCircuitBoard,
  LuFlame,
  LuUser,
  LuUsers,
} from "react-icons/lu";

export default function HomeLayout() {
  const { user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const userRole = user.role;

  return (
    <div className="flex h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-[#0a0a0a] font-sans text-white md:flex-row">
      {/* Sidebar */}
      <aside className="flex w-full shrink-0 flex-col border-b border-neutral-800 bg-[#141414] md:w-64 md:border-b-0 md:border-r">
        {/* Logo*/}
        <div className="hidden h-14 shrink-0 items-center gap-3 px-3 sm:h-16 sm:px-4 md:flex md:h-20 md:px-6">
          <div className="w-8 h-8 rounded-full flex items-center justify-center">
            <img src={argillaIcon} alt="Logo" />
          </div>
          <p className="hidden font-[Pinyon_Script] text-2xl sm:block">
            <span className="text-red-500">a</span>rgilla
          </p>
        </div>

        {/* Navegación Principal */}
        <nav className={`grid min-w-0 gap-1 px-2 py-1.5 md:flex md:flex-1 md:flex-col md:items-stretch md:gap-2 md:px-4 md:py-6 ${userRole === "ADMIN" ? "grid-cols-4" : "grid-cols-1"}`}>
          {/* Opciones usuario */}
          {userRole === "USER" && (
            <>
              <SidebarItem path="/kilns" title="Mis hornos" icon={LuFlame} />
            </>
          )}

          {/* Opciones admin */}
          {userRole === "ADMIN" && (
            <>
              <SidebarItem path="/admin" title="Resumen" icon={LuChartNoAxesCombined} />
              <SidebarItem path="/admin/users" title="Usuarios" icon={LuUsers} />
              <SidebarItem path="/admin/kilns" title="Hornos" icon={LuFlame} />
              <SidebarItem path="/admin/controllers" title="Controladores" icon={LuCircuitBoard} />
            </>
          )}
        </nav>
      </aside>

      {/* Vista central */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:h-dvh">
        <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-neutral-800 px-3 py-2 sm:px-4 md:min-h-20 md:px-8">
          <h2 className="min-w-0 truncate text-base font-semibold sm:text-xl">
            {user.role === "ADMIN" ? (
              "Panel Administrativo"
            ) : (
              <>
                Hola,{" "}
                <span className="text-red-500 text-shadow-sm">{user.name}</span>
              </>
            )}
          </h2>
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-2 rounded-md border border-neutral-700/80 bg-neutral-900 px-3 py-2 text-sm transition-colors hover:bg-neutral-800 sm:px-4 hover:cursor-pointer"
          >
            <LuUser className="text-lg"/>
            <span className="hidden sm:inline">Mi perfil</span>
          </button>
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
