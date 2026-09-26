import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import KilnDetails from "@pages/KilnDetails";

const mocks = vi.hoisted(() => ({
  getMyKiln: vi.fn(),
  getCycleTelemetry: vi.fn(),
  getFiringContext: vi.fn(),
  getFiringCycles: vi.fn(),
  getPrograms: vi.fn(),
}));

vi.mock("@services/kiln.service", () => ({ getMyKiln: mocks.getMyKiln }));
vi.mock("@services/firing.service", () => ({
  getCycleTelemetry: mocks.getCycleTelemetry,
  getFiringContext: mocks.getFiringContext,
  getFiringCycles: mocks.getFiringCycles,
  getPrograms: mocks.getPrograms,
  selectFiringProgram: vi.fn(),
  startProgram: vi.fn(),
  commandFiringCycle: vi.fn(),
}));
vi.mock("@hooks/useControllerRealtime", () => ({
  useControllerRealtime: vi.fn(),
}));
vi.mock("@hooks/useFiringRealtime", () => ({ useFiringRealtime: vi.fn() }));
vi.mock("@components/TelemetryChart", () => ({
  default: () => (
    <div
      role="img"
      aria-label="Temperatura real y setpoint del ciclo a través del tiempo"
    />
  ),
}));

const program = {
  programId: 1,
  name: "Bizcocho",
  description: "Quema inicial",
  configuration: {
    schemaVersion: 1,
    initialTemperature: 20,
    stages: [{ durationMinutes: 30, targetTemperature: 100 }],
  },
};

