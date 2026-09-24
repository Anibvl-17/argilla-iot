import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminControllers from "@pages/AdminControllers";
import AdminKilns from "@pages/AdminKilns";

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
      await screen.findByRole("heading", { name: "Asociar controlador" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Busca un controlador por sus últimos 6 dígitos o cliente, si está disponible.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Horno seleccionado:")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirmar vinculación" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Controlador disponible",
        expanded: false,
      }),
    );
    expect(
      await screen.findByText(
        "Escribe los últimos 6 dígitos o el nombre del cliente para buscar controladores.",
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
    expect(mocks.linkController).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar vinculación" }),
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

  it("shows the safe controller information available to technicians from the kiln list", async () => {
    mocks.getAllKilns.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            kilnId: 8,
            user: { userId: 10, name: "Cliente" },
            liters: 100,
            phaseCount: 1,
            nominalVoltage: 220,
            nominalCurrent: 30,
            operationalStatus: "OPERATIONAL",
            manufacturer: "Argillá",
            manufacturedAt: "2025-01-15T00:00:00.000Z",
            deliveredAt: null,
            heatingCircuitConfiguration: circuit,
            controller: {
              controllerId: "44444444-4444-4444-8444-444444654321",
              controllerCode: "654321",
              switchType: "SSR",
              switchCurrentCapacity: 40,
              operationalStatus: "MAINTENANCE",
              firmwareVersion: "2.3.0",
              manufacturedAt: "2025-02-03T00:00:00.000Z",
              deliveredAt: "2025-02-10T00:00:00.000Z",
              firmwareUpdatedAt: "2026-08-01T00:00:00.000Z",
            },
          },
        ],
        pagination: { page: 1, totalPages: 1, total: 1 },
        summary: { total: 1, withoutController: 0, withoutOwner: 0 },
      },
    });

    render(
      <MemoryRouter>
        <AdminKilns />
      </MemoryRouter>,
    );

    fireEvent.click(
      (await screen.findAllByTitle("Ver información del controlador"))[0],
    );
    const heading = await screen.findByRole("heading", {
      name: "Información del controlador",
    });
    const modal = heading.closest("div.fixed");
    expect(within(modal).getByText("654321")).toBeInTheDocument();
    expect(within(modal).getByText("SSR 40 A")).toBeInTheDocument();
    expect(within(modal).getByText("En mantención")).toBeInTheDocument();
    expect(within(modal).getByText("2.3.0")).toBeInTheDocument();
    expect(
      within(modal).getByText(
        new Date("2025-02-03T00:00:00.000Z").toLocaleDateString("es-CL"),
      ),
    ).toBeInTheDocument();
    expect(
      within(modal).getByText(
        new Date("2025-02-10T00:00:00.000Z").toLocaleDateString("es-CL"),
      ),
    ).toBeInTheDocument();
    expect(
      within(modal).getByText(
        new Date("2026-08-01T00:00:00.000Z").toLocaleDateString("es-CL"),
      ),
    ).toBeInTheDocument();
    expect(modal).not.toHaveTextContent("undefined");
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
            kiln: {
              kilnId: 1,
              liters: 100,
              phaseCount: 1,
              nominalVoltage: 220,
              nominalCurrent: 20,
              operationalStatus: "OPERATIONAL",
              manufacturer: "Argillá",
              manufacturedAt: "2026-01-01T00:00:00.000Z",
              deliveredAt: null,
              heatingCircuitConfiguration: circuit,
              firingCycleCount: 3,
            },
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
      screen.getByRole("columnheader", { name: "Propietario / Horno" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Propietario" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "ID Horno" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByTitle("Editar controlador").length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText("Temperatura")).not.toBeInTheDocument();
    expect(screen.queryByText("Actividad")).not.toBeInTheDocument();
    expect(screen.queryByText("Firmware")).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Switch" })).toHaveClass(
      "hidden",
      "lg:table-cell",
    );
    expect(screen.getByRole("columnheader", { name: "Estado" })).toHaveClass(
      "hidden",
      "lg:table-cell",
    );
    expect(screen.getByText("Contactor 20 A")).toBeInTheDocument();
    expect(screen.getByText("SSR 40 A")).toBeInTheDocument();
    expect(screen.getByText("Horno #1")).toBeInTheDocument();
    const ownedControllerRow = screen
      .getByRole("button", { name: "...fedcba" })
      .closest("tr");
    expect(
      within(ownedControllerRow).getByText("Horno #1"),
    ).toBeInTheDocument();
    expect(within(ownedControllerRow).getByText("-")).toHaveClass(
      "italic",
      "text-muted",
    );

    fireEvent.click(within(ownedControllerRow).getByText("Horno #1"));
    const kilnInformationHeading = await screen.findByRole("heading", {
      name: "Información del horno",
    });
    const kilnInformationModal = kilnInformationHeading.closest("div.fixed");
    expect(
      within(kilnInformationModal).getByText("100 litros"),
    ).toBeInTheDocument();
    expect(
      within(kilnInformationModal).getByText("220 V - 20 A"),
    ).toBeInTheDocument();
    expect(
      within(kilnInformationModal).getByText("Monofásico"),
    ).toBeInTheDocument();
    expect(
      within(kilnInformationModal).getByText("Operativo"),
    ).toBeInTheDocument();
    expect(
      within(kilnInformationModal).getByText("1 grupo, 1 canal"),
    ).toBeInTheDocument();
    expect(
      within(kilnInformationModal).getByText("Argillá"),
    ).toBeInTheDocument();
    expect(
      within(kilnInformationModal).getByText("SSR 40 A"),
    ).toBeInTheDocument();
    expect(kilnInformationModal).not.toHaveTextContent("undefined");
    fireEvent.click(
      within(kilnInformationModal).getByRole("button", { name: "Cerrar" }),
    );

    const availableControllerRow = screen
      .getByRole("button", { name: "...abcdef" })
      .closest("tr");
    fireEvent.click(within(availableControllerRow).getByTitle("Ver detalles"));
    expect(
      within(availableControllerRow.nextElementSibling).getByText(
        "Contactor 20 A",
      ),
    ).toBeInTheDocument();

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
      screen.getByText("Controlador seleccionado:").closest("p"),
    ).toHaveTextContent("abcdef");
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

  it("uses the responsive admin controller detail and association modal", async () => {
    authState.user = { id: 1, name: "Administradora", role: "ADMIN" };
    mocks.getAllControllers.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            controllerId: "33333333-3333-4333-8333-333333333333",
            controllerCode: "333333",
            user: { userId: 10, name: "Cliente" },
            kiln: null,
            operationalStatus: "OPERATIONAL",
            connectionStatus: "ONLINE",
            activityStatus: "IDLE",
            temperature: 581.1,
            switchType: "SSR",
            switchCurrentCapacity: 30,
            firmwareVersion: "DEMO-1.0.0",
            manufacturedAt: "2025-01-15T00:00:00.000Z",
            deliveredAt: null,
            firmwareUpdatedAt: null,
          },
        ],
        pagination: { page: 1, totalPages: 1, total: 1 },
        summary: { total: 1, linkedToKiln: 0, linkedToUser: 1 },
      },
    });

    render(
      <MemoryRouter>
        <AdminControllers />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("columnheader", { name: "Switch" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Propietario / Horno" }),
    ).not.toHaveClass("hidden");
    expect(screen.getByRole("columnheader", { name: "Conexión" })).toHaveClass(
      "hidden",
      "md:table-cell",
    );
    expect(
      screen.queryByRole("columnheader", { name: "Temperatura" }),
    ).not.toBeInTheDocument();

    const controllerRow = (
      await screen.findByRole("button", { name: "...333333" })
    ).closest("tr");
    expect(within(controllerRow).getByText("SSR 30 A")).toBeInTheDocument();

    const associationButton = within(controllerRow).getByTitle("Asociar horno");
    expect(associationButton).toHaveClass("hidden", "lg:block");
    fireEvent.click(associationButton);
    expect(
      await screen.findByRole("heading", { name: "Asociar horno" }),
    ).toBeInTheDocument();
    expect(controllerRow.nextElementSibling).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    fireEvent.click(within(controllerRow).getByTitle("Ver detalles"));
    const detailRow = controllerRow.nextElementSibling;
    expect(within(detailRow).getByText("Temperatura")).toBeInTheDocument();
    expect(within(detailRow).getByText("581.1 °C")).toBeInTheDocument();
    expect(within(detailRow).queryByText("Switch")).not.toBeInTheDocument();
    expect(within(detailRow).getByText("Actividad").parentElement).toHaveClass(
      "lg:hidden",
    );
    expect(
      within(detailRow).getByText("Asociar horno").closest("div.mt-5"),
    ).toHaveClass("lg:hidden");
  });

  it("shows controller information from the kiln list", async () => {
    authState.user = { id: 1, name: "Administradora", role: "ADMIN" };
    mocks.getAllKilns.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            kilnId: 8,
            name: "Horno modal",
            user: { userId: 10, name: "Cliente" },
            liters: 100,
            phaseCount: 1,
            nominalVoltage: 220,
            nominalCurrent: 30,
            operationalStatus: "OPERATIONAL",
            manufacturer: "Argillá",
            manufacturedAt: "2025-01-15T00:00:00.000Z",
            deliveredAt: null,
            heatingCircuitConfiguration: circuit,
            controller: {
              controllerId: "44444444-4444-4444-8444-444444654321",
              controllerCode: "654321",
              switchType: "SSR",
              switchCurrentCapacity: 40,
              connectionStatus: "ONLINE",
              operationalStatus: "MAINTENANCE",
              activityStatus: "IDLE",
              temperature: 512.4,
              firmwareVersion: "2.3.0",
              manufacturedAt: "2025-02-03T00:00:00.000Z",
              deliveredAt: "2025-02-10T00:00:00.000Z",
              firmwareUpdatedAt: "2026-08-01T00:00:00.000Z",
            },
          },
        ],
        pagination: { page: 1, totalPages: 1, total: 1 },
        summary: { total: 1, withoutController: 0, withoutOwner: 0 },
      },
    });
    mocks.getAllControllers.mockResolvedValue({
      success: true,
      data: { items: [], pagination: { totalPages: 1 }, summary: {} },
    });

    render(
      <MemoryRouter>
        <AdminKilns />
      </MemoryRouter>,
    );

    const controllerLink = (
      await screen.findAllByTitle("Ver información del controlador")
    )[0];
    expect(controllerLink).toHaveClass("text-accent");
    fireEvent.click(controllerLink);

    const heading = await screen.findByRole("heading", {
      name: "Información del controlador",
    });
    const modal = heading.closest("div.fixed");
    expect(within(modal).getByText("ID")).toBeInTheDocument();
    expect(within(modal).getByText("654321")).toBeInTheDocument();
    expect(within(modal).getByText("SSR 40 A")).toBeInTheDocument();
    expect(within(modal).getByText("En mantención")).toBeInTheDocument();
    expect(within(modal).getByText("2.3.0")).toBeInTheDocument();
    expect(
      within(modal).getByText(
        new Date("2025-02-03T00:00:00.000Z").toLocaleDateString("es-CL"),
      ),
    ).toBeInTheDocument();
    expect(
      within(modal).getByText(
        new Date("2025-02-10T00:00:00.000Z").toLocaleDateString("es-CL"),
      ),
    ).toBeInTheDocument();
    expect(
      within(modal).getByText(
        new Date("2026-08-01T00:00:00.000Z").toLocaleDateString("es-CL"),
      ),
    ).toBeInTheDocument();
    expect(modal).not.toHaveTextContent("undefined");
    expect(
      within(modal).getByRole("button", { name: "Cerrar" }),
    ).toBeInTheDocument();
    expect(
      within(modal).queryByRole("button", { name: "Guardar" }),
    ).not.toBeInTheDocument();
  });

  it("shows kiln information from the controller list without duplicating status on desktop", async () => {
    authState.user = { id: 1, name: "Administradora", role: "ADMIN" };
    mocks.getAllControllers.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            controllerId: "55555555-5555-4555-8555-555555555555",
            controllerCode: "555555",
            user: { userId: 10, name: "Cliente" },
            kiln: {
              kilnId: 9,
              name: "Horno nueve",
              liters: 120,
              phaseCount: 3,
              nominalVoltage: 380,
              nominalCurrent: 30,
              operationalStatus: "OPERATIONAL",
              manufacturer: "Argillá",
              manufacturedAt: "2025-03-01T00:00:00.000Z",
              deliveredAt: null,
              heatingCircuitConfiguration: circuit,
              firingCycleCount: 6,
            },
            operationalStatus: "OPERATIONAL",
            connectionStatus: "ONLINE",
            activityStatus: "FIRING",
            temperature: 700,
            switchType: "CONTACTOR",
            switchCurrentCapacity: 40,
            firmwareVersion: "2.0.0",
            manufacturedAt: "2025-01-01T00:00:00.000Z",
            deliveredAt: null,
            firmwareUpdatedAt: null,
          },
        ],
        pagination: { page: 1, totalPages: 1, total: 1 },
        summary: { total: 1, linkedToKiln: 1, linkedToUser: 1 },
      },
    });

    render(
      <MemoryRouter>
        <AdminControllers />
      </MemoryRouter>,
    );

    const kilnLink = await screen.findByTitle("Ver información del horno");
    expect(kilnLink).toHaveClass("text-accent");
    fireEvent.click(kilnLink);

    const heading = await screen.findByRole("heading", {
      name: "Información del horno",
    });
    const modal = heading.closest("div.fixed");
    expect(within(modal).getByText("120 litros")).toBeInTheDocument();
    expect(within(modal).getByText("380 V - 30 A")).toBeInTheDocument();
    expect(within(modal).getByText("Trifásico")).toBeInTheDocument();
    expect(within(modal).getByText("1 grupo, 1 canal")).toBeInTheDocument();
    expect(within(modal).getByText("Contactor 40 A")).toBeInTheDocument();
    expect(within(modal).getByText("Quemas realizadas")).toBeInTheDocument();
    expect(within(modal).getByText("6")).toBeInTheDocument();
    fireEvent.click(within(modal).getByRole("button", { name: "Cerrar" }));

    const controllerRow = screen
      .getByRole("button", { name: "...555555" })
      .closest("tr");
    expect(screen.getByRole("columnheader", { name: "Estado" })).toHaveClass(
      "lg:table-cell",
    );
    fireEvent.click(within(controllerRow).getByTitle("Ver detalles"));
    const detailRow = controllerRow.nextElementSibling;
    expect(
      within(detailRow).getByText("Estado operacional").parentElement,
    ).toHaveClass("lg:hidden");
  });
});
