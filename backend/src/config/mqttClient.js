import mqtt from "mqtt";
import {
  updateControllerConnectionStatus,
  updateControllerOperativeStatus,
  updateControllerTelemetry,
} from "../services/controller.service.js";
import {
  emitAdminSummary,
  emitControllerTelemetry,
} from "../realtime/socket.js";

const MQTT_URL = process.env.MQTT_URL || "mqtt://localhost:1883";
const MQTT_USER = process.env.MQTT_USER || "";
const MQTT_PASS = process.env.MQTT_PASS || "";
const parsedCommandTimeoutMs = Number.parseInt(
  process.env.MQTT_COMMAND_TIMEOUT_MS || "6000",
  10,
);
const COMMAND_TIMEOUT_MS = Number.isFinite(parsedCommandTimeoutMs)
  ? parsedCommandTimeoutMs
  : 6000;
const MIN_TEMPERATURE_C = -50;
const MAX_TEMPERATURE_C = 1400;

let mqttClient;
let unregisteredControllerFound = false;
const pendingCommands = new Map();

function parsePayload(payloadBuffer) {
  const raw = payloadBuffer.toString();
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function parseTempPayload(controllerId, payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const value = Number(payload.value);
  const relayState = String(payload.relayState || "").toUpperCase();
  const deviceId = String(payload.deviceId || "");
  const timestamp = payload.timestamp ? new Date(payload.timestamp) : null;

  if (deviceId && deviceId !== controllerId) return null;
  if (!Number.isFinite(value)) return null;
  if (value < MIN_TEMPERATURE_C || value > MAX_TEMPERATURE_C) return null;
  if (relayState !== "ON" && relayState !== "OFF") return null;
  if (timestamp && Number.isNaN(timestamp.getTime())) return null;

  return {
    temp: value,
    operativeStatus: relayState,
  };
}

function parseStatusPayload(controllerId, payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const deviceId = String(payload.deviceId || "");
  const status = String(payload.status || "").toUpperCase();

  if (deviceId && deviceId !== controllerId) return null;
  if (status !== "ONLINE" && status !== "OFFLINE") return null;

  return status;
}

function parseRelayStatePayload(controllerId, payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const deviceId = String(payload.deviceId || "");
  const relayState = String(
    payload.relayState || payload.operativeStatus || payload.state || "",
  ).toUpperCase();

  if (deviceId && deviceId !== controllerId) return null;
  if (relayState !== "ON" && relayState !== "OFF") return null;

  return relayState;
}

function settlePendingCommand(controllerId, operativeStatus) {
  const pending = pendingCommands.get(controllerId);
  if (!pending || pending.command !== operativeStatus) return;

  clearTimeout(pending.timer);
  pendingCommands.delete(controllerId);
  pending.resolve({ controllerId, command: operativeStatus, confirmed: true });
}

function toTelemetryEvent(controller) {
  return {
    controllerId: controller.controllerId,
    controllerCode: controller.controllerId.slice(-6),
    kilnId: controller.kiln?.kilnId ?? null,
    operativeStatus: controller.operativeStatus,
    connectionStatus: controller.connectionStatus,
    temp: controller.temp,
    telemetrySaved: Boolean(controller.telemetrySaved),
  };
}

export function connectMqtt() {
  const client = mqtt.connect(MQTT_URL, {
    username: MQTT_USER || undefined,
    password: MQTT_PASS || undefined,
    clientId: `backend-${Math.random().toString(16).slice(2, 10)}`,
    reconnectPeriod: 60000,
  });
  mqttClient = client;

  client.on("connect", () => {
    console.log("[MQTT] Conectado a", MQTT_URL);
    client.subscribe("controller/+/status", { qos: 1 });
    client.subscribe("controller/+/state", { qos: 1 });
    client.subscribe("controller/+/temp", { qos: 1 });
  });

  client.on("message", async (topic, payloadBuffer) => {
    const [prefix, controllerId, type] = topic.split("/");
    if (prefix !== "controller" || !controllerId || !type) return;

    try {
      const payload = parsePayload(payloadBuffer);

      if (type === "temp") {
        const data = parseTempPayload(controllerId, payload);
        if (!data) return;

        const controller = await updateControllerTelemetry(controllerId, data);
        emitControllerTelemetry(
          controller.userId,
          toTelemetryEvent(controller),
        );
        if (data.operativeStatus) {
          settlePendingCommand(controllerId, data.operativeStatus);
          void emitAdminSummary();
        }
        return;
      }

      if (type === "state") {
        const operativeStatus = parseRelayStatePayload(controllerId, payload);
        if (!operativeStatus) return;

        const controller = await updateControllerOperativeStatus(
          controllerId,
          operativeStatus,
        );
        emitControllerTelemetry(
          controller.userId,
          toTelemetryEvent(controller),
        );
        settlePendingCommand(controllerId, operativeStatus);
        void emitAdminSummary();
        return;
      }

      if (type === "status") {
        const connectionStatus = parseStatusPayload(controllerId, payload);
        if (!connectionStatus) return;

        const controller = await updateControllerConnectionStatus(
          controllerId,
          connectionStatus,
        );
        emitControllerTelemetry(
          controller.userId,
          toTelemetryEvent(controller),
        );
        void emitAdminSummary();
        return;
      }
    } catch (error) {
      if (error.code === "P2025") {
        if (!unregisteredControllerFound) {
          console.warn(
            `[MQTT] Info: se ignoran publicaciones de controladores no registrados`,
          );
          unregisteredControllerFound = true;
        }
        return;
      }
      console.error(`[MQTT] Error procesando ${topic}:`, error.message);
    }
  });

  client.on("error", (error) => {
    console.error("[MQTT] Error de conexión:", error.message);
  });

  return client;
}

export function publishControllerCommand(controllerId, command) {
  const normalizedCommand = String(command || "").toUpperCase();

  if (normalizedCommand !== "ON" && normalizedCommand !== "OFF") {
    return Promise.reject(new Error("Comando no soportado"));
  }

  if (!mqttClient) {
    return Promise.reject(new Error("Cliente MQTT no inicializado"));
  }

  if (pendingCommands.has(controllerId)) {
    const error = new Error(
      "Ya existe un comando pendiente para este controlador",
    );
    error.code = "MQTT_COMMAND_PENDING";
    return Promise.reject(error);
  }

  const topic = `controller/${controllerId}/cmd`;
  const payload = JSON.stringify({ command: normalizedCommand });

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingCommands.delete(controllerId);
      const error = new Error(
        "El controlador no confirmó el comando dentro del tiempo esperado",
      );
      error.code = "MQTT_COMMAND_TIMEOUT";
      reject(error);
    }, COMMAND_TIMEOUT_MS);

    pendingCommands.set(controllerId, {
      command: normalizedCommand,
      resolve,
      timer,
    });

    mqttClient.publish(topic, payload, { qos: 1 }, (error) => {
      if (!error) return;

      clearTimeout(timer);
      pendingCommands.delete(controllerId);
      reject(error);
    });
  });
}
