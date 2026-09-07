import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import HomeLayout from "./HomeLayout";

vi.mock("@context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, name: "Administradora", role: "ADMIN" },
  }),
}));

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
  });
});
