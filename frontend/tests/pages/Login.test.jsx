import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "@pages/Login";
import { login } from "@services/auth.service";

const { setUser } = vi.hoisted(() => ({ setUser: vi.fn() }));

vi.mock("@context/AuthContext", () => ({
  useAuth: () => ({ loading: false, user: null, setUser }),
}));

vi.mock("@services/auth.service", () => ({ login: vi.fn() }));

describe("Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("keeps the form visible and reports progress while authenticating", async () => {
    let resolveLogin;
    vi.mocked(login).mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(
      screen.getByRole("button", { name: "Iniciando sesión..." }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Correo electrónico")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();

    await act(async () => {
      resolveLogin({ success: false, message: "Credenciales incorrectas" });
    });

    expect(
      screen.getByRole("button", { name: "Iniciar sesión" }),
    ).toBeEnabled();
  });
});
