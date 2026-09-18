import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminHome } from "./AdminHome";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    getAdminSummary: vi.fn(),
  },
}));

vi.mock("@services/admin.service", () => ({
  getAdminSummary: mocks.getAdminSummary,
}));
vi.mock("@hooks/useAdminSummaryRealtime", () => ({
  useAdminSummaryRealtime: vi.fn(),
}));

describe("AdminHome", () => {
  beforeEach(() => {
    mocks.getAdminSummary.mockResolvedValue({
      success: true,
      data: {
        kilns: { total: 0, withOwner: 0, operational: 0, outOfService: 0 },
        controllers: {
          total: 0,
          withOwner: 0,
          operational: 0,
          outOfService: 0,
        },
        users: { total: 9, administrators: 2, technicians: 3, clients: 4 },
      },
    });
  });

  it("shows the administrator count in the user summary", async () => {
    render(
      <MemoryRouter>
        <AdminHome />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Administradores")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