const cycle = {
  firingCycleId: 44,
  controllerCycleId: "controller-cycle-44",
  startedAt: "2026-09-20T12:00:00.000Z",
  endedAt: "2026-09-20T13:30:00.000Z",
  status: "COMPLETED",
  program,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/kilns/7"]}>
      <Routes>
        <Route path="/kilns/:kilnId" element={<KilnDetails />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("KilnDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMyKiln.mockResolvedValue({
      success: true,
      data: {
        kilnId: 7,
        name: "Horno gres",
        liters: 100,
        nominalCurrent: 20,
        nominalVoltage: 220,
        phaseCount: 1,
        operationalStatus: "OPERATIONAL",
        manufacturer: "Argillá",
        manufacturedAt: "2025-01-15T00:00:00.000Z",
        deliveredAt: "2025-02-20T00:00:00.000Z",
        heatingCircuitConfiguration: {
          type: "ROOT",
          connectionType: "PARALLEL",
          elements: [
            {
              type: "GROUP",
              name: "Zona superior",
              connectionType: "SERIES",
              elements: [
                {
                  type: "CHANNEL",
                  name: "Canal superior",
                  resistanceOhms: 18.5,
                  lengthMeters: 6.2,
                },
              ],
            },
            {
              type: "CHANNEL",
              name: "Canal inferior",
              resistanceOhms: 20,
              lengthMeters: 5.8,
            },
          ],
        },
        firingCycleCount: 1,
        selectedProgramId: 1,
        selectedProgram: program,
        activeFiringCycle: null,
        controller: {
          controllerCode: "abcdef",
          connectionStatus: "ONLINE",
          activityStatus: "IDLE",
          operationalStatus: "OPERATIONAL",
          temperature: 25,
          switchType: "CONTACTOR",
          switchCurrentCapacity: 20,
          firmwareVersion: "2.4.0",
          firmwareUpdatedAt: "2026-08-01T00:00:00.000Z",
          manufacturedAt: "2025-01-10T00:00:00.000Z",
          deliveredAt: "2025-02-10T00:00:00.000Z",
        },
      },
    });
    mocks.getFiringContext.mockResolvedValue({
      success: true,
      data: { reconciliation: { ready: true, reason: null } },
    });
    mocks.getPrograms.mockResolvedValue({ success: true, data: [program] });
    mocks.getFiringCycles.mockResolvedValue({
      success: true,
      data: {
        items: [cycle],
        pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
      },
    });
    mocks.getCycleTelemetry.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            telemetryId: 1,
            timestamp: "2026-09-20T12:30:15.000Z",
            temperature: 300,
            setpointTemperature: 320,
            stageIndex: 1,
            switchState: true,
          },
        ],
        pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
      },
    });
  });

  it("places compact firing controls before kiln information", async () => {
    renderPage();
    const controls = await screen.findByRole("heading", {
      name: "Programa y control de quema",
    });
    const information = screen.getByRole("heading", {
      name: "Información del horno",
    });
    expect(
      controls.compareDocumentPosition(information) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const startButton = screen.getByRole("button", { name: "Iniciar quema" });
    expect(startButton).toHaveClass("w-fit");
    expect(startButton).not.toHaveClass("flex-1");
    expect(screen.getByText("Quemas realizadas")).toBeInTheDocument();
  });

  it("combines kiln and controller information and opens a read-only circuit", async () => {
    renderPage();

    const heading = await screen.findByRole("heading", {
      name: "Información del horno",
    });
    const equipment = heading.closest("section");

    expect(
      within(equipment).getByRole("heading", {
        name: "Información del horno",
      }),
    ).toBeInTheDocument();
    expect(
      within(equipment).getByRole("heading", {
        name: "Información del controlador",
      }),
    ).toBeInTheDocument();
    const electricalLabel = within(equipment).getByText("Datos eléctricos");
    const electricalValue = within(equipment).getByText("220 V - 20 A");
    const electricalPhase = within(equipment).getByText("Monofásico");
    const circuitValue = within(equipment).getByText("2 grupos, 2 canales");
    const circuitButton = within(equipment).getByRole("button", {
      name: "Ver circuito",
    });

    expect(
      electricalLabel.compareDocumentPosition(electricalValue) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      electricalValue.compareDocumentPosition(electricalPhase) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      circuitValue.compareDocumentPosition(circuitButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const equipmentDetailLists = equipment.querySelectorAll("dl");
    expect(equipmentDetailLists).toHaveLength(2);
    equipmentDetailLists.forEach((list) => {
      expect(list).toHaveClass("grid-cols-2");
      expect(list).not.toHaveClass("sm:grid-cols-3", "xl:grid-cols-3");
    });

    expect(within(equipment).getByText("Contactor 20 A")).toBeInTheDocument();
    expect(within(equipment).getByText("2.4.0")).toBeInTheDocument();
    expect(
      within(equipment).queryByText("Tipo de switch"),
    ).not.toBeInTheDocument();
    expect(
      within(equipment).queryByText("Amperaje soportado"),
    ).not.toBeInTheDocument();

    fireEvent.click(circuitButton);

    const modal = screen.getByRole("dialog", { name: "Circuito del horno" });
    expect(
      within(modal).getByText("Vista de solo lectura"),
    ).toBeInTheDocument();
    expect(within(modal).getByText("Circuito raíz")).toBeInTheDocument();
    expect(within(modal).getByText("Zona superior")).toBeInTheDocument();
    expect(within(modal).getByText("Canal superior")).toBeInTheDocument();
    expect(within(modal).queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows cycle duration and opens paginated telemetry in a detail modal", async () => {
    renderPage();
    expect(
      await screen.findByRole("columnheader", { name: "Duración" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 h 30 min")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Acciones" }),
    ).toBeInTheDocument();

    const detailButton = screen.getByRole("button", {
      name: "Ver detalle del ciclo 44",
    });
    expect(within(detailButton).getByText("Ver detalle")).toHaveClass(
      "hidden",
      "md:inline",
    );
    fireEvent.click(detailButton);
    await waitFor(() =>
      expect(mocks.getCycleTelemetry).toHaveBeenCalledWith("7", 44, 1, 10),
    );
    expect(mocks.getCycleTelemetry).toHaveBeenCalledWith("7", 44, 1, 100);

    const modal = screen.getByRole("dialog", { name: "Detalle del ciclo" });
    expect(within(modal).getByText("Bizcocho")).toBeInTheDocument();
    expect(within(modal).getByText("Completada")).toBeInTheDocument();
    expect(
      within(modal).getByRole("columnheader", { name: "Etapa" }),
    ).toBeInTheDocument();
    expect(
      within(modal).getByRole("columnheader", { name: "Hora" }),
    ).toBeInTheDocument();
    expect(
      within(modal).getByRole("columnheader", { name: "Switch" }),
    ).toBeInTheDocument();
    expect(
      within(modal).queryByRole("columnheader", { name: "Tipo" }),
    ).not.toBeInTheDocument();
    expect(within(modal).getByText("Activo")).toBeInTheDocument();
    expect(
      within(modal).getByRole("img", {
        name: "Temperatura real y setpoint del ciclo a través del tiempo",
      }),
    ).toBeInTheDocument();
    expect(within(modal).getByText("Inicio").parentElement).not.toHaveClass(
      "rounded-xl",
    );
  });
});
