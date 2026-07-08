import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@context/AuthContext";
import { logout } from "@services/auth.service";
import { changePassword, getProfile } from "@services/user.service";

const emptyPasswords = {
  currentPassword: "",
  newPassword: "",
};

export default function ProfileModal({ onClose }) {
  const { setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [passwords, setPasswords] = useState(emptyPasswords);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingPassword, setSavingPassword] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getProfile().then((result) => {
      if (!active) return;

      if (result.success) {
        setProfile(result.data);
      } else {
        setError(result.message);
      }
      setLoadingProfile(false);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswords((current) => ({ ...current, [name]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSavingPassword(true);
    setError("");

    const result = await changePassword(
      passwords.currentPassword,
      passwords.newPassword,
    );

    setSavingPassword(false);
    if (!result.success) {
      setError(result.message);
      return;
    }

    setPasswords(emptyPasswords);
    onClose();
    toast.success("Contraseña actualizada exitosamente.");
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setUser(null);
  };

  const formattedDate = profile?.createdAt
    ? new Intl.DateTimeFormat("es-CL", { dateStyle: "long" }).format(
        new Date(profile.createdAt),
      )
    : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        aria-labelledby="profile-modal-title"
        aria-modal="true"
        className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-neutral-800 bg-[#141414] shadow-2xl"
        role="dialog"
      >
        <header className="sticky top-0 flex items-center justify-between border-b border-neutral-800/60 bg-[#0a0a0a] px-5 py-4 sm:px-6">
          <h3 id="profile-modal-title" className="text-xl font-bold text-white">
            Mi perfil
          </h3>
          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={onClose}
            className="rounded-md p-1 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="p-5 sm:p-6">
          {loadingProfile && (
            <p className="py-8 text-center text-sm text-neutral-400">
              Cargando perfil...
            </p>
          )}

          {!loadingProfile && profile && (
            <>
              <dl className="flex flex-col gap-6 rounded-xl border border-neutral-800 bg-[#0a0a0a] p-4">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                    Nombre
                  </dt>
                  <dd className="mt-1 wrap-break-word text-neutral-100">
                    {profile.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                    Email
                  </dt>
                  <dd className="mt-1 wrap-break-word text-neutral-100">
                    {profile.email}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                    Cuenta creada
                  </dt>
                  <dd className="mt-1 wrap-break-word text-neutral-100">
                    {formattedDate}
                  </dd>
                </div>
              </dl>

              <form onSubmit={handleSubmit} className="mt-4 pt-2 space-y-4">
                <h4 className="font-semibold text-white">Cambiar contraseña</h4>

                <label className="block font-medium text-sm text-neutral-400">
                  Contraseña actual
                  <input
                    autoComplete="current-password"
                    className="mt-2 w-full rounded-lg border-2 border-neutral-700 bg-[#0a0a0a] px-3 py-2.5 text-white outline-none transition-colors focus:border-red-600"
                    minLength={6}
                    name="currentPassword"
                    onChange={handlePasswordChange}
                    required
                    type="password"
                    value={passwords.currentPassword}
                  />
                </label>

                <label className="block font-medium text-sm text-neutral-400">
                  Nueva contraseña
                  <input
                    autoComplete="new-password"
                    className="mt-2 w-full rounded-lg border-2 border-neutral-700 bg-[#0a0a0a] px-3 py-2.5 text-white outline-none transition-colors focus:border-red-600"
                    minLength={6}
                    name="newPassword"
                    onChange={handlePasswordChange}
                    required
                    type="password"
                    value={passwords.newPassword}
                  />
                </label>

                {error && (
                  <p
                    className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400"
                    role="alert"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={savingPassword || loggingOut}
                  className="w-full rounded-lg bg-red-700 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingPassword ? "Guardando..." : "Cambiar contraseña"}
                </button>
              </form>
            </>
          )}

          {!loadingProfile && !profile && error && (
            <p
              className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="mt-6 border-t border-neutral-800 pt-5">
            <button
              type="button"
              disabled={loggingOut || savingPassword}
              onClick={handleLogout}
              className="w-full rounded-lg border border-neutral-700 py-2.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
