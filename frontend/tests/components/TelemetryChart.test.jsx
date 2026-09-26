import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TelemetryChart from "@components/TelemetryChart";
import { ThemeProvider } from "@context/ThemeContext";

const chartMocks = vi.hoisted(() => ({
  configurations: [],
  destroy: vi.fn(),
}));

vi.mock("chart.js/auto", () => ({
  default: class Chart {
    constructor(_context, configuration) {
      chartMocks.configurations.push(configuration);
    }

    destroy() {
      chartMocks.destroy();
    }
  },
}));

const telemetry = [
  {
    sampleSequence: 0,
    timestamp: "2026-09-22T20:00:00.000Z",
    temperature: 20,
    setpointTemperature: 20,
  },
  {
    sampleSequence: 1,
    timestamp: "2026-09-22T20:10:00.000Z",
    temperature: 100,
    setpointTemperature: 120,
  },
];

describe("TelemetryChart", () => {
  beforeEach(() => {
    chartMocks.configurations.length = 0;
    chartMocks.destroy.mockClear();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows horizontal scrolling on small screens and only shows points on hover", async () => {
    render(
      <ThemeProvider>
        <TelemetryChart telemetry={telemetry} />
      </ThemeProvider>,
    );

    const canvas = screen.getByRole("img", {
      name: "Temperatura real y setpoint del ciclo a través del tiempo",
    });
    expect(canvas.parentElement).toHaveClass("min-w-xl", "sm:min-w-0");
    expect(canvas.parentElement.parentElement).toHaveClass("overflow-x-auto");

    await waitFor(() => expect(chartMocks.configurations).toHaveLength(1));
    const datasets = chartMocks.configurations[0].data.datasets;
    datasets.forEach((dataset) => {
      expect(dataset.pointRadius).toBe(0);
      expect(dataset.pointHoverRadius).toBe(5);
    });
  });
});
