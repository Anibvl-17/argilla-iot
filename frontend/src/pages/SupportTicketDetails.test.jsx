import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SupportTicketDetails from "./SupportTicketDetails";

const { authState, mocks } = vi.hoisted(() => ({
  authState: { user: { id: 2, name: "Técnico", role: "TECHNICIAN" } },
  mocks: {
    assignSupportTicket: vi.fn(),
    getSupportAssignees: vi.fn(),
    getSupportTicket: vi.fn(),
    getSupportDiagnostics: vi.fn(),
    getSupportTelemetry: vi.fn(),
  },
}));

vi.mock("@context/AuthContext", () => ({
  useAuth: () => authState,
}));
vi.mock("@services/support.service", () => ({
  assignSupportTicket: mocks.assignSupportTicket,
  claimSupportTicket: vi.fn(),
  createTicketMaintenance: vi.fn(),
  getSupportAssignees: mocks.getSupportAssignees,
  getSupportDiagnostics: mocks.getSupportDiagnostics,
  getSupportTelemetry: mocks.getSupportTelemetry,
  getSupportTicket: mocks.getSupportTicket,
  updateSupportTicketStatus: vi.fn(),
}));

function buildTicket(overrides = {}) {
  return {
    supportTicketId: 9,
    assignedToUserId: 2,
    title: "Temperatura irregular",
    description: "La temperatura cae durante el ciclo.",
    status: "IN_PROGRESS",
    resolution: null,
    createdAt: "2026-09-14T10:00:00.000Z",
    supportReason: { name: "Temperatura" },
    kiln: { name: "Horno gres" },
    createdByUser: {
      name: "Camila",
      email: "camila@example.com",
      phone: "+56911111111",
    },
    assignedToUser: { name: "Técnico" },
    maintenanceRecords: [],
    ...overrides,
  };
}

describe("SupportTicketDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = { id: 2, name: "Técnico", role: "TECHNICIAN" };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    mocks.getSupportTicket.mockResolvedValue({
      success: true,
      data: buildTicket(),
    });
    mocks.getSupportAssignees.mockResolvedValue({ success: true, data: [] });
    mocks.getSupportDiagnostics.mockResolvedValue({
      success: true,
      data: {
        kilnId: 7,
        name: "Horno gres",
        liters: 100,
        nominalVoltage: 220,
        nominalCurrent: 20,
        phaseCount: 1,
        operationalStatus: "OPERATIONAL",
        controller: {
          controllerId: "11111111-1111-4111-8111-111111abcdef",
          controllerCode: "abcdef",
          connectionStatus: "ONLINE",
          temperature: 700,
          firmwareVersion: "1.0.0",
        },
        firingCycles: [
          {
            firingCycleId: 44,
            startedAt: "2026-09-14T11:00:00.000Z",
            endedAt: "2026-09-14T12:00:00.000Z",
            executionType: "DIRECT",
            status: "COMPLETED",
            targetTemperature: 950,
          },
        ],
      },
    });
    mocks.getSupportTelemetry.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            telemetryId: 88,
            timestamp: "2026-09-14T11:30:00.000Z",
            temperature: 700,
            setpointTemperature: 720,
            voltage: 220,
            current: 15,
            switchState: true,
          },
        ],
        pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
      },
    });
  });

  it("opens a cycle modal and requests only that cycle telemetry", async () => {
    render(
      <MemoryRouter initialEntries={["/support/9"]}>
        <Routes>
          <Route path="/support/:ticketId" element={<SupportTicketDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Ver detalle" }));

    const dialog = await screen.findByRole("dialog", {
      name: "Telemetría del ciclo #44",
    });
    await waitFor(() => {
      expect(mocks.getSupportTelemetry).toHaveBeenCalledWith("9", 44, 1, 10);
    });
    expect(within(dialog).getByText("700.0 °C")).toBeInTheDocument();
  });

  it("uses friendly equipment labels and copies the controller identifier", async () => {
    render(
      <MemoryRouter initialEntries={["/support/9"]}>
        <Routes>
          <Route path="/support/:ticketId" element={<SupportTicketDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("220 V - 20 A - Monofásico"),
    ).toBeInTheDocument();
    expect(screen.getByText("Operativo")).toBeInTheDocument();
    expect(screen.getByText("Conectado")).toBeInTheDocument();
    expect(screen.getByText("Control directo")).toBeInTheDocument();
    expect(screen.getByText("Completado")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Copiar ID del controlador" }),
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("abcdef");
  });

  it("searches responsible technicians by name before assigning them", async () => {
    authState.user = { id: 3, name: "Administrador", role: "ADMIN" };
    mocks.getSupportTicket.mockResolvedValue({
      success: true,
      data: buildTicket({ assignedToUserId: null, assignedToUser: null }),
    });
    mocks.getSupportAssignees.mockResolvedValue({
      success: true,
      data: [
        { userId: 5, name: "Sofía Técnica", role: "TECHNICIAN" },
        { userId: 6, name: "Pablo Técnico", role: "TECHNICIAN" },
      ],
    });
    mocks.assignSupportTicket.mockResolvedValue({
      success: true,
      data: buildTicket({
        assignedToUserId: 5,
        assignedToUser: {
          userId: 5,
          name: "Sofía Técnica",
          role: "TECHNICIAN",
        },
      }),
    });

    render(
      <MemoryRouter initialEntries={["/support/9"]}>
        <Routes>
          <Route path="/support/:ticketId" element={<SupportTicketDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Sin asignar")).toHaveClass(
      "italic",
      "text-muted",
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Asignar responsable" }),
    );
    const search = await screen.findByRole("searchbox", {
      name: "Buscar técnico por nombre",
    });
    fireEvent.change(search, { target: { value: "sofia" } });
    fireEvent.click(screen.getByRole("option", { name: /sofía técnica/i }));

    await waitFor(() => {
      expect(mocks.assignSupportTicket).toHaveBeenCalledWith("9", 5);
    });
  });
});
