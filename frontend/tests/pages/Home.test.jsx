import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@pages/Home";

const mocks = vi.hoisted(() => ({
  getMyKilns: vi.fn(),
  getFiringContext: vi.fn(),
  getPrograms: vi.fn(),
}));

vi.mock("@context/AuthContext", () => ({
  useAuth: () => ({ user: { role: "CLIENT" } }),
}));
vi.mock("@services/kiln.service", () => ({ getMyKilns: mocks.getMyKilns }));
vi.mock("@services/firing.service", () => ({
  getFiringContext: mocks.getFiringContext,
  getPrograms: mocks.getPrograms,
  selectFiringProgram: vi.fn(),
  startProgram: vi.fn(),
  commandFiringCycle: vi.fn(),
}));
vi.mock("@services/controller.service", () => ({ pairController: vi.fn() }));
vi.mock("@hooks/useControllerRealtime", () => ({
  useControllerRealtime: vi.fn(),
}));
vi.mock("@hooks/useFiringRealtime", () => ({ useFiringRealtime: vi.fn() }));

describe("Home kiln cards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFiringContext.mockResolvedValue({
      success: true,
      data: { reconciliation: { ready: true, reason: null } },
    });
    mocks.getPrograms.mockResolvedValue({
      success: true,
      data: [
        {
          programId: 1,
          name: "Bizcocho",
          configuration: {
            stages: [
              { durationMinutes: 30, targetTemperature: 100 },
              { durationMinutes: 90, targetTemperature: 950 },
            ],
          },
        },
      ],
    });
    mocks.getMyKilns.mockResolvedValue({
      success: true,
      data: {
        unlinkedControllers: [],
        kilns: [
          {
            kilnId: 7,
            name: "Horno de prueba",
            liters: 50,
            nominalVoltage: 220,
            nominalCurrent: 20,
            selectedProgramId: 1,
            activeFiringCycle: null,
            controller: {
              controllerCode: "abcdef",
              connectionStatus: "ONLINE",
              activityStatus: "IDLE",
              temperature: 958,
            },
          },
        ],
      },
    });
  });

  it("uses the controller-inspired hierarchy without showing a clock", async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Horno de prueba")).toBeInTheDocument();
    expect(screen.getByText("Conectado")).toBeInTheDocument();
    expect(screen.getByText("Detenido")).toBeInTheDocument();
    expect(screen.getByText("Programa: Bizcocho")).toBeInTheDocument();
    expect(screen.getByText("958.0 °C")).toBeInTheDocument();
    expect(screen.getByText("Temperatura actual")).toBeInTheDocument();
    expect(screen.getByText("220 V - 20 A")).toBeInTheDocument();
    expect(screen.getByText("950 °C")).toBeInTheDocument();
    expect(screen.getByText("2 h")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();

    const programSelect = screen.getByRole("combobox", {
      name: "Programa de quema",
    });
    const actionRow = programSelect.parentElement;
    expect(actionRow).toContainElement(
      screen.getByRole("button", { name: "Iniciar quema" }),
    );
    expect(actionRow).toContainElement(
      screen.getByRole("link", { name: "Ver detalles" }),
    );
  });

  it("calculates remaining time from the active stage progress", async () => {
    mocks.getMyKilns.mockResolvedValue({
      success: true,
      data: {
        unlinkedControllers: [],
        kilns: [
          {
            kilnId: 7,
            name: "Horno de prueba",
            liters: 50,
            nominalVoltage: 220,
            nominalCurrent: 20,
            selectedProgramId: 1,
            activeFiringCycle: {
              firingCycleId: 44,
              status: "PAUSED",
              program: { name: "Bizcocho" },
              programConfig: {
                stages: [
                  { durationMinutes: 30, targetTemperature: 100 },
                  { durationMinutes: 90, targetTemperature: 950 },
                ],
              },
            },
            controller: {
              controllerCode: "abcdef",
              connectionStatus: "ONLINE",
              activityStatus: "PAUSED",
              temperature: 400,
              stageIndex: 1,
              stageElapsedMinutes: 15,
            },
          },
        ],
      },
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    expect(await screen.findByText("1 h 15 min")).toBeInTheDocument();
    expect(screen.getByText("2 de 2")).toBeInTheDocument();
    expect(screen.getByText("Pausado")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reanudar quema" }),
    ).toBeInTheDocument();
  });
});
