import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LuLogOut } from "react-icons/lu";
import { useAuth } from "@context/AuthContext";
import { logout } from "@services/auth.service";
import {
  deactivateOwnAccount,
  deleteOwnAccount,
  getProfile,
  updateProfile,
} from "@services/user.service";
import AlertDialog from "@components/AlertDialog";
import FieldError from "@components/FieldError";
import ThemeToggle from "@components/ThemeToggle";
import UserContactFields from "@components/UserContactFields";
import useUserContactCatalog from "@hooks/useUserContactCatalog";
import { prepareUserContactPayload } from "../utils/userContact";
import {
  clearFormError,
  hasFormError,
  normalizeFormError,
} from "../utils/formError";

const emptyPasswords = {
  currentPassword: "",
  newPassword: "",
};

export default function Profile() {
  const { setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [passwords, setPasswords] = useState(emptyPasswords);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [formError, setFormError] = useState(null);
  const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);
  const [dangerAction, setDangerAction] = useState(null);
  const [dangerLoading, setDangerLoading] = useState(false);
  const {
    catalog,
    loading: catalogLoading,
    error: catalogError,
    retry: retryCatalog,
  } = useUserContactCatalog();

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

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswords((current) => ({ ...current, [name]: value }));
    setFormError((current) => clearFormError(current, name));
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
    setFormError((current) => clearFormError(current, name));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setFormError(null);

    let contactPayload;
    try {
      contactPayload = prepareUserContactPayload(profile, catalog);
    } catch (error) {
      setSavingProfile(false);
      setFormError(normalizeFormError(error));
      return;
    }

    const result = await updateProfile({
      name: profile.name.trim(),
      ...contactPayload,
      ...(passwords.currentPassword || passwords.newPassword ? passwords : {}),
    });

    setSavingProfile(false);
    if (!result.success) {
      setFormError(normalizeFormError(result));
      return;
    }

    setProfile((current) => ({
      ...result.data,
      phoneCountryCode: current.phoneCountryCode,
    }));
    setPasswords(emptyPasswords);
    setIsPasswordSectionOpen(false);
    setUser((current) => ({ ...current, name: result.data.name }));
    toast.success("Tus datos fueron actualizados.");
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setUser(null);
  };

  const handleDangerAction = async () => {
    setDangerLoading(true);
    const result =
      dangerAction === "delete"
        ? await deleteOwnAccount()
        : await deactivateOwnAccount();

    if (!result.success) {
      setDangerLoading(false);
      setDangerAction(null);
      toast.error(result.message);
      return;
    }

    toast.success(
      dangerAction === "delete"
        ? "Tu cuenta fue eliminada."
        : "Tu cuenta fue desactivada.",
    );
    setUser(null);
  };

  const formattedDate = profile?.createdAt
    ? new Intl.DateTimeFormat("es-CL", { dateStyle: "long" }).format(
        new Date(profile.createdAt),
      )
    : "";

  if (loadingProfile) {
    return (
      <div className="mx-auto max-w-5xl py-16 text-center text-sm text-muted">
        Cargando tu perfil...
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        className="mx-auto max-w-3xl rounded-2xl border border-danger-border bg-danger-soft p-6 text-danger"
        role="alert"
      >
        <h1 className="text-xl font-bold">No pudimos cargar tu perfil</h1>
        <p className="mt-2 text-sm">{profileError}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-6 pb-8">
      <header className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-content sm:text-3xl">
            Mi perfil
          </h1>
          <p className="text-sm mt-2 text-secondary sm:text-base">
            Revisa y mantén actualizada tu información personal.
          </p>
        </div>
        <button
          type="button"
          disabled={loggingOut || savingProfile || dangerLoading}
          onClick={handleLogout}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-on-action transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
        >
          <LuLogOut aria-hidden="true" />
          <span>{loggingOut ? "Cerrando..." : "Cerrar sesión"}</span>
        </button>
      </header>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-6">
        <div className="border-b border-border pb-5">
          <h2 className="text-lg font-semibold text-content">
            Información de la cuenta
          </h2>
          <p className="mt-2 text-sm text-secondary">
            Tu cuenta fue creada el {formattedDate}.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="min-w-0 space-y-6 pt-6">
          <div className="grid min-w-0 gap-5 sm:grid-cols-2">
            <label className="block min-w-0 text-sm font-medium text-muted">
              Nombre
              <input
                className="mt-2 min-w-0 max-w-full w-full rounded-lg border-2 border-control-border bg-field px-3 py-2.5 text-content outline-none focus:border-focus"
                name="name"
                minLength={2}
                maxLength={150}
                required
                value={profile.name}
                onChange={handleProfileChange}
                aria-invalid={hasFormError(formError, "name") || undefined}
                aria-describedby={
                  hasFormError(formError, "name")
                    ? "profile-name-error"
                    : undefined
                }
              />
              <FieldError
                error={formError}
                field="name"
                id="profile-name-error"
              />
            </label>

            <div className="min-w-0">
              <p className="text-sm font-medium text-muted">
                Correo electrónico
              </p>
              <p className="mt-2 break-all rounded-lg border border-border bg-surface-muted px-3 py-2.5 text-content">
                {profile.email}
              </p>
              <p className="mt-1 text-xs text-muted">
                El correo de acceso no se puede modificar.
              </p>
            </div>
          </div>

          <div className="min-w-0 border-t border-border pt-6">
            <h2 className="mb-4 text-lg font-semibold text-content">
              Contacto y dirección
            </h2>
            <UserContactFields
              value={profile}
              onChange={(nextProfile, field) => {
                setProfile(nextProfile);
                setFormError((current) => clearFormError(current, field));
              }}
              error={formError}
              onClearError={(field) =>
                setFormError((current) => clearFormError(current, field))
              }
              catalog={catalog}
              catalogLoading={catalogLoading}
              catalogError={catalogError}
              onRetryCatalog={retryCatalog}
            />
          </div>

          <div className="border-t border-border pt-6">
            <button
              type="button"
              aria-controls="password-fields"
              aria-expanded={isPasswordSectionOpen}
              onClick={() => setIsPasswordSectionOpen((current) => !current)}
              className="flex w-full items-center justify-between rounded-lg py-2 text-left text-lg font-semibold text-content transition-colors hover:text-accent"
            >
              Seguridad y contraseña
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
              <div
                id="password-fields"
                className="grid min-w-0 gap-4 pt-4 sm:grid-cols-2"
              >
                <label className="block min-w-0 text-sm font-medium text-muted">
                  Contraseña actual
                  <input
                    autoComplete="current-password"
                    className="mt-2 min-w-0 max-w-full w-full rounded-lg border-2 border-control-border bg-field px-3 py-2.5 text-content outline-none focus:border-focus"
                    minLength={6}
                    name="currentPassword"
                    onChange={handlePasswordChange}
                    type="password"
                    value={passwords.currentPassword}
                    aria-invalid={
                      hasFormError(formError, "currentPassword") || undefined
                    }
                  />
                  <FieldError error={formError} field="currentPassword" />
                </label>

                <label className="block min-w-0 text-sm font-medium text-muted">
                  Nueva contraseña
                  <input
                    autoComplete="new-password"
                    className="mt-2 min-w-0 max-w-full w-full rounded-lg border-2 border-control-border bg-field px-3 py-2.5 text-content outline-none focus:border-focus"
                    minLength={6}
                    name="newPassword"
                    onChange={handlePasswordChange}
                    type="password"
                    value={passwords.newPassword}
                    aria-invalid={
                      hasFormError(formError, "newPassword") || undefined
                    }
                  />
                  <FieldError error={formError} field="newPassword" />
                </label>
              </div>
            )}
            <FieldError error={formError} />
          </div>

          <div className="flex justify-end border-t border-border pt-6">
            <button
              type="submit"
              disabled={savingProfile || catalogLoading || !catalog}
              className="w-full rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-on-action transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {savingProfile ? "Guardando cambios..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-6">
        <h2 className="text-lg font-semibold text-content">Preferencias</h2>
        <p className="mt-1 text-sm text-secondary">
          Personaliza la apariencia de la aplicación.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <ThemeToggle shortLabel className="sm:min-w-44" />
        </div>
      </section>

      <section className="rounded-2xl border border-danger-border bg-danger-soft p-4 sm:p-6">
        <h2 className="text-lg font-bold text-danger">Peligro</h2>
        <p className="mt-1 text-sm text-secondary">
          Estas acciones afectan tu acceso y requieren confirmación.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-danger-border bg-surface p-4">
            <h3 className="font-semibold text-content">Desactivar cuenta</h3>
            <p className="mt-1 text-sm text-secondary">
              Se cerrará tu sesión y no podrás volver a ingresar hasta que un
              administrador reactive la cuenta.
            </p>
            <button
              type="button"
              onClick={() => setDangerAction("deactivate")}
              className="mt-4 rounded-lg border border-danger-border px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft"
            >
              Desactivar mi cuenta
            </button>
          </div>

          <div className="rounded-xl border border-danger-border bg-surface p-4">
            <h3 className="font-semibold text-content">Eliminar cuenta</h3>
            <p className="mt-1 text-sm text-secondary">
              Tus datos personales serán anonimizados y esta acción no se puede
              deshacer.
            </p>
            <button
              type="button"
              onClick={() => setDangerAction("delete")}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-action transition-colors hover:bg-primary-hover"
            >
              Eliminar mi cuenta
            </button>
          </div>
        </div>
      </section>

      <AlertDialog
        isOpen={Boolean(dangerAction)}
        onClose={() => !dangerLoading && setDangerAction(null)}
        onConfirm={handleDangerAction}
        title={
          dangerAction === "delete"
            ? "¿Eliminar tu cuenta?"
            : "¿Desactivar tu cuenta?"
        }
        message={
          dangerAction === "delete"
            ? "Tus datos personales serán anonimizados de forma irreversible y perderás el acceso a la cuenta."
            : "Tu sesión se cerrará inmediatamente. Un administrador deberá reactivar tu cuenta para que puedas volver a ingresar."
        }
        type={dangerAction === "delete" ? "danger" : "warning"}
        confirmText={
          dangerAction === "delete" ? "Eliminar cuenta" : "Desactivar cuenta"
        }
        isLoading={dangerLoading}
      />
    </div>
  );
}
