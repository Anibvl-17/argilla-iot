import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Login from "@pages/Login";

vi.mock("@context/AuthContext", () => ({
  useAuth: () => ({ loading: false, user: null, setUser: vi.fn() }),
}));

vi.mock("@services/auth.service", () => ({ login: vi.fn() }));

describe("Login", () => {
  it("associates visible labels with both credentials", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Correo electrónico")).toHaveAttribute(
      "name",
      "email",
    );
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute(
      "name",
      "password",
    );
  });
});
