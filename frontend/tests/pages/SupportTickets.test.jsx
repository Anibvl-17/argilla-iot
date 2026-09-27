import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import SupportTickets from "@pages/SupportTickets";

const { authState, mocks } = vi.hoisted(() => ({
  authState: { user: { id: 1, name: "Cliente", role: "CLIENT" } },
  mocks: {
    createSupportTicket: vi.fn(),
    getSupportReasons: vi.fn(),
    getSupportTickets: vi.fn(),
    getMyKilns: vi.fn(),
  },
}));

vi.mock("@context/AuthContext", () => ({ useAuth: () => authState }));
vi.mock("@services/kiln.service", () => ({ getMyKilns: mocks.getMyKilns }));
vi.mock("@services/support.service", () => ({
  createSupportReason: vi.fn(),
  createSupportTicket: mocks.createSupportTicket,
  getSupportReasons: mocks.getSupportReasons,
  getSupportTickets: mocks.getSupportTickets,
  updateSupportReason: vi.fn(),
}));

function arrange(total = 0) {
  vi.clearAllMocks();
  mocks.getSupportReasons.mockResolvedValue({
    success: true,
    data: [
      {
        supportReasonId: 1,
        code: "OTHER",
        name: "Otro",
        isActive: true,
      },
      {
        supportReasonId: 2,
        code: "CONNECTIVITY",
        name: "Problema de conectividad",
        isActive: true,
      },
    ],
  });
  mocks.getSupportTickets.mockResolvedValue({
    success: true,
    data: { items: [], pagination: { page: 1, totalPages: 1, total } },
  });
  mocks.getMyKilns.mockResolvedValue({
    success: true,
    data: { kilns: [{ kilnId: 7, name: "Mi horno" }] },
  });
  mocks.createSupportTicket.mockResolvedValue({ success: true, data: {} });
}

