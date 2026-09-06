import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@context/AuthContext";
import { logout } from "@services/auth.service";
import { getProfile, updateProfile } from "@services/user.service";
import FieldError from "./FieldError";
import ThemeToggle from "./ThemeToggle";
import {
  clearFormError,
  hasFormError,
  normalizeFormError,
} from "../utils/formError";

const emptyPasswords = {
  currentPassword: "",
  newPassword: "",
};

export default function ProfileModal({ onClose }) {
  const { setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [passwords, setPasswords] = useState(emptyPasswords);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState(null);
  const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);

  useEffect(() => {
    let active = true;

    getProfile().then((result) => {
      if (!active) return;

      if (result.success) {
        setProfile(result.data);
      } else {
        setProfileError(result.message);
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
    setPasswordError((current) => clearFormError(current, name));
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
    setPasswordError((current) => clearFormError(current, name));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setPasswordError(null);

    const result = await updateProfile({
      name: profile.name.trim(),
      phone: profile.phone?.trim() || null,
      ...(passwords.currentPassword || passwords.newPassword ? passwords : {}),
    });

    setSavingProfile(false);
    if (!result.success) {
      setPasswordError(normalizeFormError(result));
      return;
    }

    setPasswords(emptyPasswords);
    setUser((current) => ({ ...current, name: result.data.name }));
    onClose();
    toast.success("Perfil actualizado exitosamente.");
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-2 backdrop-blur-sm sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        aria-labelledby="profile-modal-title"
        aria-modal="true"
        className="max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-y-auto rounded-2xl border-2 border-border bg-surface shadow-dialog sm:max-h-[calc(100dvh-2rem)]"
        role="dialog"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface-muted px-4 py-3 sm:px-6 sm:py-4">
          <h3
            id="profile-modal-title"
            className="text-xl font-bold text-content"
          >
            Mi perfil
          </h3>
          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={onClose}
            className="rounded-md p-1 text-muted transition-colors hover:bg-surface-hover hover:text-content"
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

        <div className="p-4 sm:p-6">
          {loadingProfile && (
            <p className="py-8 text-center text-sm text-muted">
              Cargando perfil...
            </p>
          )}

          {!loadingProfile && profile && (
            <>
              <p className="pb-4 text-secondary text-sm border-b border-border text-pretty">
                Revisa y edita la información de tu perfil. También puedes actualizar tu contraseña.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-muted sm:col-span-2">
                    Nombre
                    <input
                      className="mt-2 w-full rounded-lg border-2 border-control-border bg-field px-3 py-2.5 text-content outline-none focus:border-focus"
                      name="name"
                      minLength={2}
                      maxLength={150}
                      required
                      value={profile.name}
                      onChange={handleProfileChange}
                    />
                  </label>

                  <label className="block text-sm font-medium text-muted sm:col-span-2">
                    Teléfono
                    <input
                      className="mt-2 w-full rounded-lg border-2 border-control-border bg-field px-3 py-2.5 text-content outline-none focus:border-focus"
                      name="phone"
                      value={profile.phone || ""}
                      onChange={handleProfileChange}
                    />
                  </label>

                  <div className="">
                    <p className="text-sm font-medium text-muted">
                      Correo electrónico
                    </p>
                    <p className="mt-1 break-all text-content">
                      {profile.email}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted">
                      Cuenta creada
                    </p>
                    <p className="mt-1 text-content">{formattedDate}</p>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <button
                    type="button"
                    aria-controls="password-fields"
                    aria-expanded={isPasswordSectionOpen}
                    onClick={() =>
                      setIsPasswordSectionOpen((current) => !current)
                    }
                    className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-left font-semibold text-content transition-colors hover:text-accent"
                  >
                    Cambiar contraseña
                    <svg
                      aria-hidden="true"
                      className={`h-5 w-5 text-muted transition-transform ${
                        isPasswordSectionOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m6 9 6 6 6-6"
                      />
                    </svg>
                  </button>

                  {isPasswordSectionOpen && (
                    <div id="password-fields" className="space-y-4 pt-3">
                      <label className="block text-sm font-medium text-muted">
                        Contraseña actual
                        <input
                          autoComplete="current-password"
                          className="mt-2 w-full rounded-lg border-2 border-control-border bg-field px-3 py-2.5 text-content outline-none transition-colors focus:border-focus"
                          minLength={6}
                          name="currentPassword"
                          onChange={handlePasswordChange}
                          type="password"
                          value={passwords.currentPassword}
                          aria-invalid={
                            hasFormError(passwordError, "currentPassword") ||
                            undefined
                          }
                          aria-describedby={
                            hasFormError(passwordError, "currentPassword")
                              ? "current-password-error"
                              : undefined
                          }
                        />
                        <FieldError
                          error={passwordError}
                          field="currentPassword"
                          id="current-password-error"
                        />
                      </label>

                      <label className="block text-sm font-medium text-muted">
                        Nueva contraseña
                        <input
                          autoComplete="new-password"
                          className="mt-2 w-full rounded-lg border-2 border-control-border bg-field px-3 py-2.5 text-content outline-none transition-colors focus:border-focus"
                          minLength={6}
                          name="newPassword"
                          onChange={handlePasswordChange}
                          type="password"
                          value={passwords.newPassword}
                          aria-invalid={
                            hasFormError(passwordError, "newPassword") ||
                            undefined
                          }
                          aria-describedby={
                            hasFormError(passwordError, "newPassword")
                              ? "new-password-error"
                              : undefined
                          }
                        />
                        <FieldError
                          error={passwordError}
                          field="newPassword"
                          id="new-password-error"
                        />
                      </label>

                      <FieldError error={passwordError} />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={savingProfile || loggingOut}
                  className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-on-action transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingProfile ? "Guardando..." : "Guardar cambios"}
                </button>
              </form>
            </>
          )}

          {!loadingProfile && !profile && profileError && (
            <p
              className="rounded-lg border border-danger-border bg-danger-soft p-3 text-sm text-accent"
              role="alert"
            >
              {profileError}
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
            <ThemeToggle shortLabel className="w-full" />
            <button
              type="button"
              disabled={loggingOut || savingProfile}
              onClick={handleLogout}
              className="w-full rounded-lg border border-control-border py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-surface-hover hover:text-content disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
