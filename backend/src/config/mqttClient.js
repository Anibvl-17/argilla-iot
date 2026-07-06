import mqtt from "mqtt";
import { updateControllerTelemetry } from "../services/controller.service.js";
import { emitControllerTelemetry } from "../realtime/socket.js";

const MQTT_URL = process.env.MQTT_URL || "mqtt://localhost:1883";
const MQTT_USER = process.env.MQTT_USER || "";
const MQTT_PASS = process.env.MQTT_PASS || "";

function parsePayload(payloadBuffer) {
  const raw = payloadBuffer.toString();
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function connectMqtt() {
  const client = mqtt.connect(MQTT_URL, {
    username: MQTT_USER || undefined,
    password: MQTT_PASS || undefined,
    clientId: `backend-${Math.random().toString(16).slice(2, 10)}`,
    reconnectPeriod: 60000,
  });

  client.on("connect", () => {
    console.log("[MQTT] Conectado a", MQTT_URL);
    client.subscribe("controller/+/status", { qos: 1 });
    client.subscribe("controller/+/state", { qos: 1 });
    client.subscribe("controller/+/temperature", { qos: 0 });
  });

  client.on("message", async (topic, payloadBuffer) => {
    const [prefix, controllerId, type] = topic.split("/");
    if (prefix !== "controller" || !controllerId || !type) return;

    try {
      const payload = parsePayload(payloadBuffer);
      const data = {};

      if (type === "status" || type === "state") {
        const value = typeof payload === "string" ? payload : payload.cmd;
        if (value !== "ON" && value !== "OFF") return;
        data.operativeStatus = value;
      } else if (type === "temperature") {
        const value = typeof payload === "number" ? payload : payload.celsius;
        if (!Number.isFinite(value)) return;
        data.temp = value;
      } else {
        return;
      }

      const controller = await updateControllerTelemetry(controllerId, data);
      emitControllerTelemetry(controller.userId, {
        controllerCode: controller.controllerId.slice(-6),
        operativeStatus: controller.operativeStatus,
        temp: controller.temp,
      });
    } catch (error) {
      console.error(`[MQTT] Error procesando ${topic}:`, error.message);
    }
  });

  client.on("error", (error) => {
    console.error("[MQTT] Error de conexión:", error.message);
  });

  return client;
}
