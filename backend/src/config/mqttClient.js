import mqtt from "mqtt";
import {
  updateControllerConnectionStatus,
  updateControllerSwitchState,
  updateControllerTelemetry,
  receivePairingPin,
} from "../services/controller.service.js";
import {
  emitAdminSummary,
  emitControllerTelemetry,
  emitFiringCycle,
} from "../realtime/socket.js";
import { prisma } from "./prisma.js";
import {
  applyControllerSelection,
  hasFinalSample,
  persistControllerSample,
  resolveCycleConflictAsUnknown,
  upsertControllerCycle,
} from "../services/firing.service.js";
import {
  FIRING_PROTOCOL_VERSION,
  HISTORICAL_TELEMETRY_INTERVAL_MS,
  MAX_TEMPERATURE_C as FIRING_MAX_TEMPERATURE_C,
  MIN_TEMPERATURE_C as FIRING_MIN_TEMPERATURE_C,
  TERMINAL_FIRING_STATUSES,
} from "../constants/firing.constants.js";

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
const pendingFiringCommands = new Map();
const pendingCommandByController = new Map();
const pendingSelectionByController = new Set();
const recentFiringResults = new Map();
const reconciledControllers = new Set();
const unresolvedControllers = new Set();
const controllersAwaitingCatalogSync = new Set();
const bufferedSamples = new Map();
const pendingTerminalSnapshots = new Map();
const cycleConflicts = new Map();
const MAX_BUFFERED_SAMPLES_PER_CYCLE = 1000;
const MAX_BUFFERED_CYCLES = 100;
const RECENT_RESULT_TTL_MS = 60_000;

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
    temperature: value,
    relayState,
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
    payload.relayState || payload.switchState || payload.state || "",
  ).toUpperCase();

  if (deviceId && deviceId !== controllerId) return null;
  if (relayState !== "ON" && relayState !== "OFF") return null;

  return relayState;
}

function parsePairingPinPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return null;
  const pin = String(payload.pin || "");
  const deviceSecret = String(payload.deviceSecret || "");
  if (!/^\d{6}$/.test(pin) || !deviceSecret) return null;
  return { pin, deviceSecret };
}

function publishPairingStatus(controllerId, data) {
  if (!mqttClient) return;
  mqttClient.publish(
    `controller/${controllerId}/pairing-status`,
    JSON.stringify(data),
    { qos: 1, retain: false },
  );
}

function firingTopic(controllerId, suffix) {
  return `controller/${controllerId}/firing/${suffix}`;
}

async function assertFiringEnvelope(controllerId, payload) {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    payload.protocolVersion !== FIRING_PROTOCOL_VERSION ||
    payload.deviceId !== controllerId
  ) {
    const error = new Error("Envelope de quema inválido");
    error.code = "INVALID_FIRING_ENVELOPE";
    throw error;
  }
  const registered = await prisma.controller.findUnique({
    where: { controllerId },
    select: { controllerId: true },
  });
  if (!registered) {
    const error = new Error("Controlador no registrado");
    error.code = "P2025";
    throw error;
  }
}

function assertHistoricalSample(sample) {
  const temperature = Number(sample?.temperature);
  const setpoint = Number(sample?.setpointTemperature);
  const voltage = Number(sample?.voltage);
  const current = Number(sample?.current);
  if (
    !sample?.controllerCycleId ||
    !Number.isInteger(Number(sample.sampleSequence)) ||
    Number(sample.sampleSequence) < 0 ||
    !["INITIAL", "PERIODIC", "FINAL"].includes(sample.sampleType) ||
    !Number.isFinite(temperature) ||
    temperature < FIRING_MIN_TEMPERATURE_C ||
    temperature > FIRING_MAX_TEMPERATURE_C ||
    !Number.isFinite(setpoint) ||
    setpoint < FIRING_MIN_TEMPERATURE_C ||
    setpoint > FIRING_MAX_TEMPERATURE_C ||
    !Number.isFinite(voltage) ||
    !Number.isFinite(current) ||
    typeof sample.switchState !== "boolean" ||
    Number.isNaN(Date.parse(sample.timestamp))
  ) {
    const error = new Error("Muestra histórica inválida");
    error.code = "INVALID_FIRING_SAMPLE";
    throw error;
  }
}

