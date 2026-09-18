import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import HomeLayout from "./HomeLayout";

const { authState } = vi.hoisted(() => ({
  authState: { user: { id: 1, name: "Administradora", role: "ADMIN" } },
}));

vi.mock("@context/AuthContext", () => ({ useAuth: () => authState }));

describe("HomeLayout", () => {
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
    expect(screen.getByRole("link", { name: /Simulador/ })).toBeInTheDocument();
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
    expect(screen.queryByRole("link", { name: /Usuarios/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Hornos/ })).toHaveAttribute("href", "/management/kilns");
    expect(screen.getByRole("link", { name: /Controladores/ })).toHaveAttribute("href", "/management/controllers");
    expect(screen.queryByRole("link", { name: /Simulador/ })).not.toBeInTheDocument();
  });
});
