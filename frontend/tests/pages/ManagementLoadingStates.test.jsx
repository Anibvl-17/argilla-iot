import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AdminControllers from "@pages/AdminControllers";
import AdminKilns from "@pages/AdminKilns";
import AdminUsers from "@pages/AdminUsers";

const pending = new Promise(() => {});

vi.mock("@context/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1, name: "Admin", role: "ADMIN" } }),
}));
vi.mock("@hooks/useControllerRealtime", () => ({
  useControllerRealtime: vi.fn(),
}));
vi.mock("@hooks/useUserContactCatalog", () => ({
  default: () => ({
    catalog: { countries: [], regions: [], communes: [] },
    loading: false,
    error: null,
    retry: vi.fn(),
  }),
}));
vi.mock("@services/user.service", () => ({
  getAllUsers: vi.fn(() => pending),
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  updateUser: vi.fn(),
  updateUserStatus: vi.fn(),
}));
vi.mock("@services/kiln.service", () => ({
  getAllKilns: vi.fn(() => pending),
  createKiln: vi.fn(),
  deleteKiln: vi.fn(),
  linkController: vi.fn(),
  linkUser: vi.fn(),
  unlinkController: vi.fn(),
  unlinkUser: vi.fn(),
  updateKiln: vi.fn(),
  updateKilnOperationalStatus: vi.fn(),
}));
vi.mock("@services/controller.service", () => ({
  getAllControllers: vi.fn(() => pending),
  createController: vi.fn(),
  deleteController: vi.fn(),
  updateController: vi.fn(),
  updateControllerOperationalStatus: vi.fn(),
}));

describe("management loading states", () => {
  it("shows loading states for the kiln list and summary indicators", () => {
    render(
      <MemoryRouter>
        <AdminKilns />
      </MemoryRouter>,
    );

    expect(screen.getByText("Cargando hornos...")).toBeInTheDocument();
    expect(screen.getAllByText("Cargando...")).toHaveLength(3);
  });

  it("shows loading states for the controller list and summary indicators", () => {
    render(
      <MemoryRouter>
        <AdminControllers />
      </MemoryRouter>,
    );

    expect(screen.getByText("Cargando controladores...")).toBeInTheDocument();
    expect(screen.getAllByText("Cargando...")).toHaveLength(3);
  });

  it("shows loading states for the user list and upper indicator", () => {
    render(
      <MemoryRouter>
        <AdminUsers />
      </MemoryRouter>,
    );

    expect(screen.getAllByText("Cargando usuarios...")).toHaveLength(2);
  });
});
