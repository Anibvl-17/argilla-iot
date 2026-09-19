import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Register from "./Register";

const mocks = vi.hoisted(() => ({ register: vi.fn() }));

vi.mock("@context/AuthContext", () => ({
  useAuth: () => ({ loading: false, user: null }),
}));
vi.mock("@services/auth.service", () => ({ register: mocks.register }));
vi.mock("@hooks/useUserContactCatalog", () => ({
  default: () => ({
    catalog: {
      countries: [
        { countryId: 1, isoCode: "AR", name: "Argentina", callingCode: "+54" },
        { countryId: 2, isoCode: "CL", name: "Chile", callingCode: "+56" },
      ],
      regions: [],
    },
    loading: false,
    error: "",
    retry: vi.fn(),
  }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

describe("Register", () => {
  it("includes the selected country id in public registration", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: "País" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar país" }), {
      target: { value: "Argentina" },
    });
    fireEvent.click(screen.getByRole("option", { name: "Argentina" }));
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => expect(mocks.register).toHaveBeenCalledOnce());
    expect(mocks.register).toHaveBeenCalledWith(
      expect.objectContaining({
        countryId: 1,
        regionId: null,
        communeId: null,
      }),
    );
    expect(setMode).toHaveBeenCalledWith("login");
  });
});
