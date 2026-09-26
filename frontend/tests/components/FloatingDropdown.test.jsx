import { useRef } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FloatingDropdown from "@components/FloatingDropdown";

function DropdownHarness({ constrained = false }) {
  const anchorRef = useRef(null);
  const content = (
    <>
      <button ref={anchorRef} type="button">
        Abrir
      </button>
      <FloatingDropdown
        anchorRef={anchorRef}
        open
        minWidth={280}
        maxHeight={288}
      >
        <p>Opciones</p>
      </FloatingDropdown>
    </>
  );

  return constrained ? (
    <div data-floating-dropdown-boundary>{content}</div>
  ) : (
    content
  );
}

describe("FloatingDropdown", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("opens upward and stays inside the viewport when space below is limited", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 700,
      bottom: 740,
      left: 250,
      right: 330,
      width: 80,
      height: 40,
      x: 250,
      y: 700,
      toJSON: () => ({}),
    });
    vi.stubGlobal("innerWidth", 320);
    vi.stubGlobal("innerHeight", 800);

    render(<DropdownHarness />);

    const dropdown = (await screen.findByText("Opciones")).parentElement;
    await waitFor(() => expect(dropdown.style.bottom).toBe("104px"));
    expect(dropdown.style.top).toBe("");
    expect(dropdown.style.left).toBe("28px");
    expect(dropdown.style.maxHeight).toBe("288px");
  });

  it("does not extend above the enclosing content boundary", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function getRect() {
        if (this.hasAttribute("data-floating-dropdown-boundary")) {
          return {
            top: 132,
            bottom: 500,
            left: 0,
            right: 320,
            width: 320,
            height: 368,
            x: 0,
            y: 132,
            toJSON: () => ({}),
          };
        }

        return {
          top: 300,
          bottom: 340,
          left: 30,
          right: 110,
          width: 80,
          height: 40,
          x: 30,
          y: 300,
          toJSON: () => ({}),
        };
      },
    );
    vi.stubGlobal("innerWidth", 320);
    vi.stubGlobal("innerHeight", 500);

    render(<DropdownHarness constrained />);

    const dropdown = (await screen.findByText("Opciones")).parentElement;
    await waitFor(() => expect(dropdown.style.bottom).toBe("204px"));
    expect(dropdown.style.maxHeight).toBe("152px");
  });
});
