import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import SupportTickets from "./SupportTickets";

const { authState, mocks } = vi.hoisted(() => ({
  authState: { user: { id: 1, name: "Cliente", role: "CLIENT" } },
  mocks: {
    getSupportReasons: vi.fn(),
    getSupportTickets: vi.fn(),
    getMyKilns: vi.fn(),
  },
}));

vi.mock("@context/AuthContext", () => ({ useAuth: () => authState }));
vi.mock("@services/kiln.service", () => ({ getMyKilns: mocks.getMyKilns }));
vi.mock("@services/support.service", () => ({
  createSupportReason: vi.fn(),
  createSupportTicket: vi.fn(),
  getSupportReasons: mocks.getSupportReasons,
  getSupportTickets: mocks.getSupportTickets,
  updateSupportReason: vi.fn(),
}));

function arrange(total = 0) {
  vi.clearAllMocks();
  mocks.getSupportReasons.mockResolvedValue({
    success: true,
    data: [{ supportReasonId: 1, code: "OTHER", name: "Otro", isActive: true }],
  });
  mocks.getSupportTickets.mockResolvedValue({
    success: true,
    data: { items: [], pagination: { page: 1, totalPages: 1, total } },
  });
  mocks.getMyKilns.mockResolvedValue({
    success: true,
    data: { kilns: [{ kilnId: 7, name: "Mi horno" }] },
  });
}

describe("SupportTickets", () => {
  it("shows the client creation flow and diagnostic transparency notice", async () => {
    arrange();
    authState.user = { id: 1, name: "Cliente", role: "CLIENT" };
    render(
      <MemoryRouter>
        <SupportTickets />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("option", { name: "#7 - Mi horno" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/personal técnico autorizado podrá consultar/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Asignación")).not.toBeInTheDocument();
  });

  it("shows the support queue but no client form to technicians", async () => {
    arrange();
    authState.user = { id: 2, name: "Técnico", role: "TECHNICIAN" };
    render(
      <MemoryRouter>
        <SupportTickets />
      </MemoryRouter>,
    );

    await waitFor(() => expect(mocks.getSupportTickets).toHaveBeenCalled());
    expect(screen.getByLabelText("Motivo")).toBeInTheDocument();
    expect(screen.queryByLabelText("Estado")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Asignación")).not.toBeInTheDocument();
    expect(screen.queryByText("Nueva solicitud")).not.toBeInTheDocument();
    expect(screen.queryByText("Gestionar motivos")).not.toBeInTheDocument();
  });

  it("shows the admin action and replaces equipment and assignee fields with smart search", async () => {
    arrange();
    authState.user = { id: 3, name: "Administrador", role: "ADMIN" };
    render(
      <MemoryRouter>
        <SupportTickets />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("button", { name: /gestionar motivos/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("searchbox", { name: "Buscar solicitudes" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Responsable")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("ID de horno")).not.toBeInTheDocument();
    expect(
      screen.getByRole("searchbox", { name: "Buscar solicitudes" }),
    ).toHaveClass("h-11");
    expect(screen.getByLabelText("Estado")).toHaveClass("h-11");
    expect(screen.getByLabelText("Motivo")).toHaveClass("h-11");
    expect(screen.getByLabelText("Asignación")).toHaveClass("h-11");
    expect(screen.getByLabelText("Desde")).toHaveClass("h-11");
    expect(screen.getByLabelText("Hasta")).toHaveClass("h-11");

    fireEvent.click(screen.getByRole("button", { name: /gestionar motivos/i }));
    expect(
      screen.getByRole("heading", { name: "Motivos de soporte" }),
    ).toBeInTheDocument();
  });

  it("offers the client request list only when previous requests exist", async () => {
    arrange(1);
    authState.user = { id: 1, name: "Cliente", role: "CLIENT" };
    render(
      <MemoryRouter>
        <SupportTickets />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("link", { name: /mis solicitudes/i }),
    ).toHaveAttribute("href", "/support/requests");
    expect(
      screen.getByRole("heading", { name: "Nueva solicitud" }),
    ).toBeInTheDocument();
  });

  it("shows open unassigned tickets by default and links to assigned requests", async () => {
    arrange(1);
    authState.user = { id: 2, name: "Técnico", role: "TECHNICIAN" };
    render(
      <MemoryRouter>
        <SupportTickets />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("link", { name: /solicitudes asignadas/i }),
    ).toHaveAttribute("href", "/support/assigned");
    await waitFor(() => {
      expect(mocks.getSupportTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "OPEN",
          assignment: "unassigned",
        }),
      );
    });
  });

  it("combines client and kiln information and opens details from the action column", async () => {
    arrange();
    authState.user = { id: 3, name: "Administrador", role: "ADMIN" };
    mocks.getSupportTickets.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            supportTicketId: 9,
            kilnId: 7,
            title: "Temperatura irregular",
            status: "OPEN",
            createdAt: "2026-09-14T10:00:00.000Z",
            supportReason: { name: "Temperatura" },
            kiln: { name: "Horno gres" },
            createdByUser: { name: "Camila" },
            assignedToUser: null,
          },
        ],
        pagination: { page: 1, totalPages: 1, total: 1 },
      },
    });
    render(
      <MemoryRouter>
        <SupportTickets />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Camila")).toBeInTheDocument();
    expect(screen.getByText("Horno #7")).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Horno" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Temperatura irregular" }),
    ).not.toBeInTheDocument();
    expect(
      screen
        .getAllByText("Sin asignar")
        .find((element) => element.tagName === "SPAN"),
    ).toHaveClass("italic", "text-muted");
    expect(screen.getByRole("link", { name: /ver detalle/i })).toHaveAttribute(
      "href",
      "/support/9",
    );
  });

  it("hides the kiln identifier from the client request list", async () => {
    arrange(1);
    authState.user = { id: 1, name: "Cliente", role: "CLIENT" };
    mocks.getSupportTickets.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            supportTicketId: 9,
            kilnId: 7,
            title: "Temperatura irregular",
            status: "OPEN",
            createdAt: "2026-09-14T10:00:00.000Z",
            supportReason: { name: "Temperatura" },
            kiln: { name: "Horno gres" },
          },
        ],
        pagination: { page: 1, totalPages: 1, total: 1 },
      },
    });
    render(
      <MemoryRouter initialEntries={["/support/requests"]}>
        <SupportTickets />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Horno gres")).toBeInTheDocument();
    expect(screen.queryByText("Horno #7")).not.toBeInTheDocument();
  });
});
