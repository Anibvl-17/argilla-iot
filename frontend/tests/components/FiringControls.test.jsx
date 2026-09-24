import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FiringControls from "@components/FiringControls";

const mocks = vi.hoisted(() => ({
  selectFiringProgram: vi.fn(),
  startProgram: vi.fn(),
  commandFiringCycle: vi.fn(),
}));

vi.mock("@services/firing.service", () => mocks);
vi.mock("@components/ProgramChart", () => ({
  default: () => <div data-testid="program-chart" />,
}));

const programs = [
  {
    programId: 1,
    name: "Bizcocho",
    description: "Quema inicial",
    configuration: {
      initialTemperature: 20,
      stages: [{ durationMinutes: 30, targetTemperature: 100 }],
    },
  },
];

const kiln = {
  kilnId: 7,
  selectedProgramId: 1,
  selectedProgram: programs[0],
  activeFiringCycle: null,
  controller: { connectionStatus: "ONLINE" },
};

describe("FiringControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const mock of Object.values(mocks)) {
      mock.mockResolvedValue({ success: true, data: {} });
    }
  });

  it("starts the persisted selected program", async () => {
    render(<FiringControls kiln={kiln} programs={programs} />);
    fireEvent.click(screen.getByRole("button", { name: "Iniciar quema" }));
    await waitFor(() => expect(mocks.startProgram).toHaveBeenCalledWith(7));
  });

  it("renders program details outside the controls layout", () => {
    const { container } = render(
      <FiringControls kiln={kiln} programs={programs} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ver programa" }));

    const dialog = screen.getByRole("dialog", { name: "Bizcocho" });
    expect(dialog).toBeInTheDocument();
    expect(container).not.toContainElement(dialog);
  });

  it("offers resume and cancellation for a paused cycle", () => {
    render(
      <FiringControls
        kiln={{
          ...kiln,
          activeFiringCycle: {
            firingCycleId: 12,
            status: "PAUSED",
            program: { name: "Bizcocho" },
          },
        }}
        programs={programs}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Reanudar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Detener quema" }),
    ).toBeInTheDocument();
  });

  it("blocks operations while controller state is being reconciled", () => {
    render(
      <FiringControls
        kiln={{
          ...kiln,
          reconciliation: { ready: false, reason: "STATE_NOT_CONFIRMED" },
        }}
        programs={programs}
      />,
    );
    expect(screen.getByText(/Reconciliando el estado/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Iniciar quema" }),
    ).toBeDisabled();
    expect(screen.queryByText("Quema directa")).not.toBeInTheDocument();
  });

  it("shows the frozen stage state during thermal recovery", () => {
    render(
      <FiringControls
        kiln={{
          ...kiln,
          activeFiringCycle: {
            firingCycleId: 12,
            status: "PAUSED",
            program: { name: "Bizcocho" },
          },
          controller: {
            connectionStatus: "ONLINE",
            setpointTemperature: 240,
            stageIndex: 2,
            recoveryInProgress: true,
          },
        }}
        programs={programs}
      />,
    );
    expect(screen.getByText("Setpoint: 240.0 °C")).toBeInTheDocument();
    expect(screen.getByText("Etapa: 3")).toBeInTheDocument();
    expect(
      screen.getByText("Recuperación térmica en curso"),
    ).toBeInTheDocument();
  });

  it.each([
    ["RUNNING", "Pausar quema"],
    ["PAUSED", "Reanudar quema"],
  ])("shows the compact %s actions in one row", (status, primaryAction) => {
    render(
      <MemoryRouter>
        <FiringControls
          compact
          detailsHref="/kilns/7"
          kiln={{
            ...kiln,
            activeFiringCycle: { firingCycleId: 12, status },
          }}
          programs={programs}
        />
      </MemoryRouter>,
    );

    const primary = screen.getByRole("button", { name: primaryAction });
    const actionRow = primary.parentElement;
    expect(actionRow).toContainElement(
      screen.getByRole("button", { name: "Detener quema" }),
    );
    expect(actionRow).toContainElement(
      screen.getByRole("link", { name: "Ver detalles" }),
    );
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("shows only the detail action when the compact controller is offline", () => {
    render(
      <MemoryRouter>
        <FiringControls
          compact
          detailsHref="/kilns/7"
          kiln={{
            ...kiln,
            controller: { connectionStatus: "OFFLINE" },
          }}
          programs={programs}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: "Ver detalles" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("moves the compact detail action to a full row on smaller screens", () => {
    render(
      <MemoryRouter>
        <FiringControls
          compact
          detailsHref="/kilns/7"
          kiln={kiln}
          programs={programs}
        />
      </MemoryRouter>,
    );

    const details = screen.getByRole("link", { name: "Ver detalles" });
    expect(details).toHaveClass("basis-full", "min-[480px]:basis-auto");
    expect(details.parentElement).toHaveClass("flex-wrap");
  });
});
