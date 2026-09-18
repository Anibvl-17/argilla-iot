import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminControllers from "./AdminControllers";
import AdminKilns from "./AdminKilns";

const { authState, mocks } = vi.hoisted(() => ({
  authState: { user: { id: 2, name: "Técnico", role: "TECHNICIAN" } },
  mocks: {
    getAllKilns: vi.fn(),
    getAllControllers: vi.fn(),
    getAllUsers: vi.fn(),
    linkController: vi.fn(),
  },
}));

vi.mock("@context/AuthContext", () => ({ useAuth: () => authState }));
vi.mock("@hooks/useControllerRealtime", () => ({
  useControllerRealtime: vi.fn(),
}));
vi.mock("@services/user.service", () => ({ getAllUsers: mocks.getAllUsers }));
vi.mock("@services/kiln.service", () => ({
  createKiln: vi.fn(),
  deleteKiln: vi.fn(),
  getAllKilns: mocks.getAllKilns,
  linkController: mocks.linkController,
  linkUser: vi.fn(),
  unlinkController: vi.fn(),
  unlinkUser: vi.fn(),
  updateKiln: vi.fn(),
}));
vi.mock("@services/controller.service", () => ({
  createController: vi.fn(),
  deleteController: vi.fn(),
  getAllControllers: mocks.getAllControllers,
  sendAdminControllerCommand: vi.fn(),
  updateController: vi.fn(),
}));

const circuit = {
  type: "ROOT",
  connectionType: "SERIES",
  elements: [
    {
      type: "CHANNEL",
      name: "Resistencia",
      resistanceOhms: 10,
      lengthMeters: 1,
    },
  ],
};

