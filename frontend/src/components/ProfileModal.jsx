import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@context/AuthContext";
import { logout } from "@services/auth.service";
import { changePassword, getProfile } from "@services/user.service";
import FieldError from "./FieldError";
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
  const [savingPassword, setSavingPassword] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState(null);

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSavingPassword(true);
    setPasswordError(null);

    const result = await changePassword(
      passwords.currentPassword,
      passwords.newPassword,
    );

    setSavingPassword(false);
    if (!result.success) {
      setPasswordError(normalizeFormError(result));
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
          <h3 id="profile-modal-title" className="text-xl font-bold text-content">
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
              <dl className="flex flex-col gap-6 rounded-xl border border-border bg-surface-muted p-4">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                    Nombre
                  </dt>
                  <dd className="mt-1 wrap-break-word text-content">
                    {profile.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                    Email
                  </dt>
                  <dd className="mt-1 wrap-break-word text-content">
                    {profile.email}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                    Cuenta creada
                  </dt>
                  <dd className="mt-1 wrap-break-word text-content">
                    {formattedDate}
                  </dd>
                </div>
              </dl>

              <form onSubmit={handleSubmit} className="mt-4 pt-2 space-y-4">
                <h4 className="font-semibold text-content">Cambiar contraseña</h4>

                <label className="block font-medium text-sm text-muted">
                  Contraseña actual
                  <input
                    autoComplete="current-password"
                    className="mt-2 w-full rounded-lg border-2 border-control-border bg-field px-3 py-2.5 text-content outline-none transition-colors focus:border-focus"
                    minLength={6}
                    name="currentPassword"
                    onChange={handlePasswordChange}
                    required
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

                <label className="block font-medium text-sm text-muted">
                  Nueva contraseña
                  <input
                    autoComplete="new-password"
                    className="mt-2 w-full rounded-lg border-2 border-control-border bg-field px-3 py-2.5 text-content outline-none transition-colors focus:border-focus"
                    minLength={6}
                    name="newPassword"
                    onChange={handlePasswordChange}
                    required
                    type="password"
                    value={passwords.newPassword}
                    aria-invalid={
                      hasFormError(passwordError, "newPassword") || undefined
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

                <button
                  type="submit"
                  disabled={savingPassword || loggingOut}
                  className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-on-action transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingPassword ? "Guardando..." : "Cambiar contraseña"}
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

          <div className="mt-6 border-t border-border pt-5">
            <button
              type="button"
              disabled={loggingOut || savingPassword}
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
