import { describe, expect, it, vi } from "vitest";
import { loadModuleWithRefresh } from "../../src/utils/lazyWithRefresh";

function createEnvironment(initialEntries = []) {
  const values = new Map(initialEntries);
  return {
    storage: {
      getItem: vi.fn((key) => values.get(key) ?? null),
      setItem: vi.fn((key, value) => values.set(key, value)),
      removeItem: vi.fn((key) => values.delete(key)),
    },
    reload: vi.fn(),
  };
}

describe("loadModuleWithRefresh", () => {
  it("loads the module and clears a previous refresh marker", async () => {
    const environment = createEnvironment([
      ["argilla:chunk-refresh:history", "1"],
    ]);
    const module = { default: () => null };

    await expect(
      loadModuleWithRefresh(() => Promise.resolve(module), "history", environment),
    ).resolves.toBe(module);
    expect(environment.storage.removeItem).toHaveBeenCalledWith(
      "argilla:chunk-refresh:history",
    );
    expect(environment.reload).not.toHaveBeenCalled();
  });

  it("reloads once when a stale chunk cannot be loaded", async () => {
    const environment = createEnvironment();

    loadModuleWithRefresh(
      () => Promise.reject(new TypeError("Failed to fetch dynamically imported module")),
      "history",
      environment,
    );
    await Promise.resolve();

    expect(environment.storage.setItem).toHaveBeenCalledWith(
      "argilla:chunk-refresh:history",
      "1",
    );
    expect(environment.reload).toHaveBeenCalledOnce();
  });

  it("does not enter a reload loop when the refreshed load also fails", async () => {
    const environment = createEnvironment([
      ["argilla:chunk-refresh:history", "1"],
    ]);
    const error = new TypeError("Chunk unavailable");

    await expect(
      loadModuleWithRefresh(() => Promise.reject(error), "history", environment),
    ).rejects.toBe(error);
    expect(environment.reload).not.toHaveBeenCalled();
    expect(environment.storage.removeItem).toHaveBeenCalledWith(
      "argilla:chunk-refresh:history",
    );
  });
});
