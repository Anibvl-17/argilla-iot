import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProtectedRoute from "@components/ProtectedRoute";

const { authState } = vi.hoisted(() => ({
  authState: { user: null, loading: false },
}));

vi.mock("@context/AuthContext", () => ({
  useAuth: () => authState,
}));

function renderProtectedRoute(allowedRoles) {
  return render(
    <MemoryRouter initialEntries={["/private"]}>
      <Routes>
        <Route path="/auth" element={<p>Página de acceso</p>} />
        <Route path="/" element={<p>Inicio</p>} />
        <Route
          path="/private"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <p>Contenido privado</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    authState.user = null;
    authState.loading = false;
  });

  it("waits for authentication state before rendering protected content", () => {
    authState.loading = true;
    renderProtectedRoute();

    expect(screen.getByText("Cargando...")).toBeInTheDocument();
    expect(screen.queryByText("Contenido privado")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated visitors to the login page", () => {
    renderProtectedRoute();

    expect(screen.getByText("Página de acceso")).toBeInTheDocument();
  });

  it("redirects authenticated users without an allowed role", () => {
    authState.user = { id: 2, role: "CLIENT" };
    renderProtectedRoute(["ADMIN"]);

    expect(screen.getByText("Inicio")).toBeInTheDocument();
  });

  it("renders protected content for an allowed role", () => {
    authState.user = { id: 1, role: "ADMIN" };
    renderProtectedRoute(["ADMIN"]);

    expect(screen.getByText("Contenido privado")).toBeInTheDocument();
  });
});
