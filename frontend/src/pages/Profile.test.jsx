import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Profile from "./Profile";

const mocks = vi.hoisted(() => ({
  setUser: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  deactivateOwnAccount: vi.fn(),
  deleteOwnAccount: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@context/AuthContext", () => ({
  useAuth: () => ({ setUser: mocks.setUser }),
}));

vi.mock("@services/auth.service", () => ({ logout: mocks.logout }));

vi.mock("@services/user.service", () => ({
  getProfile: mocks.getProfile,
  updateProfile: mocks.updateProfile,
  deactivateOwnAccount: mocks.deactivateOwnAccount,
  deleteOwnAccount: mocks.deleteOwnAccount,
}));

vi.mock("@hooks/useUserContactCatalog", () => ({
  default: () => ({
    catalog: {
      countries: [{ code: "CL", name: "Chile", callingCode: "+56" }],
      chileRegions: [],
    },
    loading: false,
    error: "",
    retry: vi.fn(),
  }),
}));

vi.mock("@components/ThemeToggle", () => ({
  default: () => <button type="button">Cambiar tema</button>,
}));

const profile = {
  userId: 7,
  name: "María Pérez",
  email: "maria@example.com",
  phone: null,
  countryCode: null,
  regionCode: null,
  communeCode: null,
  addressLine: null,
  role: "CLIENT",
  createdAt: "2026-09-06T16:00:00.000Z",
};

describe("Profile page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProfile.mockResolvedValue({ success: true, data: profile });
    mocks.deactivateOwnAccount.mockResolvedValue({ success: true });
    mocks.deleteOwnAccount.mockResolvedValue({ success: true });
  });

  it("shows account information and the danger section as a page", async () => {
    render(<Profile />);

    expect(
      await screen.findByRole("heading", { name: "Mi perfil" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Tu cuenta fue creada el/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Peligro" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Desactivar mi cuenta" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Eliminar mi cuenta" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cerrar sesión" }),
    ).toBeInTheDocument();
    const dangerRows = within(
      screen.getByRole("list", { name: "Acciones peligrosas" }),
    ).getAllByRole("listitem");
    expect(dangerRows).toHaveLength(2);
    expect(dangerRows[0]).not.toHaveClass("border", "bg-surface");
    expect(dangerRows[1]).not.toHaveClass("border", "bg-surface");
  });

  it("confirms self-deactivation and ends the local session", async () => {
    render(<Profile />);
    await screen.findByRole("heading", { name: "Mi perfil" });

    fireEvent.click(
      screen.getByRole("button", { name: "Desactivar mi cuenta" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Desactivar cuenta" }));

    await waitFor(() =>
      expect(mocks.deactivateOwnAccount).toHaveBeenCalledOnce(),
    );
    expect(mocks.setUser).toHaveBeenCalledWith(null);
  });
});
