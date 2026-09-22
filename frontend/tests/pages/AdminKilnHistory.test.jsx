import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminKilnHistory from "@pages/AdminKilnHistory";

const mocks = vi.hoisted(() => ({
  getAdminKiln: vi.fn(),
  getAdminKilnCycles: vi.fn(),
  getAdminKilnCycleTelemetry: vi.fn(),
}));

vi.mock("@services/kiln.service", () => mocks);
vi.mock("@hooks/useControllerRealtime", () => ({
  useControllerRealtime: vi.fn(),
}));
vi.mock("@hooks/useFiringRealtime", () => ({
  useFiringRealtime: vi.fn(),
}));
vi.mock("@components/TelemetryChart", () => ({
  default: () => (
    <div role="img" aria-label="Temperatura real y setpoint del ciclo a través del tiempo" />
  ),
}));

const cycle = {
  firingCycleId: 91,
  controllerCycleId: "controller-cycle-91",
  startedAt: "2026-09-20T12:00:00.000Z",
  endedAt: "2026-09-20T13:30:00.000Z",
  status: "COMPLETED",
  program: { programId: 1, name: "Bizcocho" },
};

describe("AdminKilnHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminKiln.mockResolvedValue({
      success: true,
      data: {
        kilnId: 7,
        name: "Horno administrativo",
        liters: 100,
        nominalCurrent: 20,
        nominalVoltage: 220,
        firingCycleCount: 3,
        user: { name: "Cliente" },
        controller: {
          controllerId: "controller-1",
          controllerCode: "abcdef",
          connectionStatus: "ONLINE",
          activityStatus: "IDLE",
          operationalStatus: "OPERATIONAL",
        },
      },
    });
    mocks.getAdminKilnCycles.mockResolvedValue({
      success: true,
      data: {
        items: [cycle],
        pagination: { page: 1, pageSize: 10, total: 3, totalPages: 1 },
      },
    });
    mocks.getAdminKilnCycleTelemetry.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            telemetryId: 4,
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

  it("shows cycles and opens the chart and paginated telemetry modal", async () => {
    render(
      <MemoryRouter initialEntries={["/management/kilns/7/history"]}>
        <Routes>
          <Route
            path="/management/kilns/:kilnId/history"
            element={<AdminKilnHistory />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Quemas realizadas")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(
      await screen.findByRole("columnheader", { name: "Programa" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 h 30 min")).toBeInTheDocument();
    expect(screen.queryByText("Historial de temperatura")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Ver detalle del ciclo 91" }),
    );
    await waitFor(() =>
      expect(mocks.getAdminKilnCycleTelemetry).toHaveBeenCalledWith(
        "7",
        91,
        1,
        10,
      ),
    );
    expect(mocks.getAdminKilnCycleTelemetry).toHaveBeenCalledWith(
      "7",
      91,
      1,
      100,
    );

    const modal = screen.getByRole("dialog", { name: "Detalle del ciclo" });
    expect(within(modal).getByText("Bizcocho")).toBeInTheDocument();
    expect(within(modal).getByText("Completada")).toBeInTheDocument();
    expect(within(modal).getByRole("columnheader", { name: "Etapa" })).toBeInTheDocument();
    expect(within(modal).getByRole("columnheader", { name: "Hora" })).toBeInTheDocument();
    expect(within(modal).getByRole("columnheader", { name: "Switch" })).toBeInTheDocument();
    expect(
      within(modal).getByRole("img", {
        name: "Temperatura real y setpoint del ciclo a través del tiempo",
      }),
    ).toBeInTheDocument();
  });
});
