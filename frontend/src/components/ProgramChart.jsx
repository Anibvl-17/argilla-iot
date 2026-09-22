import { useEffect, useMemo, useRef } from "react";
import { useTheme } from "@context/ThemeContext";

function buildPoints(program) {
  let minutes = 0;
  const points = [
    {
      x: 0,
      y: program.configuration.initialTemperature,
      stage: "Temperatura inicial",
    },
  ];
  program.configuration.stages.forEach((stage, index) => {
    minutes += stage.durationMinutes;
    points.push({
      x: minutes,
      y: stage.targetTemperature,
      stage: `Etapa ${index + 1}`,
    });
  });
  return points;
}

export default function ProgramChart({ program }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const { theme } = useTheme();
  const points = useMemo(() => buildPoints(program), [program]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext?.("2d");
    if (!context) return undefined;
    let cancelled = false;

    async function renderChart() {
      const { default: Chart } = await import("chart.js/auto");
      if (cancelled) return;
      const styles = getComputedStyle(document.documentElement);
      const color = (name) => styles.getPropertyValue(name).trim();
      chartRef.current = new Chart(context, {
        type: "line",
        data: {
          datasets: [
            {
              label: "Temperatura objetivo",
              data: points,
              borderColor: color("--accent"),
              backgroundColor: color("--danger-soft"),
              pointBackgroundColor: color("--accent"),
              pointBorderColor: color("--surface"),
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              borderWidth: 3,
              fill: true,
              tension: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          interaction: { intersect: false, mode: "nearest" },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: ([item]) => item.raw.stage,
                label: (item) =>
                  `${item.parsed.y} °C a los ${item.parsed.x} min`,
              },
            },
          },
          scales: {
            x: {
              type: "linear",
              beginAtZero: true,
              title: {
                display: true,
                text: "Tiempo acumulado (min)",
                color: color("--secondary"),
              },
              ticks: { color: color("--muted") },
              grid: { color: color("--border") },
            },
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: "Temperatura (°C)",
                color: color("--secondary"),
              },
              ticks: { color: color("--muted") },
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
  }, [points, theme]);

  return (
    <div className="h-64 w-full sm:h-72">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Curva de temperatura del programa ${program.name}`}
      >
        Curva de temperatura del programa {program.name}.
      </canvas>
    </div>
  );
}