describe("technician equipment management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = { id: 2, name: "Técnico", role: "TECHNICIAN" };
    mocks.getAllUsers.mockResolvedValue({
      success: true,
      data: { items: [] },
    });
    mocks.getAllKilns.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            kilnId: 1,
            userId: 10,
            user: { userId: 10, name: "Cliente" },
            controller: null,
            name: "Horno con cliente",
            liters: 100,
            phaseCount: 1,
            nominalVoltage: 220,
            nominalCurrent: 20,
            manufacturedAt: "2026-01-01T00:00:00.000Z",
            deliveredAt: null,
            manufacturer: "Argillá",
            operationalStatus: "OPERATIONAL",
            heatingCircuitConfiguration: circuit,
          },
          {
            kilnId: 2,
            userId: null,
            user: null,
            controller: null,
            name: "Horno disponible",
            liters: 80,
            phaseCount: 3,
            nominalVoltage: 380,
            nominalCurrent: 20,
            manufacturedAt: "2026-01-01T00:00:00.000Z",
            deliveredAt: null,
            manufacturer: "Argillá",
            operationalStatus: "OPERATIONAL",
            heatingCircuitConfiguration: circuit,
          },
          {
            kilnId: 3,
            userId: 10,
            user: { userId: 10, name: "Cliente" },
            controller: null,
            name: "Horno fuera de servicio",
            liters: 60,
            phaseCount: 1,
            nominalVoltage: 220,
            nominalCurrent: 15,
            manufacturedAt: "2026-01-01T00:00:00.000Z",
            deliveredAt: null,
            manufacturer: "Argillá",
            operationalStatus: "OUT_OF_SERVICE",
            heatingCircuitConfiguration: circuit,
          },
        ],
        pagination: { page: 1, totalPages: 1, total: 3 },
        summary: { total: 3, withoutController: 3, withoutOwner: 1 },
      },
    });
    mocks.getAllControllers.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            controllerId: "11111111-1111-4111-8111-111111abcdef",
            controllerCode: "abcdef",
            user: null,
            kiln: null,
            operationalStatus: "OPERATIONAL",
            switchType: "CONTACTOR",
            switchCurrentCapacity: 25,
          },
          {
            controllerId: "22222222-2222-4222-8222-222222dead00",
            controllerCode: "dead00",
            user: null,
            kiln: null,
            operationalStatus: "OUT_OF_SERVICE",
            switchType: "SSR",
            switchCurrentCapacity: 40,
          },
        ],
        pagination: { page: 1, totalPages: 1, total: 2 },
        summary: { total: 2, linkedToKiln: 0, linkedToUser: 0 },
      },
    });
    mocks.linkController.mockResolvedValue({ success: true, data: {} });
  });

  it("lets technicians create, link, and edit only unowned kilns without history access", async () => {
    render(
      <MemoryRouter>
        <AdminKilns />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("button", { name: /crear horno/i }),
    ).toBeInTheDocument();
    await waitFor(() => expect(mocks.getAllKilns).toHaveBeenCalled());
    expect(screen.getAllByTitle("Editar horno")).toHaveLength(1);
    fireEvent.click(screen.getAllByTitle("Ver detalles")[0]);
    expect(
      screen.queryByRole("link", { name: /ver historial/i }),
    ).not.toBeInTheDocument();
    const controllerSearch = screen.getByRole("button", {
      name: "Asociar controlador",
    });
    fireEvent.click(controllerSearch);
    expect(
      await screen.findByText(
        "Busca un controlador por sus últimos 6 dígitos o cliente, si está disponible.",
      ),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("listbox", { name: "Controladores disponibles" }),
      ).queryByRole("option"),
    ).not.toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("searchbox", {
        name: "Buscar por ID o cliente",
      }),
      { target: { value: "dead00" } },
    );
    expect(
      await screen.findByText(
        "No encontramos controladores disponibles para esa búsqueda.",
      ),
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("searchbox", {
        name: "Buscar por ID o cliente",
      }),
      { target: { value: "abcdef" } },
    );
    fireEvent.click(
      await screen.findByRole("option", {
        name: /\.\.\.abcdef - Sin propietario.*Contactor 25 A.*Operativo/i,
      }),
    );
    await waitFor(() =>
      expect(mocks.linkController).toHaveBeenCalledWith(
        1,
        "11111111-1111-4111-8111-111111abcdef",
      ),
    );
    expect(screen.queryByText("Nombre")).not.toBeInTheDocument();
    expect(screen.queryByText("Actividad")).not.toBeInTheDocument();
  });

  it("lets technicians manage eligible controllers with limited columns and a link modal", async () => {
    mocks.getAllControllers.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            controllerId: "11111111-1111-4111-8111-111111abcdef",
            controllerCode: "abcdef",
            user: null,
            kiln: null,
            operationalStatus: "OPERATIONAL",
            switchType: "CONTACTOR",
            switchCurrentCapacity: 20,
          },
          {
            controllerId: "22222222-2222-4222-8222-222222fedcba",
            controllerCode: "fedcba",
            user: { userId: 10, name: "Cliente" },
            kiln: { kilnId: 1 },
            operationalStatus: "MAINTENANCE",
            switchType: "SSR",
            switchCurrentCapacity: 40,
          },
        ],
        pagination: { page: 1, totalPages: 1, total: 2 },
        summary: { total: 2, linkedToKiln: 1, linkedToUser: 1 },
      },
    });
    render(
      <MemoryRouter>
        <AdminControllers />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("button", { name: /crear controlador/i }),
    ).toBeInTheDocument();
    await waitFor(() => expect(mocks.getAllControllers).toHaveBeenCalled());
    expect(screen.getByTitle("Asociar horno")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Propietario" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "ID Horno" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Propietario / Horno" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByTitle("Editar controlador").length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText("Temperatura")).not.toBeInTheDocument();
    expect(screen.queryByText("Actividad")).not.toBeInTheDocument();
    expect(screen.queryByText("Firmware")).not.toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Switch" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Contactor 20 A")).toBeInTheDocument();
    expect(screen.getByText("SSR 40 A")).toBeInTheDocument();
    expect(screen.getByText("Sin acciones disponibles")).toHaveClass(
      "italic",
      "text-muted",
    );

    fireEvent.click(screen.getByTitle("Asociar horno"));
    expect(
      await screen.findByRole("heading", {
        name: "Asociar horno",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Busca un horno por su identificador o cliente, si está disponible.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/11111111-1111-4111-8111-111111abcdef/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancelar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirmar vinculación" }),
    ).toBeDisabled();
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Horno disponible",
        expanded: false,
      }),
    );
    expect(
      await screen.findByText(
        "Escribe un identificador o nombre de cliente para buscar hornos.",
      ),
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Buscar por ID o cliente" }),
      { target: { value: "3" } },
    );
    expect(
      await screen.findByText(
        "No encontramos hornos disponibles para esa búsqueda.",
      ),
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Buscar por ID o cliente" }),
      { target: { value: "Cliente" } },
    );
    expect(
      await screen.findByRole("option", {
        name: /Horno #1 - Cliente.*100 litros.*Operativo/i,
      }),
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Buscar por ID o cliente" }),
      { target: { value: "2" } },
    );
    fireEvent.click(
      await screen.findByRole("option", {
        name: /Horno #2 - Sin propietario.*80 litros.*Trifásico.*Operativo/i,
      }),
    );
    expect(mocks.linkController).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar vinculación" }),
    );
    await waitFor(() =>
      expect(mocks.linkController).toHaveBeenCalledWith(
        2,
        "11111111-1111-4111-8111-111111abcdef",
      ),
    );
  });
});
