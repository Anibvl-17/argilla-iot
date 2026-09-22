import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SupportTicketDetails from "@pages/SupportTicketDetails";

const { authState, mocks } = vi.hoisted(() => ({
  authState: { user: { id: 2, name: "Técnico", role: "TECHNICIAN" } },
  mocks: {
    assignSupportTicket: vi.fn(),
    claimSupportTicket: vi.fn(),
    createTicketMaintenance: vi.fn(),
    getSupportAssignees: vi.fn(),
    getSupportTicket: vi.fn(),
    getSupportDiagnostics: vi.fn(),
    getSupportTelemetry: vi.fn(),
    updateTicketMaintenance: vi.fn(),
    updateSupportTicketStatus: vi.fn(),
  },
}));

vi.mock("@context/AuthContext", () => ({
  useAuth: () => authState,
}));
vi.mock("@services/support.service", () => ({
  assignSupportTicket: mocks.assignSupportTicket,
  claimSupportTicket: mocks.claimSupportTicket,
  createTicketMaintenance: mocks.createTicketMaintenance,
  getSupportAssignees: mocks.getSupportAssignees,
  getSupportDiagnostics: mocks.getSupportDiagnostics,
  getSupportTelemetry: mocks.getSupportTelemetry,
  getSupportTicket: mocks.getSupportTicket,
  updateTicketMaintenance: mocks.updateTicketMaintenance,
  updateSupportTicketStatus: mocks.updateSupportTicketStatus,
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

function buildDiagnostics(overrides = {}) {
  return {
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
        status: "COMPLETED",
        program: { programId: 1, name: "Bizcocho" },
      },
    ],
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
      data: buildDiagnostics(),
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
    mocks.createTicketMaintenance.mockResolvedValue({
      success: true,
      data: {},
    });
  });

  it("tells an administrator that an assigned ticket can be reassigned", async () => {
    authState.user = { id: 1, name: "Administrador", role: "ADMIN" };

    render(
      <MemoryRouter initialEntries={["/support/9"]}>
        <Routes>
          <Route path="/support/:ticketId" element={<SupportTicketDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("Puedes reasignar el ticket."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Puedes tomar el ticket o asignar un responsable para comenzar la atención.",
      ),
    ).not.toBeInTheDocument();
  });

  it("returns clients to their requests before the support home", async () => {
    authState.user = { id: 4, name: "Cliente", role: "CLIENT" };

    render(
      <MemoryRouter initialEntries={["/support/9"]}>
        <Routes>
          <Route path="/support/:ticketId" element={<SupportTicketDetails />} />
          <Route path="/support/requests" element={<h1>Mis solicitudes</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    const backLink = await screen.findByRole("link", {
      name: "Volver a mis solicitudes",
    });
    expect(backLink).toHaveAttribute("href", "/support/requests");

    fireEvent.click(backLink);
    expect(
      screen.getByRole("heading", { name: "Mis solicitudes" }),
    ).toBeInTheDocument();
  });

  it("returns technicians to the assigned requests view they came from", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/support/9",
            state: { supportReturnPath: "/support/assigned" },
          },
        ]}
      >
        <Routes>
          <Route path="/support/:ticketId" element={<SupportTicketDetails />} />
          <Route
            path="/support/assigned"
            element={<h1>Solicitudes asignadas</h1>}
          />
        </Routes>
      </MemoryRouter>,
    );

    const backLink = await screen.findByRole("link", {
      name: "Volver a solicitudes asignadas",
    });
    expect(backLink).toHaveAttribute("href", "/support/assigned");

    fireEvent.click(backLink);
    expect(
      screen.getByRole("heading", { name: "Solicitudes asignadas" }),
    ).toBeInTheDocument();
  });

  it("reveals the work fields immediately after a technician claims a ticket", async () => {
    mocks.getSupportTicket.mockResolvedValue({
      success: true,
      data: buildTicket({
        assignedToUserId: null,
        assignedToUser: null,
        status: "OPEN",
      }),
    });
    mocks.claimSupportTicket.mockResolvedValue({
      success: true,
      data: buildTicket(),
    });

    render(
      <MemoryRouter initialEntries={["/support/9"]}>
        <Routes>
          <Route path="/support/:ticketId" element={<SupportTicketDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    const actionsSection = (
      await screen.findByRole("heading", {
        name: "Acciones",
      })
    ).closest("section");
    const claimButton = within(actionsSection).getByRole("button", {
      name: "Tomar ticket",
    });

    expect(claimButton).toHaveClass("shrink-0", "self-start");
    expect(within(actionsSection).queryByText("Responsable")).toBeNull();
    expect(within(actionsSection).queryByText("Mantenimientos")).toBeNull();

    fireEvent.click(claimButton);

    await waitFor(() => {
      expect(mocks.claimSupportTicket).toHaveBeenCalledWith("9");
      expect(
        within(actionsSection).getByRole("textbox", {
          name: "Diagnóstico y solución",
        }),
      ).toBeInTheDocument();
      expect(
        within(actionsSection).getByText("Mantenimientos"),
      ).toBeInTheDocument();
    });
  });

  it("shows the work fields immediately after login without requiring a reload", async () => {
    authState.user = {
      userId: 2,
      name: "Técnico",
      role: "TECHNICIAN",
    };

    render(
      <MemoryRouter initialEntries={["/support/9"]}>
        <Routes>
          <Route path="/support/:ticketId" element={<SupportTicketDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("textbox", {
        name: "Diagnóstico y solución",
      }),
    ).toBeInTheDocument();
    expect(mocks.getSupportTicket).toHaveBeenCalledTimes(1);
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

  it("hides the cycle table headers when there are no recent cycles", async () => {
    mocks.getSupportDiagnostics.mockResolvedValue({
      success: true,
      data: buildDiagnostics({ firingCycles: [] }),
    });

    render(
      <MemoryRouter initialEntries={["/support/9"]}>
        <Routes>
          <Route path="/support/:ticketId" element={<SupportTicketDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("Sin ciclos registrados."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Inicio" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Acciones" }),
    ).not.toBeInTheDocument();
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
    expect(screen.getByText("Bizcocho")).toBeInTheDocument();
    expect(screen.getByText("Completado")).toBeInTheDocument();

    const ticketHeading = screen.getByRole("heading", {
      name: "Temperatura irregular",
    });
    const descriptionSection = ticketHeading.closest("section");
    expect(
      within(descriptionSection).getByText("Ticket #9 - Temperatura"),
    ).toBeInTheDocument();
    expect(within(descriptionSection).getByText(/Camila/)).toBeInTheDocument();
    expect(
      within(descriptionSection).getByText(
        "La temperatura cae durante el ciclo.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Volver a soporte" }).closest("section"),
    ).toBeNull();

    const actionsSection = screen
      .getByRole("heading", { name: "Acciones" })
      .closest("section");
    expect(within(actionsSection).getByText("Responsable")).toBeInTheDocument();
    expect(
      within(actionsSection).getByRole("textbox", {
        name: "Diagnóstico y solución",
      }),
    ).toBeInTheDocument();
    expect(
      within(actionsSection).getByText(
        "Para marcar el ticket como resuelto debes ingresar diagnóstico y solución. También puedes registrar mantenimientos asociados a este ticket.",
      ),
    ).toBeInTheDocument();
    expect(
      within(actionsSection).getByRole("button", {
        name: "Marcar como resuelto",
      }),
    ).toHaveClass("shrink-0", "self-start");
    expect(within(actionsSection).getByText("Técnico")).toHaveClass(
      "text-content",
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Copiar ID del controlador" }),
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("abcdef");
  });

  it("registers maintenance from the bottom of the maintenance list", async () => {
    render(
      <MemoryRouter initialEntries={["/support/9"]}>
        <Routes>
          <Route path="/support/:ticketId" element={<SupportTicketDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    const actionsSection = (
      await screen.findByRole("heading", {
        name: "Acciones",
      })
    ).closest("section");
    expect(
      within(actionsSection).getByText("Sin mantenimientos registrados."),
    ).toBeInTheDocument();

    const maintenanceHeading = within(actionsSection).getByRole("heading", {
      name: "Mantenimientos",
    });
    const maintenanceButton = within(
      maintenanceHeading.parentElement,
    ).getByRole("button", { name: "Registrar mantenimiento" });
    expect(maintenanceButton).toHaveClass("w-full", "sm:w-auto");
    expect(
      within(actionsSection)
        .getByText("Sin mantenimientos registrados.")
        .compareDocumentPosition(maintenanceButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    fireEvent.click(maintenanceButton);

    const dialog = screen.getByRole("dialog", {
      name: "Registrar mantenimiento",
    });
    fireEvent.change(
      within(dialog).getByRole("textbox", {
        name: "Título de la intervención",
      }),
      { target: { value: "Revisión eléctrica" } },
    );
    fireEvent.change(
      within(dialog).getByRole("textbox", { name: "Trabajo realizado" }),
      { target: { value: "Se revisaron terminales y conexiones." } },
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Registrar mantenimiento" }),
    );

    await waitFor(() => {
      expect(mocks.createTicketMaintenance).toHaveBeenCalledWith(
        "9",
        expect.objectContaining({
          type: "INSPECTION",
          title: "Revisión eléctrica",
          workPerformed: "Se revisaron terminales y conexiones.",
          kilnId: 7,
        }),
      );
      expect(
        screen.queryByRole("dialog", { name: "Registrar mantenimiento" }),
      ).not.toBeInTheDocument();
    });
  });

  it("expands maintenance work and only allows editing the current user's record", async () => {
    const ownMaintenance = {
      maintenanceId: 21,
      kilnId: 7,
      controllerId: null,
      performedByUserId: 2,
      type: "CORRECTIVE",
      title: "Ajuste de terminales",
      workPerformed: "Se ajustaron conexiones del tablero.",
      performedAt: "2026-09-14T12:00:00.000Z",
      performedByUser: { userId: 2, name: "Técnico", role: "TECHNICIAN" },
    };
    const otherMaintenance = {
      ...ownMaintenance,
      maintenanceId: 22,
      performedByUserId: 8,
      title: "Inspección anterior",
      workPerformed: "Se inspeccionó el cableado.",
      performedByUser: {
        userId: 8,
        name: "Otra técnica",
        role: "TECHNICIAN",
      },
    };
    mocks.getSupportTicket.mockResolvedValue({
      success: true,
      data: buildTicket({
        maintenanceRecords: [ownMaintenance, otherMaintenance],
      }),
    });
    mocks.updateTicketMaintenance.mockResolvedValue({
      success: true,
      data: {
        ...ownMaintenance,
        workPerformed: "Se reemplazaron los terminales dañados.",
      },
    });

    render(
      <MemoryRouter initialEntries={["/support/9"]}>
        <Routes>
          <Route path="/support/:ticketId" element={<SupportTicketDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Ajuste de terminales")).toBeInTheDocument();
    expect(
      screen.getByText("Ajuste de terminales").closest("article"),
    ).toHaveClass("sm:grid-cols-[minmax(0,1fr)_auto]", "sm:items-center");
    expect(
      screen.queryByText("Se ajustaron conexiones del tablero."),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Editar" })).toHaveLength(1);

    fireEvent.click(screen.getAllByRole("button", { name: "Ver trabajo" })[0]);
    const expandedWork = screen.getByText(
      "Se ajustaron conexiones del tablero.",
    );
    expect(expandedWork).toHaveClass("sm:col-span-2");
    expect(
      screen.getByRole("button", { name: "Ocultar trabajo" }).parentElement,
    ).toHaveClass("sm:row-start-1", "sm:self-center");

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    const dialog = screen.getByRole("dialog", {
      name: "Editar mantenimiento",
    });
    const workField = within(dialog).getByRole("textbox", {
      name: "Trabajo realizado",
    });
    expect(workField).toHaveValue("Se ajustaron conexiones del tablero.");
    fireEvent.change(workField, {
      target: { value: "Se reemplazaron los terminales dañados." },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() => {
      expect(mocks.updateTicketMaintenance).toHaveBeenCalledWith(
        "9",
        21,
        expect.objectContaining({
          type: "CORRECTIVE",
          title: "Ajuste de terminales",
          workPerformed: "Se reemplazaron los terminales dañados.",
          kilnId: 7,
        }),
      );
    });
  });

  it("requires a diagnosis and solution before resolving a ticket", async () => {
    mocks.updateSupportTicketStatus.mockResolvedValue({
      success: true,
      data: buildTicket({
        status: "RESOLVED",
        resolution: "Se ajustó el controlador.",
      }),
    });

    render(
      <MemoryRouter initialEntries={["/support/9"]}>
        <Routes>
          <Route path="/support/:ticketId" element={<SupportTicketDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    const resolveButton = await screen.findByRole("button", {
      name: "Marcar como resuelto",
    });
    fireEvent.click(resolveButton);
    expect(mocks.updateSupportTicketStatus).not.toHaveBeenCalled();

    fireEvent.change(
      screen.getByRole("textbox", { name: "Diagnóstico y solución" }),
      { target: { value: "  Se ajustó el controlador.  " } },
    );
    fireEvent.click(resolveButton);

    await waitFor(() => {
      expect(mocks.updateSupportTicketStatus).toHaveBeenCalledWith("9", {
        status: "RESOLVED",
        resolution: "Se ajustó el controlador.",
      });
    });
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
