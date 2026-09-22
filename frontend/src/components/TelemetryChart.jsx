import { useEffect, useMemo, useRef } from "react";
import { useTheme } from "@context/ThemeContext";

function buildPoints(telemetry, field) {
  if (!telemetry.length) return [];
  const startedAt = new Date(telemetry[0].timestamp).getTime();
  return telemetry.map((sample) => ({
    x: Math.max(0, (new Date(sample.timestamp).getTime() - startedAt) / 60_000),
    y: sample[field],
    timestamp: sample.timestamp,
  }));
}

export default function TelemetryChart({ telemetry }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const { theme } = useTheme();
  const samples = useMemo(
    () =>
      [...telemetry].sort((a, b) => {
        const sequenceDifference =
          (a.sampleSequence ?? 0) - (b.sampleSequence ?? 0);
        return (
          sequenceDifference || new Date(a.timestamp) - new Date(b.timestamp)
        );
      }),
    [telemetry],
  );

  useEffect(() => {
    const context = canvasRef.current?.getContext?.("2d");
    if (!context || !samples.length) return undefined;
    let cancelled = false;

    async function renderChart() {
      const { default: Chart } = await import("chart.js/auto");
      if (cancelled) return;
      const styles = getComputedStyle(document.documentElement);
      const color = (name) => styles.getPropertyValue(name).trim();
      const realTemperature = buildPoints(samples, "temperature");
      const setpoint = buildPoints(samples, "setpointTemperature");

      chartRef.current = new Chart(context, {
        type: "line",
        data: {
          datasets: [
            {
              label: "Temperatura real",
              data: realTemperature,
              borderColor: color("--accent"),
              backgroundColor: color("--accent"),
              pointRadius: 2,
              pointHoverRadius: 5,
              borderWidth: 2,
              tension: 0.2,
            },
            {
              label: "Setpoint",
              data: setpoint,
              borderColor: color("--info"),
              backgroundColor: color("--info"),
              pointRadius: 2,
              pointHoverRadius: 5,
              borderWidth: 2,
              tension: 0.2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          interaction: { intersect: false, mode: "index" },
          plugins: {
            legend: {
              position: "top",
              align: "start",
              labels: {
                color: color("--secondary"),
                usePointStyle: true,
                boxWidth: 8,
                boxHeight: 8,
              },
            },
            tooltip: {
              callbacks: {
                title: ([item]) =>
                  new Date(item.raw.timestamp).toLocaleString("es-CL"),
                label: (item) =>
                  `${item.dataset.label}: ${item.parsed.y.toFixed(1)} °C`,
              },
            },
          },
          scales: {
            x: {
              type: "linear",
              beginAtZero: true,
              title: {
                display: true,
                text: "Tiempo transcurrido (min)",
                color: color("--secondary"),
              },
              ticks: { color: color("--muted"), maxTicksLimit: 6 },
              grid: { color: color("--border") },
            },
            y: {
              title: {
                display: true,
                text: "Temperatura (°C)",
                color: color("--secondary"),
              },
              ticks: { color: color("--muted"), maxTicksLimit: 6 },
              grid: { color: color("--border") },
            },
          },
        },
      });
    }

    void renderChart();
    return () => {
      cancelled = true;
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [samples, theme]);

  if (!samples.length) return null;
  return (
    <div className="h-56 w-full sm:h-64">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Temperatura real y setpoint del ciclo a través del tiempo"
      >
        Gráfico de temperatura real y setpoint del ciclo.
      </canvas>
    </div>
  );
}
