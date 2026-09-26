import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@context/AuthContext";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    getCookie: vi.fn(),
    removeCookie: vi.fn(),
    jwtDecode: vi.fn(),
  },
}));

vi.mock("js-cookie", () => ({
  default: {
    get: mocks.getCookie,
    remove: mocks.removeCookie,
  },
}));

vi.mock("jwt-decode", () => ({
  jwtDecode: mocks.jwtDecode,
}));

function AuthProbe() {
  const { user, loading } = useAuth();

  if (loading) return <p>Cargando sesión</p>;
  return <p>{user ? `${user.name}:${user.role}` : "Sin sesión"}</p>;
}

function renderAuthProvider() {
  return render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>,
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCookie.mockReturnValue("stored-token");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("restores an authenticated user from a valid stored token", async () => {
    mocks.jwtDecode.mockReturnValue({
      id: 12,
      name: "Camila",
      email: "camila@example.com",
      role: "CLIENT",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    renderAuthProvider();

    expect(await screen.findByText("Camila:CLIENT")).toBeInTheDocument();
    expect(mocks.removeCookie).not.toHaveBeenCalled();
  });

  it("removes an expired stored token", async () => {
    mocks.jwtDecode.mockReturnValue({
      id: 12,
      name: "Camila",
      role: "CLIENT",
      exp: Math.floor(Date.now() / 1000) - 1,
    });

    renderAuthProvider();

    expect(await screen.findByText("Sin sesión")).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.removeCookie).toHaveBeenCalledWith("jwt-auth");
    });
  });

  it("removes a malformed stored token", async () => {
    mocks.jwtDecode.mockImplementation(() => {
      throw new Error("Malformed token");
    });

    renderAuthProvider();

    expect(await screen.findByText("Sin sesión")).toBeInTheDocument();
    expect(mocks.removeCookie).toHaveBeenCalledWith("jwt-auth");
  });
});