function ReturnPathProbe() {
  const location = useLocation();
  return <p>{location.state?.supportReturnPath}</p>;
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
    const heading = screen.getByRole("heading", { name: "Nueva solicitud" });
    expect(heading.closest(".max-w-7xl")).toHaveClass(
      "mx-auto",
      "w-full",
      "max-w-7xl",
    );
    expect(heading).toHaveClass("mt-2", "font-semibold");
    expect(heading).not.toHaveClass("font-bold");
    expect(heading.parentElement.parentElement).toHaveClass("mb-6");
    expect(screen.getByText("Cuéntanos qué ocurre con uno de tus hornos.")).toHaveClass(
      "mt-2",
      "text-secondary",
    );
    expect(
      screen.getByText(/personal técnico autorizado podrá consultar/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Asignación")).not.toBeInTheDocument();
    const fields = screen.getAllByRole("combobox");
    expect(fields[0]).toHaveAccessibleName("Motivo");
    expect(fields[1]).toHaveAccessibleName("Horno (opcional)");
    expect(
      screen.getByRole("option", { name: "Sin horno asociado" }),
    ).toBeInTheDocument();
  });

  it("preselects connectivity and creates a request without a kiln", async () => {
    arrange();
    authState.user = { id: 1, name: "Cliente", role: "CLIENT" };
    mocks.getMyKilns.mockResolvedValue({
      success: true,
      data: { kilns: [] },
    });

    render(
      <MemoryRouter initialEntries={["/support?reason=CONNECTIVITY"]}>
        <SupportTickets />
      </MemoryRouter>,
    );

    const reason = await screen.findByRole("combobox", { name: "Motivo" });
    await waitFor(() => expect(reason).toHaveValue("2"));
    expect(
      screen.getByRole("combobox", { name: "Horno (opcional)" }),
    ).toHaveValue("");
    fireEvent.change(screen.getByRole("textbox", { name: "Título" }), {
      target: { value: "No puedo vincular" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Descripción" }), {
      target: { value: "El controlador no completa la vinculación." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    await waitFor(() => {
      expect(mocks.createSupportTicket).toHaveBeenCalledWith({
        supportReasonId: 2,
        title: "No puedo vincular",
        description: "El controlador no completa la vinculación.",
      });
    });

    const dialog = screen.getByRole("dialog", { name: "Solicitud enviada" });
    expect(
      within(dialog).getByText(
        /tu solicitud fue enviada a soporte y será atendida a la brevedad/i,
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("link", { name: "Ir a mis solicitudes" }),
    ).toHaveAttribute("href", "/support/requests");
    fireEvent.click(within(dialog).getByRole("button", { name: "Volver" }));
    expect(
      screen.queryByRole("dialog", { name: "Solicitud enviada" }),
    ).not.toBeInTheDocument();
  });

  it("shows an error dialog without a request-list action when the client has no requests", async () => {
    arrange();
    authState.user = { id: 1, name: "Cliente", role: "CLIENT" };
    mocks.createSupportTicket.mockResolvedValue({
      success: false,
      message: "Error inesperado",
    });

    render(
      <MemoryRouter initialEntries={["/support?reason=CONNECTIVITY"]}>
        <SupportTickets />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Motivo" })).toHaveValue(
        "2",
      ),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Título" }), {
      target: { value: "No puedo vincular" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Descripción" }), {
      target: { value: "El controlador no completa la vinculación." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    const dialog = await screen.findByRole("dialog", {
      name: "No pudimos enviar la solicitud",
    });
    expect(
      within(dialog).getByText(
        "Ocurrió un problema al enviar tu solicitud a soporte, por favor intenta más tarde.",
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("link", { name: "Ir a mis solicitudes" }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Volver" }),
    ).toBeInTheDocument();
  });

  it("offers the request list from an error dialog when previous requests exist", async () => {
    arrange(1);
    authState.user = { id: 1, name: "Cliente", role: "CLIENT" };
    mocks.createSupportTicket.mockResolvedValue({
      success: false,
      message: "Error inesperado",
    });

    render(
      <MemoryRouter initialEntries={["/support?reason=CONNECTIVITY"]}>
        <SupportTickets />
      </MemoryRouter>,
    );

    await screen.findByRole("link", { name: /mis solicitudes/i });
    fireEvent.change(screen.getByRole("textbox", { name: "Título" }), {
      target: { value: "No puedo vincular" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Descripción" }), {
      target: { value: "El controlador no completa la vinculación." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    const dialog = await screen.findByRole("dialog", {
      name: "No pudimos enviar la solicitud",
    });
    expect(
      within(dialog).getByRole("link", { name: "Ir a mis solicitudes" }),
    ).toHaveAttribute("href", "/support/requests");
  });

  it("does not preselect connectivity when the reason is inactive", async () => {
    arrange();
    authState.user = { id: 1, name: "Cliente", role: "CLIENT" };
    mocks.getSupportReasons.mockResolvedValue({
      success: true,
      data: [
        {
          supportReasonId: 1,
          code: "OTHER",
          name: "Otro",
          isActive: true,
        },
        {
          supportReasonId: 2,
          code: "CONNECTIVITY",
          name: "Problema de conectividad",
          isActive: false,
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={["/support?reason=CONNECTIVITY"]}>
        <SupportTickets />
      </MemoryRouter>,
    );

    await screen.findByRole("option", { name: "Otro" });
    expect(screen.getByRole("combobox", { name: "Motivo" })).toHaveValue("");
    expect(
      screen.queryByRole("option", { name: "Problema de conectividad" }),
    ).not.toBeInTheDocument();
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

  it("preserves the assigned technician view when opening a ticket", async () => {
    arrange(1);
    authState.user = { id: 2, name: "Técnico", role: "TECHNICIAN" };
    mocks.getSupportTickets.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            supportTicketId: 9,
            kilnId: 7,
            title: "Temperatura irregular",
            status: "IN_PROGRESS",
            createdAt: "2026-09-14T10:00:00.000Z",
            supportReason: { name: "Temperatura" },
            createdByUser: { name: "Camila" },
            assignedToUser: { name: "Técnico" },
          },
        ],
        pagination: { page: 1, totalPages: 1, total: 1 },
      },
    });

    render(
      <MemoryRouter initialEntries={["/support/assigned"]}>
        <Routes>
          <Route path="/support/assigned" element={<SupportTickets />} />
          <Route path="/support/:ticketId" element={<ReturnPathProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("link", { name: "Ver detalle" }));
    expect(await screen.findByText("/support/assigned")).toBeInTheDocument();
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
    for (const heading of ["Cliente", "Responsable", "Estado", "Fecha"]) {
      expect(screen.getByRole("columnheader", { name: heading })).toHaveClass(
        "hidden",
        "md:table-cell",
      );
    }
    for (const heading of ["ID", "Solicitud", "Acciones"]) {
      expect(
        screen.getByRole("columnheader", { name: heading }),
      ).not.toHaveClass("hidden");
    }
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

  it("shows an empty equipment label for tickets without a kiln", async () => {
    arrange();
    authState.user = { id: 3, name: "Administrador", role: "ADMIN" };
    mocks.getSupportTickets.mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            supportTicketId: 10,
            kilnId: null,
            kiln: null,
            title: "Ayuda de vinculación",
            status: "OPEN",
            createdAt: "2026-09-26T10:00:00.000Z",
            supportReason: { name: "Problema de conectividad" },
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

    expect(await screen.findByText("Ayuda de vinculación")).toBeInTheDocument();
    expect(screen.getByText("Sin horno asociado")).toHaveClass(
      "italic",
      "text-muted",
    );
  });
});