function publishJson(topic, payload, options = { qos: 1 }) {
  return new Promise((resolve, reject) => {
    if (!mqttClient?.connected) {
      const error = new Error("Cliente MQTT no conectado");
      error.code = "MQTT_NOT_CONNECTED";
      reject(error);
      return;
    }
    mqttClient.publish(topic, JSON.stringify(payload), options, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function requestControllerState(controllerId) {
  if (!mqttClient?.connected) return;
  mqttClient.publish(
    firingTopic(controllerId, "state-request"),
    JSON.stringify({
      protocolVersion: FIRING_PROTOCOL_VERSION,
      deviceId: controllerId,
      timestamp: new Date().toISOString(),
      requestedAt: new Date().toISOString(),
    }),
    { qos: 1 },
  );
}

function requestCycleRecovery(controllerId, controllerCycleId) {
  if (!mqttClient?.connected) return;
  mqttClient.publish(
    firingTopic(controllerId, "recovery-request"),
    JSON.stringify({
      protocolVersion: FIRING_PROTOCOL_VERSION,
      deviceId: controllerId,
      controllerCycleId,
      timestamp: new Date().toISOString(),
      requestedAt: new Date().toISOString(),
    }),
    { qos: 1 },
  );
}

function requestControllerSync(controllerId) {
  if (!mqttClient?.connected) return;
  mqttClient.publish(
    firingTopic(controllerId, "sync-request"),
    JSON.stringify({
      protocolVersion: FIRING_PROTOCOL_VERSION,
      deviceId: controllerId,
      timestamp: new Date().toISOString(),
    }),
    { qos: 1 },
  );
}

function firingEvent(controllerId, controller, extra = {}) {
  return {
    controllerId,
    controllerCode: controllerId.slice(-6),
    kilnId: controller?.kiln?.kilnId ?? null,
    ...extra,
  };
}

async function setActivityFromCycle(controllerId, status) {
  const activityStatus =
    status === "RUNNING"
      ? "FIRING"
      : status === "PAUSED"
        ? "PAUSED"
        : status === "ERROR"
          ? "ERROR"
          : "IDLE";
  return prisma.controller.update({
    where: { controllerId },
    data: { activityStatus },
    select: {
      userId: true,
      kiln: { select: { kilnId: true } },
    },
  });
}

function bufferSample(controllerId, sample) {
  const cycleId = sample.controllerCycleId;
  const bufferKey = `${controllerId}:${cycleId}`;
  if (
    !bufferedSamples.has(bufferKey) &&
    bufferedSamples.size >= MAX_BUFFERED_CYCLES
  ) {
    requestControllerSync(controllerId);
    return;
  }
  const current = bufferedSamples.get(bufferKey) || [];
  if (current.length < MAX_BUFFERED_SAMPLES_PER_CYCLE) {
    const duplicate = current.some(
      (item) => item.sampleSequence === sample.sampleSequence,
    );
    if (!duplicate) current.push(sample);
    bufferedSamples.set(bufferKey, current);
  } else {
    requestControllerSync(controllerId);
  }
  requestControllerState(controllerId);
}

async function acknowledgeSamples(controllerId, controllerCycleId, sequences) {
  if (!sequences.length || !mqttClient?.connected) return;
  await publishJson(firingTopic(controllerId, "sync-ack"), {
    protocolVersion: FIRING_PROTOCOL_VERSION,
    deviceId: controllerId,
    controllerCycleId,
    sampleSequences: sequences,
    timestamp: new Date().toISOString(),
    acknowledgedAt: new Date().toISOString(),
  });
}

async function emitHistoricalSamplePersisted(controllerId, sample) {
  const controller = await prisma.controller.findUnique({
    where: { controllerId },
    select: { userId: true, kiln: { select: { kilnId: true } } },
  });
  if (!controller) return;
  emitControllerTelemetry(controller.userId, {
    controllerId,
    controllerCode: controllerId.slice(-6),
    kilnId: controller.kiln?.kilnId ?? null,
    controllerCycleId: sample.controllerCycleId,
    sampleSequence: Number(sample.sampleSequence),
    telemetrySaved: true,
  });
}

async function persistOrBufferSample(controllerId, sample) {
  assertHistoricalSample(sample);
  const saved = await persistControllerSample(
    sample.controllerCycleId,
    sample,
    controllerId,
  );
  if (!saved) {
    bufferSample(controllerId, sample);
    return false;
  }
  await emitHistoricalSamplePersisted(controllerId, sample);
  await acknowledgeSamples(controllerId, sample.controllerCycleId, [
    Number(sample.sampleSequence),
  ]);
  if (sample.sampleType === "FINAL") {
    const terminal = pendingTerminalSnapshots.get(sample.controllerCycleId);
    if (terminal) {
      pendingTerminalSnapshots.delete(sample.controllerCycleId);
      const closed = await processCycleSnapshot(controllerId, terminal);
      const conflict = cycleConflicts.get(controllerId);
      if (
        closed &&
        conflict?.awaitingTerminalCycleId === sample.controllerCycleId &&
        TERMINAL_FIRING_STATUSES.includes(closed.status)
      ) {
        cycleConflicts.delete(controllerId);
        if (conflict.incomingSnapshot) {
          await processCycleSnapshot(controllerId, conflict.incomingSnapshot);
        } else {
          unresolvedControllers.delete(controllerId);
          reconciledControllers.add(controllerId);
        }
      }
    }
  }
  return true;
}

async function flushBufferedSamples(controllerId, controllerCycleId) {
  const bufferKey = `${controllerId}:${controllerCycleId}`;
  const samples = (bufferedSamples.get(bufferKey) || []).sort(
    (left, right) => left.sampleSequence - right.sampleSequence,
  );
  if (!samples.length) return;
  const acknowledged = [];
  for (const sample of samples) {
    const saved = await persistControllerSample(
      controllerCycleId,
      sample,
      controllerId,
    );
    if (saved) {
      acknowledged.push(Number(sample.sampleSequence));
      await emitHistoricalSamplePersisted(controllerId, sample);
    }
  }
  if (acknowledged.length === samples.length) {
    bufferedSamples.delete(bufferKey);
  }
  await acknowledgeSamples(controllerId, controllerCycleId, acknowledged);
}

async function processCycleSnapshot(controllerId, snapshot) {
  if (!snapshot?.controllerCycleId) return null;
  const terminal = TERMINAL_FIRING_STATUSES.includes(snapshot.status);
  if (
    terminal &&
    (!snapshot.finalSampleExpected || snapshot.finalSampleUnavailable)
  ) {
    pendingTerminalSnapshots.delete(snapshot.controllerCycleId);
  }
  if (
    terminal &&
    snapshot.finalSampleExpected &&
    !snapshot.finalSampleUnavailable
  ) {
    const finalSample = await hasFinalSample(snapshot.controllerCycleId);
    if (!finalSample) {
      pendingTerminalSnapshots.set(snapshot.controllerCycleId, snapshot);
      unresolvedControllers.add(controllerId);
      reconciledControllers.delete(controllerId);
      const header = {
        ...snapshot,
        status: "RUNNING",
        endedAt: null,
        statusReasonCode: null,
        statusReason: null,
      };
      try {
        const cycle = await upsertControllerCycle(controllerId, header);
        await flushBufferedSamples(controllerId, snapshot.controllerCycleId);
        if (await hasFinalSample(snapshot.controllerCycleId)) {
          pendingTerminalSnapshots.delete(snapshot.controllerCycleId);
          return processCycleSnapshot(controllerId, snapshot);
        }
        return cycle;
      } catch (error) {
        if (error.code !== "CYCLE_CONFLICT") throw error;
        beginCycleConflict(controllerId, error);
        return null;
      }
    }
  }
  try {
    const cycle = await upsertControllerCycle(controllerId, snapshot);
    await flushBufferedSamples(controllerId, snapshot.controllerCycleId);
    const controller = await setActivityFromCycle(
      controllerId,
      snapshot.status,
    );
    reconciledControllers.add(controllerId);
    unresolvedControllers.delete(controllerId);
    emitFiringCycle(
      controller.userId,
      firingEvent(controllerId, controller, { cycle }),
    );
    return cycle;
  } catch (error) {
    if (error.code !== "CYCLE_CONFLICT") throw error;
    beginCycleConflict(controllerId, error);
    return null;
  }
}

function beginCycleConflict(controllerId, error) {
  if (!cycleConflicts.has(controllerId)) {
    cycleConflicts.set(controllerId, {
      kilnId: error.kilnId,
      activeCycle: error.activeCycle,
      incomingSnapshot: error.incomingSnapshot,
      notFoundResponses: 0,
    });
  }
  unresolvedControllers.add(controllerId);
  reconciledControllers.delete(controllerId);
  requestCycleRecovery(controllerId, error.activeCycle.controllerCycleId);
}

function terminalHeader(snapshot) {
  return {
    ...snapshot,
    status: "RUNNING",
    endedAt: null,
    statusReasonCode: null,
    statusReason: null,
  };
}

async function getActiveCycleForController(controllerId) {
  return prisma.firingCycle.findFirst({
    where: {
      kiln: { controllerId },
      status: { in: ["RUNNING", "PAUSED"] },
    },
    orderBy: { startedAt: "desc" },
  });
}

async function handleRecoveryResponse(controllerId, payload) {
  const conflict = cycleConflicts.get(controllerId);
  if (!conflict) return;
  if (payload.status === "FOUND" && payload.cycle) {
    const recovered = await processCycleSnapshot(controllerId, payload.cycle);
    if (Array.isArray(payload.samples)) {
      for (const sample of payload.samples) {
        await persistOrBufferSample(controllerId, sample);
      }
    }
    if (!cycleConflicts.has(controllerId)) return;
    if (["RUNNING", "PAUSED"].includes(payload.cycle.status)) {
      cycleConflicts.delete(controllerId);
      unresolvedControllers.delete(controllerId);
      reconciledControllers.add(controllerId);
      return;
    }
    if (!recovered || !TERMINAL_FIRING_STATUSES.includes(recovered.status)) {
      conflict.awaitingTerminalCycleId = payload.cycle.controllerCycleId;
      unresolvedControllers.add(controllerId);
      reconciledControllers.delete(controllerId);
      return;
    }
    cycleConflicts.delete(controllerId);
    if (conflict.incomingSnapshot) {
      await processCycleSnapshot(controllerId, conflict.incomingSnapshot);
    }
    return;
  }
  if (payload.status !== "NOT_FOUND") return;
  conflict.notFoundResponses += 1;
  if (conflict.notFoundResponses < 3) {
    setTimeout(() => {
      if (!cycleConflicts.has(controllerId)) return;
      requestCycleRecovery(
        controllerId,
        conflict.activeCycle.controllerCycleId,
      );
    }, 15_000).unref();
    return;
  }
  const incoming = conflict.incomingSnapshot;
  const mustWaitForFinal = Boolean(
    incoming &&
    TERMINAL_FIRING_STATUSES.includes(incoming.status) &&
    incoming.finalSampleExpected &&
    !incoming.finalSampleUnavailable,
  );
  if (mustWaitForFinal) {
    pendingTerminalSnapshots.set(incoming.controllerCycleId, incoming);
  }
  let cycle = await resolveCycleConflictAsUnknown({
    kilnId: conflict.kilnId,
    activeCycleId: conflict.activeCycle.firingCycleId,
    incomingSnapshot: mustWaitForFinal ? terminalHeader(incoming) : incoming,
  });
  cycleConflicts.delete(controllerId);
  if (incoming) {
    await flushBufferedSamples(controllerId, incoming.controllerCycleId);
    if (
      mustWaitForFinal &&
      (await hasFinalSample(incoming.controllerCycleId))
    ) {
      pendingTerminalSnapshots.delete(incoming.controllerCycleId);
      cycle = await processCycleSnapshot(controllerId, incoming);
    }
  }
  const waitingForFinal = Boolean(
    incoming && pendingTerminalSnapshots.has(incoming.controllerCycleId),
  );
  if (waitingForFinal) {
    unresolvedControllers.add(controllerId);
    reconciledControllers.delete(controllerId);
  } else {
    unresolvedControllers.delete(controllerId);
    reconciledControllers.add(controllerId);
  }
  if (!cycle) return;
  const controller = await setActivityFromCycle(controllerId, cycle.status);
  emitFiringCycle(
    controller.userId,
    firingEvent(controllerId, controller, { cycle }),
  );
}

async function handleFiringResult(controllerId, payload) {
  if (payload.cycle) await processCycleSnapshot(controllerId, payload.cycle);
  if (Array.isArray(payload.samples)) {
    for (const sample of payload.samples) {
      await persistOrBufferSample(controllerId, sample);
    }
  }
  const commandKey = `${controllerId}:${payload.commandId}`;
  const pending = pendingFiringCommands.get(commandKey);
  if (!pending || pending.controllerId !== controllerId) return;
  clearTimeout(pending.timer);
  pendingFiringCommands.delete(commandKey);
  pendingCommandByController.delete(controllerId);
  const result = {
    commandId: payload.commandId,
    outcome: payload.outcome,
    controllerCycleId:
      payload.controllerCycleId || payload.cycle?.controllerCycleId || null,
    reasonCode: payload.reasonCode || null,
    reason: payload.reason || null,
  };
  const cachedResult = {
    result,
    signature: pending.signature,
    expiresAt: Date.now() + RECENT_RESULT_TTL_MS,
  };
  recentFiringResults.set(commandKey, cachedResult);
  setTimeout(() => {
    if (recentFiringResults.get(commandKey) === cachedResult) {
      recentFiringResults.delete(commandKey);
    }
  }, RECENT_RESULT_TTL_MS).unref();
  if (payload.outcome === "APPLIED") {
    if (
      !cycleConflicts.has(controllerId) &&
      !pendingTerminalSnapshots.has(payload.cycle?.controllerCycleId)
    ) {
      unresolvedControllers.delete(controllerId);
      reconciledControllers.add(controllerId);
    }
    pending.resolve(result);
  } else {
    const error = new Error(
      payload.reason || "El controlador rechazó el comando",
    );
    error.code = "COMMAND_REJECTED";
    error.details = { reasonCode: payload.reasonCode || "REJECTED" };
    pending.reject(error);
  }
}

async function handleFiringState(controllerId, payload) {
  if (payload.selectedProgramId != null) {
    await applyControllerSelection(
      controllerId,
      Number(payload.selectedProgramId),
    );
  }
  let cycle = null;
  if (payload.cycle)
    cycle = await processCycleSnapshot(controllerId, payload.cycle);
  else {
    const activeCycle = await getActiveCycleForController(controllerId);
    if (activeCycle) {
      beginCycleConflict(controllerId, {
        kilnId: activeCycle.kilnId,
        activeCycle,
        incomingSnapshot: null,
      });
    } else {
      reconciledControllers.add(controllerId);
      unresolvedControllers.delete(controllerId);
    }
  }
  let eventController = null;
  if (payload.telemetry) {
    const telemetry = payload.telemetry;
    eventController = await updateControllerTelemetry(controllerId, {
      temperature: Number(telemetry.temperature),
      relayState: telemetry.switchState ? "ON" : "OFF",
    });
    emitControllerTelemetry(eventController.userId, {
      ...toTelemetryEvent(eventController),
      setpointTemperature: telemetry.setpointTemperature,
      stageIndex: telemetry.stageIndex,
      stageElapsedMinutes: telemetry.stageElapsedMinutes,
      voltage: telemetry.voltage,
      current: telemetry.current,
      recoveryInProgress: Boolean(payload.recoveryInProgress),
      firingStateConfirmed: !cycleConflicts.has(controllerId),
    });
  }
  if (!eventController) {
    eventController = await prisma.controller.findUnique({
      where: { controllerId },
      select: { userId: true, kiln: { select: { kilnId: true } } },
    });
  }
  if (eventController) {
    emitFiringCycle(
      eventController.userId,
      firingEvent(controllerId, eventController, {
        cycle,
        reconciliation: getControllerFiringAvailability(controllerId),
      }),
    );
  }
  if (controllersAwaitingCatalogSync.delete(controllerId)) {
    void publishControllerCatalog(controllerId).catch((error) =>
      console.error("[MQTT] Error sincronizando catálogo:", error.message),
    );
  }
}

async function handleFiringSync(controllerId, payload) {
  const cycles = Array.isArray(payload.cycles) ? payload.cycles : [];
  const samples = Array.isArray(payload.samples) ? payload.samples : [];
  for (const cycle of cycles) await processCycleSnapshot(controllerId, cycle);
  for (const sample of samples.sort(
    (left, right) => left.sampleSequence - right.sampleSequence,
  )) {
    await persistOrBufferSample(controllerId, sample);
  }
  if (
    !cycleConflicts.has(controllerId) &&
    !cycles.some((cycle) =>
      pendingTerminalSnapshots.has(cycle.controllerCycleId),
    )
  ) {
    reconciledControllers.add(controllerId);
  }
  if (controllersAwaitingCatalogSync.delete(controllerId)) {
    void publishControllerCatalog(controllerId).catch((error) =>
      console.error("[MQTT] Error sincronizando catálogo:", error.message),
    );
  }
}

export function publishPairingBlockStatus(controllerId, blockedUntil) {
  publishPairingStatus(controllerId, {
    status: "BLOCKED",
    blockedUntil: blockedUntil.toISOString(),
  });
}

function toTelemetryEvent(controller) {
  return {
    controllerId: controller.controllerId,
    controllerCode: controller.controllerId.slice(-6),
    kilnId: controller.kiln?.kilnId ?? null,
    switchState: controller.switchState,
    connectionStatus: controller.connectionStatus,
    activityStatus: controller.activityStatus,
    temperature: controller.temperature,
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
    client.subscribe("controller/+/pairing-pin", { qos: 1 });
    client.subscribe("controller/+/firing/+", { qos: 1 });
  });

  client.on("message", async (topic, payloadBuffer) => {
    const [prefix, controllerId, type, firingType] = topic.split("/");
    if (prefix !== "controller" || !controllerId || !type) return;

    try {
      const payload = parsePayload(payloadBuffer);

      if (type === "firing") {
        await assertFiringEnvelope(controllerId, payload);
        if (firingType === "result") {
          await handleFiringResult(controllerId, payload);
        } else if (firingType === "state") {
          await handleFiringState(controllerId, payload);
        } else if (firingType === "telemetry") {
          if (payload.persist === true || payload.sampleType) {
            await persistOrBufferSample(controllerId, payload);
          }
          if (Number.isFinite(Number(payload.temperature))) {
            const controller = await updateControllerTelemetry(controllerId, {
              temperature: Number(payload.temperature),
              relayState: payload.switchState ? "ON" : "OFF",
            });
            emitControllerTelemetry(controller.userId, {
              ...toTelemetryEvent(controller),
              setpointTemperature: payload.setpointTemperature,
              stageIndex: payload.stageIndex,
              stageElapsedMinutes: payload.stageElapsedMinutes,
              voltage: payload.voltage,
              current: payload.current,
              recoveryInProgress: Boolean(payload.recoveryInProgress),
            });
          }
        } else if (firingType === "sync") {
          await handleFiringSync(controllerId, payload);
        } else if (firingType === "recovery-result") {
          await handleRecoveryResponse(controllerId, payload);
        }
        return;
      }

      if (type === "temp") {
        const data = parseTempPayload(controllerId, payload);
        if (!data) return;

        const controller = await updateControllerTelemetry(controllerId, data);
        emitControllerTelemetry(
          controller.userId,
          toTelemetryEvent(controller),
        );
        if (data.relayState) void emitAdminSummary();
        return;
      }

      if (type === "state") {
        const switchState = parseRelayStatePayload(controllerId, payload);
        if (!switchState) return;

        const controller = await updateControllerSwitchState(
          controllerId,
          switchState,
        );
        emitControllerTelemetry(
          controller.userId,
          toTelemetryEvent(controller),
        );
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
        if (connectionStatus === "ONLINE") {
          requestControllerSynchronization(controllerId);
        } else {
          reconciledControllers.delete(controllerId);
          controllersAwaitingCatalogSync.delete(controllerId);
        }
        return;
      }

      if (type === "pairing-pin") {
        const pairing = parsePairingPinPayload(payload);
        if (!pairing) {
          publishPairingStatus(controllerId, {
            status: "REJECTED",
            reason: "INVALID_REQUEST",
          });
          return;
        }
        const result = await receivePairingPin(
          controllerId,
          pairing.pin,
          pairing.deviceSecret,
        );
        publishPairingStatus(controllerId, {
          status: result.status,
          expiresAt: result.expiresAt.toISOString(),
        });
        return;
      }
    } catch (error) {
      if (type === "pairing-pin") {
        publishPairingStatus(controllerId, {
          status: error.code === "PAIRING_BLOCKED" ? "BLOCKED" : "REJECTED",
          ...(error.blockedUntil
            ? { blockedUntil: error.blockedUntil.toISOString() }
            : { reason: "PAIRING_REJECTED" }),
        });
        return;
      }
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

export function getControllerFiringAvailability(controllerId) {
  if (pendingSelectionByController.has(controllerId)) {
    return { ready: false, reason: "SELECTION_PENDING" };
  }
  if (pendingCommandByController.has(controllerId)) {
    return { ready: false, reason: "COMMAND_PENDING" };
  }
  if (unresolvedControllers.has(controllerId)) {
    return { ready: false, reason: "RECONCILIATION_PENDING" };
  }
  if (!reconciledControllers.has(controllerId)) {
    return { ready: false, reason: "STATE_NOT_CONFIRMED" };
  }
  return { ready: true, reason: null };
}

export function acquireControllerSelection(controllerId) {
  const availability = getControllerFiringAvailability(controllerId);
  if (!availability.ready) return availability;
  pendingSelectionByController.add(controllerId);
  return { ready: true, reason: null };
}

export function releaseControllerSelection(controllerId) {
  pendingSelectionByController.delete(controllerId);
}

export function requestControllerSynchronization(controllerId) {
  reconciledControllers.delete(controllerId);
  controllersAwaitingCatalogSync.add(controllerId);
  requestControllerState(controllerId);
}

export async function publishControllerCatalog(controllerId) {
  const controller = await prisma.controller.findUnique({
    where: { controllerId },
    select: {
      userId: true,
      kiln: { select: { selectedProgramId: true } },
    },
  });
  if (!controller) return;
  const programs = await prisma.program.findMany({
    where: {
      OR: [
        { userId: null },
        ...(controller.userId ? [{ userId: controller.userId }] : []),
      ],
    },
    select: {
      programId: true,
      name: true,
      description: true,
      configuration: true,
    },
    orderBy: { programId: "asc" },
  });
  await publishJson(firingTopic(controllerId, "catalog"), {
    protocolVersion: FIRING_PROTOCOL_VERSION,
    deviceId: controllerId,
    selectedProgramId: controller.kiln?.selectedProgramId ?? null,
    historicalTelemetryIntervalSeconds: HISTORICAL_TELEMETRY_INTERVAL_MS / 1000,
    programs,
    timestamp: new Date().toISOString(),
    sentAt: new Date().toISOString(),
  });
}

export function publishFiringCommand(controllerId, data) {
  const commandKey = `${controllerId}:${data.commandId}`;
  const signature = JSON.stringify(data);
  const cached = recentFiringResults.get(commandKey);
  if (cached && cached.expiresAt > Date.now()) {
    if (cached.signature !== signature) {
      const error = new Error(
        "El commandId ya fue utilizado por otra operación",
      );
      error.code = "COMMAND_CONFLICT";
      return Promise.reject(error);
    }
    if (cached.result.outcome === "APPLIED") {
      return Promise.resolve(cached.result);
    }
    const error = new Error(
      cached.result.reason || "El controlador rechazó el comando",
    );
    error.code = "COMMAND_REJECTED";
    error.details = {
      reasonCode: cached.result.reasonCode || "REJECTED",
    };
    return Promise.reject(error);
  }
  if (cached) recentFiringResults.delete(commandKey);

  const duplicate = pendingFiringCommands.get(commandKey);
  if (duplicate) {
    if (duplicate.signature !== signature) {
      const error = new Error("El commandId ya está asociado a otra operación");
      error.code = "COMMAND_CONFLICT";
      return Promise.reject(error);
    }
    return duplicate.promise;
  }

  if (pendingCommandByController.has(controllerId)) {
    const error = new Error(
      "Ya existe un comando pendiente para este controlador",
    );
    error.code = "COMMAND_CONFLICT";
    return Promise.reject(error);
  }
  const availability = getControllerFiringAvailability(controllerId);
  if (!availability.ready) {
    const error = new Error("El estado del controlador aún no está confirmado");
    error.code = "CONTROLLER_NOT_RECONCILED";
    error.details = availability;
    return Promise.reject(error);
  }

  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  const timer = setTimeout(() => {
    pendingFiringCommands.delete(commandKey);
    pendingCommandByController.delete(controllerId);
    unresolvedControllers.add(controllerId);
    reconciledControllers.delete(controllerId);
    requestControllerState(controllerId);
    const error = new Error(
      "No se pudo confirmar el resultado del comando; se inició la reconciliación",
    );
    error.code = "COMMAND_TIMEOUT";
    rejectPromise(error);
  }, COMMAND_TIMEOUT_MS);
  const pending = {
    controllerId,
    command: data.command,
    signature,
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
    timer,
  };
  pendingFiringCommands.set(commandKey, pending);
  pendingCommandByController.set(controllerId, commandKey);

  publishJson(firingTopic(controllerId, "command"), {
    protocolVersion: FIRING_PROTOCOL_VERSION,
    deviceId: controllerId,
    timestamp: new Date().toISOString(),
    issuedAt: new Date().toISOString(),
    ...data,
  }).catch((error) => {
    clearTimeout(timer);
    pendingFiringCommands.delete(commandKey);
    pendingCommandByController.delete(controllerId);
    rejectPromise(error);
  });
  return promise;
}
