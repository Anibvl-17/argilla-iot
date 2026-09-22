export const FIRING_PROTOCOL_VERSION = 2;
export const HISTORICAL_TELEMETRY_INTERVAL_MS = 10 * 60 * 1000;
export const MIN_TEMPERATURE_C = -20;
export const MAX_TEMPERATURE_C = 1300;
export const MAX_START_TEMPERATURE_C = 35;

export const GLOBAL_PROGRAMS = [
  {
    name: "Bizcocho",
    description:
      "Quema inicial para cocer la arcilla seca y preparar las piezas para el esmaltado.",
    configuration: {
      schemaVersion: 1,
      initialTemperature: 20,
      stages: [
        { durationMinutes: 30, targetTemperature: 100 },
        { durationMinutes: 120, targetTemperature: 350 },
        { durationMinutes: 120, targetTemperature: 650 },
        { durationMinutes: 120, targetTemperature: 950 },
        { durationMinutes: 10, targetTemperature: 950 },
      ],
    },
  },
  {
    name: "Cono 6 (Gres)",
    description:
      "Quema de gres y esmaltes de temperatura media-alta, con mantenciones a 573 °C y 1240 °C.",
    configuration: {
      schemaVersion: 1,
      initialTemperature: 20,
      stages: [
        { durationMinutes: 30, targetTemperature: 100 },
        { durationMinutes: 120, targetTemperature: 350 },
        { durationMinutes: 120, targetTemperature: 573 },
        { durationMinutes: 60, targetTemperature: 573 },
        { durationMinutes: 120, targetTemperature: 950 },
        { durationMinutes: 120, targetTemperature: 1240 },
        { durationMinutes: 10, targetTemperature: 1240 },
      ],
    },
  },
  {
    name: "Cono 6",
    description:
      "Quema para pastas y esmaltes de temperatura media, con calentamiento progresivo hasta 1212 °C y una breve mantención final.",
    configuration: {
      schemaVersion: 1,
      initialTemperature: 10,
      stages: [
        { durationMinutes: 80, targetTemperature: 120 },
        { durationMinutes: 80, targetTemperature: 250 },
        { durationMinutes: 150, targetTemperature: 600 },
        { durationMinutes: 150, targetTemperature: 1000 },
        { durationMinutes: 80, targetTemperature: 1160 },
        { durationMinutes: 45, targetTemperature: 1212 },
        { durationMinutes: 3, targetTemperature: 1212 },
      ],
    },
  },
  {
    name: "Cono 7",
    description:
      "Quema para pastas y esmaltes que requieren mayor maduración térmica, con calentamiento progresivo hasta 1230 °C y una breve mantención final.",
    configuration: {
      schemaVersion: 1,
      initialTemperature: 10,
      stages: [
        { durationMinutes: 80, targetTemperature: 120 },
        { durationMinutes: 80, targetTemperature: 250 },
        { durationMinutes: 150, targetTemperature: 600 },
        { durationMinutes: 150, targetTemperature: 1000 },
        { durationMinutes: 80, targetTemperature: 1160 },
        { durationMinutes: 50, targetTemperature: 1230 },
        { durationMinutes: 3, targetTemperature: 1230 },
      ],
    },
  },
  {
    name: "Quema de Prueba",
    description: "Programa de quema para probar el estado tu horno.",
    configuration: {
      schemaVersion: 1,
      initialTemperature: 20,
      stages: [{ durationMinutes: 1, targetTemperature: 1240 }],
    },
  },
];

export const GLOBAL_PROGRAM_NAMES = GLOBAL_PROGRAMS.map(({ name }) => name);

export const ACTIVE_FIRING_STATUSES = ["RUNNING", "PAUSED"];
export const TERMINAL_FIRING_STATUSES = [
  "COMPLETED",
  "CANCELLED",
  "ERROR",
  "UNKNOWN",
];

export const FIRING_COMMANDS = {
  START_PROGRAM: "START_PROGRAM",
  PAUSE: "PAUSE",
  RESUME: "RESUME",
  CANCEL: "CANCEL",
};
