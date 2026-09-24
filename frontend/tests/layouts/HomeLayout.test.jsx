import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomeLayout from "@layouts/HomeLayout";

const { authState } = vi.hoisted(() => ({
  authState: { user: { id: 1, name: "Administradora", role: "ADMIN" } },
}));

vi.mock("@context/AuthContext", () => ({ useAuth: () => authState }));

describe("HomeLayout", () => {
  beforeEach(() => {
    authState.user = { id: 1, name: "Administradora", role: "ADMIN" };
  });

  it("shows every management navigation item for administrators", () => {
    render(
      <MemoryRouter>
        <HomeLayout />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Resumen/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Usuarios/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Hornos/ })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Controladores/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Simulador/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Soporte/ })).toBeInTheDocument();
  });

  it("shows equipment and support navigation to technicians", () => {
    authState.user = { id: 2, name: "Técnico", role: "TECHNICIAN" };
    render(
      <MemoryRouter>
        <HomeLayout />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Soporte/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Usuarios/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Hornos/ })).toHaveAttribute(
      "href",
      "/management/kilns",
    );
    expect(screen.getByRole("link", { name: /Controladores/ })).toHaveAttribute(
      "href",
      "/management/controllers",
    );
    expect(
      screen.queryByRole("link", { name: /Simulador/ }),
    ).not.toBeInTheDocument();
  });

  it("does not expose the simulator navigation to clients", () => {
    authState.user = { id: 3, name: "Cliente", role: "CLIENT" };
    render(
      <MemoryRouter>
        <HomeLayout />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: /Mis hornos/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Soporte/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Simulador/ }),
    ).not.toBeInTheDocument();
  });

  it("keeps My kilns active while a client views a kiln detail", () => {
    authState.user = { id: 3, name: "Cliente", role: "CLIENT" };
    render(
      <MemoryRouter initialEntries={["/kilns/7"]}>
        <HomeLayout />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Mis hornos/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("keeps kilns active while an administrator views its history", () => {
    render(
      <MemoryRouter initialEntries={["/management/kilns/7/history"]}>
        <HomeLayout />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Hornos/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: /Resumen/ })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("keeps support highlighted while viewing a ticket detail", () => {
    authState.user = { id: 2, name: "Técnico", role: "TECHNICIAN" };
    render(
      <MemoryRouter initialEntries={["/support/9"]}>
        <HomeLayout />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Soporte/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
