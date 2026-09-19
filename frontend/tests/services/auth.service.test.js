import { beforeEach, describe, expect, it, vi } from "vitest";
import cookies from "js-cookie";
import axios from "../../src/services/root.service.js";
import { logout } from "../../src/services/auth.service.js";

vi.mock("js-cookie", () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("../../src/services/root.service.js", () => ({
  default: {
    post: vi.fn(),
  },
}));

describe("logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes the local token when the backend request fails", async () => {
    axios.post.mockRejectedValueOnce(new Error("Servidor no disponible"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await logout();

    expect(cookies.remove).toHaveBeenCalledWith("jwt-auth", { path: "/" });
    consoleError.mockRestore();
  });
});
