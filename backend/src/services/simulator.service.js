import mqtt from "mqtt";
import { prisma } from "../config/prisma.js";

const MQTT_URL = process.env.MQTT_URL || "mqtt://localhost:1883";
const MQTT_USER = process.env.MQTT_USER || "";
const MQTT_PASS = process.env.MQTT_PASS || "";

const TEMP_INTERVAL_MS = parsePositiveInt(
  process.env.SIMULATOR_TEMP_INTERVAL_MS,
  5000,
);
const REFRESH_MS = parsePositiveInt(process.env.SIMULATOR_REFRESH_MS, 15000);
const TEMP_MIN = parseFiniteNumber(process.env.SIMULATOR_TEMP_MIN, 20);
const TEMP_MAX = parseFiniteNumber(process.env.SIMULATOR_TEMP_MAX, 1240);
const TEMP_START = parseFiniteNumber(process.env.SIMULATOR_TEMP_START, 25);

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseFiniteNumber(value, fallback) {
  const parsed = Number.parseFloat(value || "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundTemperature(value) {
  return Math.round(value * 100) / 100;
}

function parseCommand(payloadBuffer) {
  const raw = payloadBuffer.toString();

  try {
    const parsed = JSON.parse(raw);
    return String(parsed.command || "").toUpperCase();
  } catch {
    return raw.trim().toUpperCase();
  }
}

async function getRegisteredControllerIds() {
  const controllers = await prisma.controller.findMany({
    select: { controllerId: true, temp: true, operativeStatus: true },
  });

  return controllers;
}

class ControllerSimulator {
  constructor(controller) {
    this.controllerId = controller.controllerId;
    this.currentTemp =
      typeof controller.temp === "number" ? controller.temp : TEMP_START;
    this.relayState =
      controller.operativeStatus === "ON" ||
      controller.operativeStatus === "OFF"
        ? controller.operativeStatus
        : "OFF";
    this.tempTimer = null;
    this.shuttingDown = false;

    this.topics = {
      temp: `controller/${this.controllerId}/temp`,
      cmd: `controller/${this.controllerId}/cmd`,
      status: `controller/${this.controllerId}/status`,
      state: `controller/${this.controllerId}/state`,
    };

    this.client = mqtt.connect(MQTT_URL, {
      username: MQTT_USER || undefined,
      password: MQTT_PASS || undefined,
      clientId: `esp32-sim-${this.controllerId}-${Math.random().toString(16).slice(2, 8)}`,
      reconnectPeriod: 3000,
      connectTimeout: 10000,
      will: {
        topic: this.topics.status,
        payload: JSON.stringify({
          deviceId: this.controllerId,
          status: "offline",
        }),
        qos: 1,
        retain: true,
      },
    });

    this.bindEvents();
  }

  bindEvents() {
    this.client.on("connect", () => {
      console.log(`[SIM:${this.controllerId}] Conectado a ${MQTT_URL}`);

      this.publishStatus("online");
      this.client.subscribe(this.topics.cmd, { qos: 1 }, (error) => {
        if (error) {
          console.error(
            `[SIM:${this.controllerId}] Error al suscribirse a ${this.topics.cmd}:`,
            error.message,
          );
        }
      });

      this.startTemperatureLoop();
    });

    this.client.on("message", (topic, payloadBuffer) => {
      if (topic !== this.topics.cmd) return;

      const command = parseCommand(payloadBuffer);

      if (command !== "ON" && command !== "OFF") {
        console.warn(
          `[SIM:${this.controllerId.slice(-6)}] Comando desconocido recibido: "${payloadBuffer.toString()}"`,
        );
        return;
      }

      this.relayState = command;
      this.publishRelayState();
      console.log(
        `[SIM:${this.controllerId.slice(-6)}] Comando recibido -> ${command}`,
      );
    });

    this.client.on("error", (error) => {
      if (this.shuttingDown) return;
      console.error(
        `[SIM:${this.controllerId}] Error MQTT:`,
        error.message || "broker no disponible",
      );
    });

    this.client.on("reconnect", () => {
      if (this.shuttingDown) return;
      console.log(
        `[SIM:${this.controllerId.slice(-6)}] Reconectando al broker...`,
      );
    });

    this.client.on("close", () => {
      if (this.shuttingDown) return;
      console.log(`[SIM:${this.controllerId.slice(-6)}] Conexión cerrada.`);
    });
  }

  startTemperatureLoop() {
    if (this.tempTimer) clearInterval(this.tempTimer);
    this.tempTimer = setInterval(
      () => this.publishTemperature(),
      TEMP_INTERVAL_MS,
    );
    this.publishTemperature();
  }

  publishStatus(status) {
    this.client.publish(
      this.topics.status,
      JSON.stringify({ deviceId: this.controllerId, status }),
      { qos: 1, retain: true },
    );
  }

  publishRelayState() {
    this.client.publish(
      this.topics.state,
      JSON.stringify({
        deviceId: this.controllerId,
        relayState: this.relayState,
        timestamp: new Date().toISOString(),
      }),
      { qos: 1 },
    );
  }

  publishTemperature() {
    const drift = (Math.random() - 0.5) * 0.6;
    const trend = this.relayState === "ON" ? 0.4 : -0.3;

    this.currentTemp += drift + trend;
    this.currentTemp = Math.min(TEMP_MAX, Math.max(TEMP_MIN, this.currentTemp));

    const payload = {
      deviceId: this.controllerId,
      value: roundTemperature(this.currentTemp),
      unit: "C",
      relayState: this.relayState,
      timestamp: new Date().toISOString(),
    };

    this.client.publish(
      this.topics.temp,
      JSON.stringify(payload),
      { qos: 1 },
      (error) => {
        if (error) {
          console.error(
            `[SIM:${this.controllerId.slice(-6)}] Error al publicar temperatura:`,
            error.message,
          );
          return;
        }

        console.log(
          `[SIM:${this.controllerId.slice(-6)}] Temp ${payload.value}°C (relay: ${this.relayState})`,
        );
      },
    );
  }

  stop() {
    if (this.shuttingDown) return Promise.resolve();
    this.shuttingDown = true;

    if (this.tempTimer) clearInterval(this.tempTimer);
    this.client.removeAllListeners("reconnect");
    this.client.removeAllListeners("error");

    return new Promise((resolve) => {
      let settled = false;
      const resolveOnce = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const finish = () => {
        this.client.end(false, resolveOnce);
      };

      const forceFinish = () => {
        this.client.end(true, resolveOnce);
      };

      if (!this.client.connected) {
        forceFinish();
        return;
      }

      this.client.publish(
        this.topics.status,
        JSON.stringify({ deviceId: this.controllerId, status: "offline" }),
        { qos: 1, retain: true },
        finish,
      );

      setTimeout(forceFinish, 2000).unref();
    });
  }
}

export class SimulatorService {
  constructor() {
    this.controllers = new Map();
    this.refreshTimer = null;
    this.shuttingDown = false;
  }

  async start() {
    console.log("[SIM] Iniciando simulador MQTT");
    console.log("[SIM] Broker:", MQTT_URL);
    await this.syncControllers();

    this.refreshTimer = setInterval(() => {
      this.syncControllers().catch((error) => {
        console.error(
          "[SIM] Error al sincronizar controladores:",
          error.message,
        );
      });
    }, REFRESH_MS);
  }

  async syncControllers() {
    if (this.shuttingDown) return;

    const registeredControllers = await getRegisteredControllerIds();
    const registeredIds = new Set(
      registeredControllers.map((controller) => controller.controllerId),
    );

    for (const controller of registeredControllers) {
      if (this.controllers.has(controller.controllerId)) continue;

      const simulator = new ControllerSimulator(controller);
      this.controllers.set(controller.controllerId, simulator);
      console.log(`[SIM] Controlador agregado: ${controller.controllerId}`);
    }

    const stopTasks = [];
    for (const [controllerId, simulator] of this.controllers.entries()) {
      if (registeredIds.has(controllerId)) continue;

      console.log(`[SIM] Controlador eliminado: ${controllerId}`);
      this.controllers.delete(controllerId);
      stopTasks.push(simulator.stop());
    }

    await Promise.allSettled(stopTasks);
  }

  async stop() {
    if (this.shuttingDown) return;
    this.shuttingDown = true;

    console.log("\n[SIM] Cerrando simulador MQTT...");
    if (this.refreshTimer) clearInterval(this.refreshTimer);

    const stopTasks = Array.from(this.controllers.values()).map((simulator) =>
      simulator.stop(),
    );
    this.controllers.clear();

    await Promise.allSettled(stopTasks);
    await prisma.$disconnect();
    console.log("[SIM] Simulador detenido.");
  }
}
