import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Register from "@pages/Register";

const mocks = vi.hoisted(() => ({ register: vi.fn() }));

vi.mock("@context/AuthContext", () => ({
  useAuth: () => ({ loading: false, user: null }),
}));
vi.mock("@services/auth.service", () => ({ register: mocks.register }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

describe("Register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows only the four required public registration fields", () => {
    const { container } = render(
      <MemoryRouter>
        <Register setMode={vi.fn()} />
      </MemoryRouter>,
    );

    for (const name of ["name", "email", "password", "confirmPassword"]) {
      expect(container.querySelector(`[name="${name}"]`)).toBeRequired();
    }
    expect(screen.queryByRole("button", { name: "País" })).toBeNull();
    expect(container.querySelector('[name="phone"]')).toBeNull();
    expect(container.querySelector('[name="addressLine"]')).toBeNull();
  });

  it("submits only name, email and password", async () => {
    mocks.register.mockResolvedValue({ success: true });
    const setMode = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <Register setMode={setMode} />
      </MemoryRouter>,
    );

    fireEvent.change(container.querySelector('[name="name"]'), {
      target: { value: "María Pérez" },
    });
    fireEvent.change(container.querySelector('[name="email"]'), {
      target: { value: "maria@example.com" },
    });
    fireEvent.change(container.querySelector('[name="password"]'), {
      target: { value: "Password123!" },
    });
    fireEvent.change(container.querySelector('[name="confirmPassword"]'), {
      target: { value: "Password123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => expect(mocks.register).toHaveBeenCalledOnce());
    expect(mocks.register).toHaveBeenCalledWith({
      name: "María Pérez",
      email: "maria@example.com",
      password: "Password123!",
    });
    expect(setMode).toHaveBeenCalledWith("login");
  });

  it("does not submit when password confirmation differs", () => {
    const { container } = render(
      <MemoryRouter>
        <Register setMode={vi.fn()} />
      </MemoryRouter>,
    );

    fireEvent.change(container.querySelector('[name="name"]'), {
      target: { value: "María Pérez" },
    });
    fireEvent.change(container.querySelector('[name="email"]'), {
      target: { value: "maria@example.com" },
    });
    fireEvent.change(container.querySelector('[name="password"]'), {
      target: { value: "Password123!" },
    });
    fireEvent.change(container.querySelector('[name="confirmPassword"]'), {
      target: { value: "OtraPassword123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(mocks.register).not.toHaveBeenCalled();
  });
});
