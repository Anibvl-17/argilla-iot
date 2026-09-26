import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import mqtt from "mqtt";
import { prisma } from "../config/prisma.js";
import {
  FIRING_PROTOCOL_VERSION,
  HISTORICAL_TELEMETRY_INTERVAL_MS,
  MAX_TEMPERATURE_C,
  MAX_START_TEMPERATURE_C,
  MIN_TEMPERATURE_C,
} from "../constants/firing.constants.js";

const MQTT_URL = process.env.MQTT_URL || "mqtt://localhost:1883";
const MQTT_USER = process.env.MQTT_USER || "";
const MQTT_PASS = process.env.MQTT_PASS || "";
const SEED_DEVICE_SECRET =
  process.env.SEED_DEVICE_SECRET || "argilla-local-device-secret-change-me";
const SIMULATOR_PAIRING_PIN = process.env.SIMULATOR_PAIRING_PIN || "";
const TEMP_INTERVAL_MS = positiveInt(
  process.env.SIMULATOR_TEMP_INTERVAL_MS,
  1000,
);
const REFRESH_MS = positiveInt(process.env.SIMULATOR_REFRESH_MS, 15000);
const TIME_SCALE = finiteNumber(process.env.SIMULATOR_TIME_SCALE, 60);
const TEMP_MIN = finiteNumber(process.env.SIMULATOR_TEMP_MIN, 20);
const TEMP_MAX = finiteNumber(process.env.SIMULATOR_TEMP_MAX, 1300);
const TEMP_START = finiteNumber(process.env.SIMULATOR_TEMP_START, 25);
const HEAT_C_PER_MIN = finiteNumber(process.env.SIMULATOR_HEAT_C_PER_MIN, 12);
const COOL_C_PER_MIN = finiteNumber(process.env.SIMULATOR_COOL_C_PER_MIN, 2);
const STATE_DIR = path.resolve(
  process.env.SIMULATOR_STATE_DIR || ".simulator-state",
);

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function finiteNumber(value, fallback) {
  const parsed = Number.parseFloat(value || "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function commandSignature(command) {
  return JSON.stringify({
    command: command.command,
    controllerCycleId: command.controllerCycleId ?? null,
    programId: command.programId ?? null,
    programConfig: command.programConfig ?? null,
  });
}

export function normalizePersistedCycle(
  cycle,
  stateFile = "estado persistido",
) {
  if (!cycle) return cycle;
  if (cycle.executionType === "DIRECT") {
    throw new Error(
      `Estado incompatible en ${stateFile}: contiene el ciclo DIRECT ${cycle.controllerCycleId || "sin identificador"}. El archivo no fue modificado.`,
    );
  }
  const programCycle = { ...cycle };
  delete programCycle.executionType;
  delete programCycle.targetTemperature;
  return programCycle;
}

export function calculateProgramSetpoint(
  stageStartTemperature,
  targetTemperature,
  elapsedMinutes,
  durationMinutes,
) {
  const progress = Math.min(1, elapsedMinutes / durationMinutes);
  return (
    stageStartTemperature +
    (targetTemperature - stageStartTemperature) * progress
  );
}

export function isProgramStageComplete(stage, elapsedMinutes, temperature) {
  return (
    elapsedMinutes >= stage.durationMinutes &&
    temperature >= stage.targetTemperature
  );
}

export function calculateRecoveryStep({
  currentTemperature,
  pauseTemperature,
  frozenSetpoint,
  currentSetpoint,
  maximumStep,
}) {
  if (currentTemperature < pauseTemperature) {
    return { setpoint: pauseTemperature, complete: false };
  }
  const setpoint = Math.min(
    frozenSetpoint,
    Math.max(currentTemperature, currentSetpoint) + maximumStep,
  );
  return { setpoint, complete: currentTemperature >= frozenSetpoint };
}

async function getRegisteredControllers() {
  return prisma.controller.findMany({
    select: {
      controllerId: true,
      temperature: true,
      kiln: { select: { nominalVoltage: true, nominalCurrent: true } },
    },
  });
}

export class ControllerSimulator {
  constructor(controller) {
    this.controllerId = controller.controllerId;
    this.currentTemp =
      typeof controller.temperature === "number"
        ? controller.temperature
        : TEMP_START;
    this.nominalVoltage = controller.kiln?.nominalVoltage || 220;
    this.nominalCurrent = controller.kiln?.nominalCurrent || 20;
    this.relayState = false;
    this.catalog = [];
    this.selectedProgramId = null;
    this.activeCycle = null;
    this.cycleHistory = new Map();
    this.unsyncedSamples = [];
    this.processedCommands = new Map();
    this.tempTimer = null;
    this.lastTickAt = null;
    this.shuttingDown = false;
    this.stateFile = path.join(STATE_DIR, `${this.controllerId}.json`);
    this.topics = {
      temp: `controller/${this.controllerId}/temp`,
      legacyCommand: `controller/${this.controllerId}/cmd`,
      status: `controller/${this.controllerId}/status`,
      pairingPin: `controller/${this.controllerId}/pairing-pin`,
      pairingStatus: `controller/${this.controllerId}/pairing-status`,
      command: `controller/${this.controllerId}/firing/command`,
      result: `controller/${this.controllerId}/firing/result`,
      firingState: `controller/${this.controllerId}/firing/state`,
      telemetry: `controller/${this.controllerId}/firing/telemetry`,
      sync: `controller/${this.controllerId}/firing/sync`,
      syncAck: `controller/${this.controllerId}/firing/sync-ack`,
      catalog: `controller/${this.controllerId}/firing/catalog`,
      stateRequest: `controller/${this.controllerId}/firing/state-request`,
      syncRequest: `controller/${this.controllerId}/firing/sync-request`,
      recoveryRequest: `controller/${this.controllerId}/firing/recovery-request`,
      recoveryResult: `controller/${this.controllerId}/firing/recovery-result`,
    };
    this.client = null;
  }

  connectClient() {
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
  }

  async start() {
    await this.restore();
    this.connectClient();
    this.bindEvents();
  }

  bindEvents() {
    this.client.on("connect", () => {
      console.log(`[SIM:${this.controllerId.slice(-6)}] Conectado al bróker con éxito`);
      this.publishStatus("online");
      this.client.subscribe(
        [
          this.topics.legacyCommand,
          this.topics.pairingStatus,
          this.topics.command,
          this.topics.catalog,
          this.topics.stateRequest,
          this.topics.syncRequest,
          this.topics.recoveryRequest,
          this.topics.syncAck,
        ],
        { qos: 1 },
      );
      if (/^\d{6}$/.test(SIMULATOR_PAIRING_PIN)) this.publishPairingPin();
      this.publishState();
      this.publishSync();
      this.startTemperatureLoop();
    });
    this.client.on("message", (topic, payloadBuffer) => {
      this.handleMessage(topic, payloadBuffer).catch((error) => {
        console.error(`[SIM:${this.controllerId.slice(-6)}] Error:`, error.message);
      });
    });
    this.client.on("error", (error) => {
      if (!this.shuttingDown)
        console.error(`[SIM:${this.controllerId}] Error:`, error.message);
    });
  }

  async handleMessage(topic, payloadBuffer) {
    let payload;
    try {
      payload = JSON.parse(payloadBuffer.toString());
    } catch {
      payload = payloadBuffer.toString();
    }
    if (topic === this.topics.pairingStatus) return;
    if (topic === this.topics.legacyCommand) {
      console.warn(
        `[SIM:${this.controllerId.slice(-6)}] Comando ON/OFF ignorado; use ciclos`,
      );
      return;
    }
    const validFiringEnvelope =
      payload?.protocolVersion === FIRING_PROTOCOL_VERSION &&
      payload?.deviceId === this.controllerId;
    if (topic === this.topics.catalog) {
      if (!validFiringEnvelope) return;
      this.catalog = Array.isArray(payload.programs) ? payload.programs : [];
      this.selectedProgramId = payload.selectedProgramId ?? null;
      await this.persist();
      this.publishState();
      return;
    }
    if (topic === this.topics.stateRequest) {
      if (validFiringEnvelope) return this.publishState();
      return;
    }
    if (topic === this.topics.syncRequest) {
      if (validFiringEnvelope) return this.publishSync();
      return;
    }
    if (topic === this.topics.recoveryRequest) {
      if (!validFiringEnvelope) return;
      const cycle = this.cycleHistory.get(payload.controllerCycleId);
      this.publish(this.topics.recoveryResult, {
        protocolVersion: FIRING_PROTOCOL_VERSION,
        deviceId: this.controllerId,
        controllerCycleId: payload.controllerCycleId,
        status: cycle ? "FOUND" : "NOT_FOUND",
        ...(cycle ? { cycle } : {}),
        timestamp: new Date().toISOString(),
      });
      return;
    }
    if (topic === this.topics.syncAck) {
      if (!validFiringEnvelope) return;
      const acknowledged = new Set(payload.sampleSequences || []);
      this.unsyncedSamples = this.unsyncedSamples.filter(
        (sample) =>
          sample.controllerCycleId !== payload.controllerCycleId ||
          !acknowledged.has(sample.sampleSequence),
      );
      await this.persist();
      return;
    }
    if (topic === this.topics.command) await this.handleCommand(payload);
  }

  async handleCommand(command) {
    if (
      command.protocolVersion !== FIRING_PROTOCOL_VERSION ||
      command.deviceId !== this.controllerId ||
      !command.commandId
    )
      return;
    const previous = this.processedCommands.get(command.commandId);
    const signature = commandSignature(command);
    if (previous) {
      const previousResult = previous.result || previous;
      if (previous.signature && previous.signature !== signature) {
        return this.publish(
          this.topics.result,
          this.commandResult(command.commandId, "REJECTED", {
            reasonCode: "COMMAND_ID_REUSED",
            reason: "El commandId ya fue utilizado por otra operación",
          }),
        );
      }
      return this.publish(this.topics.result, previousResult);
    }
    let result;
    try {
      if (command.command === "START_PROGRAM")
        result = await this.startProgram(command);
      else if (command.command === "PAUSE") result = await this.pause(command);
      else if (command.command === "RESUME")
        result = await this.resume(command);
      else if (command.command === "CANCEL")
        result = await this.cancel(command);
      else throw new Error("Comando no soportado");
    } catch (error) {
      result = this.commandResult(command.commandId, "REJECTED", {
        reasonCode: "INVALID_OPERATION",
        reason: error.message,
      });
    }
    this.processedCommands.set(command.commandId, { signature, result });
    while (this.processedCommands.size > 100) {
      this.processedCommands.delete(this.processedCommands.keys().next().value);
    }
    await this.persist();
    this.publish(this.topics.result, result);
  }

  assertCanStart() {
    if (this.activeCycle) throw new Error("Ya existe una quema activa");
    if (this.currentTemp >= MAX_START_TEMPERATURE_C) {
      throw new Error("La temperatura inicial debe ser inferior a 35 °C");
    }
  }

  baseCycle(command) {
    return {
      controllerCycleId: crypto.randomUUID(),
      programId: command.programId,
      programConfig: command.programConfig,
      status: "RUNNING",
      startedAt: new Date().toISOString(),
      endedAt: null,
      statusReasonCode: null,
      statusReason: null,
      finalSampleExpected: false,
      finalSampleUnavailable: false,
      stageIndex: 0,
      stageElapsedMinutes: 0,
      stageStartTemperature: this.currentTemp,
      wallElapsedMinutes: 0,
      nextPeriodicMinute: HISTORICAL_TELEMETRY_INTERVAL_MS / 60_000,
      sampleSequence: 0,
      setpointTemperature: this.currentTemp,
      pauseTemperature: null,
      frozenSetpoint: null,
      recoveryInProgress: false,
    };
  }

  async startProgram(command) {
    const program = this.catalog.find(
      ({ programId }) => programId === Number(command.programId),
    );
    if (!program) throw new Error("Programa no disponible en el controlador");
    if (
      command.programConfig?.schemaVersion !== 1 ||
      !Number.isFinite(command.programConfig?.initialTemperature) ||
      command.programConfig.initialTemperature < MIN_TEMPERATURE_C ||
      command.programConfig.initialTemperature > MAX_TEMPERATURE_C ||
      !Array.isArray(command.programConfig?.stages) ||
      !command.programConfig.stages.length ||
      command.programConfig.stages.some(
        (stage) =>
          !Number.isFinite(stage.durationMinutes) ||
          stage.durationMinutes <= 0 ||
          !Number.isFinite(stage.targetTemperature) ||
          stage.targetTemperature < MIN_TEMPERATURE_C ||
          stage.targetTemperature > MAX_TEMPERATURE_C,
      )
    ) {
      throw new Error("Configuración de programa inválida");
    }
    this.assertCanStart();
    this.activeCycle = this.baseCycle(command);
    this.rememberCycle();
    await this.recordSample("INITIAL");
    await this.persist();
    this.publishState();
    return this.commandResult(command.commandId, "APPLIED", {
      controllerCycleId: this.activeCycle.controllerCycleId,
      cycle: this.snapshotCycle(this.activeCycle),
    });
  }

  async pause(command) {
    this.assertCycle(command, "RUNNING");
    this.activeCycle.status = "PAUSED";
    this.activeCycle.pauseTemperature = this.currentTemp;
    this.activeCycle.frozenSetpoint = this.activeCycle.setpointTemperature;
    this.activeCycle.recoveryInProgress = false;
    this.relayState = false;
    await this.persistAndPublishState();
    return this.commandResult(command.commandId, "APPLIED", {
      controllerCycleId: this.activeCycle.controllerCycleId,
      cycle: this.snapshotCycle(this.activeCycle),
    });
  }

  async resume(command) {
    this.assertCycle(command, "PAUSED");
    this.activeCycle.recoveryInProgress = true;
    await this.persistAndPublishState();
    return this.commandResult(command.commandId, "APPLIED", {
      controllerCycleId: this.activeCycle.controllerCycleId,
      cycle: this.snapshotCycle(this.activeCycle),
    });
  }

  async cancel(command) {
    if (
      !this.activeCycle ||
      !["RUNNING", "PAUSED"].includes(this.activeCycle.status)
    ) {
      throw new Error("No existe una quema cancelable");
    }
    this.assertCycleIdentity(command);
    await this.finishCycle("CANCELLED");
    return this.commandResult(command.commandId, "APPLIED", {
      controllerCycleId: command.controllerCycleId,
      cycle: this.cycleHistory.get(command.controllerCycleId),
    });
  }

  assertCycle(command, status) {
    if (!this.activeCycle || this.activeCycle.status !== status) {
      throw new Error(`La quema no está en estado ${status}`);
    }
    this.assertCycleIdentity(command);
  }

  assertCycleIdentity(command) {
    if (this.activeCycle.controllerCycleId !== command.controllerCycleId) {
      throw new Error("El ciclo indicado no coincide con el ciclo activo");
    }
  }

  commandResult(commandId, outcome, extra = {}) {
    return {
      protocolVersion: FIRING_PROTOCOL_VERSION,
      deviceId: this.controllerId,
      commandId,
      outcome,
      timestamp: new Date().toISOString(),
      occurredAt: new Date().toISOString(),
      ...extra,
    };
  }

  startTemperatureLoop() {
    if (this.tempTimer) clearInterval(this.tempTimer);
    this.lastTickAt = Date.now();
    this.tempTimer = setInterval(() => void this.tick(), TEMP_INTERVAL_MS);
    this.publishLiveTelemetry();
  }

  async tick() {
    const now = Date.now();
    const elapsedMs = Math.max(0, now - (this.lastTickAt || now));
    this.lastTickAt = now;
    const simulatedMinutes = (elapsedMs / 60_000) * TIME_SCALE;
    if (this.activeCycle) {
      this.activeCycle.wallElapsedMinutes += simulatedMinutes;
      if (this.activeCycle.status === "RUNNING")
        this.advanceRunningCycle(simulatedMinutes);
      else if (this.activeCycle.recoveryInProgress)
        this.advanceRecovery(simulatedMinutes);
      else this.relayState = false;
    } else this.relayState = false;
    this.applyThermalChange(simulatedMinutes);
    if (
      this.activeCycle &&
      this.activeCycle.wallElapsedMinutes >= this.activeCycle.nextPeriodicMinute
    ) {
      await this.recordSample("PERIODIC");
      this.activeCycle.nextPeriodicMinute +=
        HISTORICAL_TELEMETRY_INTERVAL_MS / 60_000;
    }
    if (this.activeCycle) {
      await this.completeProgramStageIfReady();
    }
    this.publishLiveTelemetry();
    await this.persist();
  }

  advanceRunningCycle(minutes) {
    const cycle = this.activeCycle;
    const stage = cycle.programConfig.stages[cycle.stageIndex];
    cycle.stageElapsedMinutes += minutes;
    cycle.setpointTemperature = calculateProgramSetpoint(
      cycle.stageStartTemperature,
      stage.targetTemperature,
      cycle.stageElapsedMinutes,
      stage.durationMinutes,
    );
    this.relayState = this.currentTemp < cycle.setpointTemperature;
  }

  advanceRecovery(minutes) {
    const cycle = this.activeCycle;
    const recovery = calculateRecoveryStep({
      currentTemperature: this.currentTemp,
      pauseTemperature: cycle.pauseTemperature,
      frozenSetpoint: cycle.frozenSetpoint,
      currentSetpoint: cycle.setpointTemperature,
      maximumStep: HEAT_C_PER_MIN * minutes,
    });
    cycle.setpointTemperature = recovery.setpoint;
    this.relayState = this.currentTemp < cycle.setpointTemperature;
    if (recovery.complete) {
      cycle.recoveryInProgress = false;
      cycle.status = "RUNNING";
      cycle.setpointTemperature = cycle.frozenSetpoint;
      this.publishState();
    }
  }

  applyThermalChange(minutes) {
    this.currentTemp += this.relayState
      ? HEAT_C_PER_MIN * minutes
      : this.currentTemp > TEMP_MIN
        ? -COOL_C_PER_MIN * minutes
        : 0;
    this.currentTemp = round(
      Math.min(TEMP_MAX, Math.max(TEMP_MIN, this.currentTemp)),
    );
  }

  async completeProgramStageIfReady() {
    const cycle = this.activeCycle;
    if (!cycle || cycle.status !== "RUNNING") return;
    const stage = cycle.programConfig.stages[cycle.stageIndex];
    if (
      !isProgramStageComplete(
        stage,
        cycle.stageElapsedMinutes,
        this.currentTemp,
      )
    )
      return;
    if (cycle.stageIndex === cycle.programConfig.stages.length - 1) {
      await this.finishCycle("COMPLETED");
      return;
    }
    cycle.stageIndex += 1;
    cycle.stageElapsedMinutes = 0;
    cycle.stageStartTemperature = stage.targetTemperature;
    cycle.setpointTemperature = stage.targetTemperature;
    this.rememberCycle();
    this.publishState();
  }

  async finishCycle(status, reason = {}) {
    const cycle = this.activeCycle;
    if (!cycle) return;
    this.relayState = false;
    await this.recordSample("FINAL");
    cycle.status = status;
    cycle.endedAt = new Date().toISOString();
    cycle.statusReasonCode = reason.code || null;
    cycle.statusReason = reason.message || null;
    cycle.finalSampleExpected = true;
    this.rememberCycle();
    this.publishState();
    this.activeCycle = null;
    await this.persist();
  }

  async recordSample(sampleType) {
    if (!this.activeCycle) return;
    const sample = {
      protocolVersion: FIRING_PROTOCOL_VERSION,
      deviceId: this.controllerId,
      controllerCycleId: this.activeCycle.controllerCycleId,
      sampleSequence: this.activeCycle.sampleSequence,
      sampleType,
      temperature: this.currentTemp,
      setpointTemperature: this.activeCycle.setpointTemperature,
      switchState: this.relayState,
      stageIndex: this.activeCycle.stageIndex,
      voltage: this.relayState ? this.nominalVoltage : 0,
      current: this.relayState ? this.nominalCurrent : 0,
      timestamp: new Date().toISOString(),
      persist: true,
    };
    this.activeCycle.sampleSequence += 1;
    this.unsyncedSamples.push(sample);
    this.publish(this.topics.telemetry, sample);
    await this.persist();
  }

  liveTelemetry() {
    return {
      protocolVersion: FIRING_PROTOCOL_VERSION,
      deviceId: this.controllerId,
      controllerCycleId: this.activeCycle?.controllerCycleId || null,
      temperature: this.currentTemp,
      setpointTemperature:
        this.activeCycle?.setpointTemperature ?? this.currentTemp,
      switchState: this.relayState,
      stageIndex: this.activeCycle?.stageIndex ?? null,
      stageElapsedMinutes: this.activeCycle?.stageElapsedMinutes ?? null,
      voltage: this.relayState ? this.nominalVoltage : 0,
      current: this.relayState ? this.nominalCurrent : 0,
      recoveryInProgress: Boolean(this.activeCycle?.recoveryInProgress),
      timestamp: new Date().toISOString(),
    };
  }

  publishLiveTelemetry() {
    const telemetry = this.liveTelemetry();
    this.publish(this.topics.telemetry, telemetry);
    this.publish(this.topics.temp, {
      deviceId: this.controllerId,
      value: telemetry.temperature,
      unit: "C",
      relayState: telemetry.switchState ? "ON" : "OFF",
      timestamp: telemetry.timestamp,
    });
  }

  snapshotCycle(cycle) {
    if (!cycle) return null;
    return {
      controllerCycleId: cycle.controllerCycleId,
      programId: cycle.programId,
      programConfig: cycle.programConfig,
      status: cycle.status,
      startedAt: cycle.startedAt,
      endedAt: cycle.endedAt,
      statusReasonCode: cycle.statusReasonCode,
      statusReason: cycle.statusReason,
      finalSampleExpected: cycle.finalSampleExpected,
      finalSampleUnavailable: cycle.finalSampleUnavailable,
    };
  }

  rememberCycle() {
    if (this.activeCycle) {
      this.cycleHistory.set(
        this.activeCycle.controllerCycleId,
        this.snapshotCycle(this.activeCycle),
      );
    }
  }

  publishState() {
    this.publish(this.topics.firingState, {
      protocolVersion: FIRING_PROTOCOL_VERSION,
      deviceId: this.controllerId,
      selectedProgramId: this.selectedProgramId,
      cycle: this.snapshotCycle(this.activeCycle),
      recoveryInProgress: Boolean(this.activeCycle?.recoveryInProgress),
      telemetry: this.liveTelemetry(),
      timestamp: new Date().toISOString(),
      occurredAt: new Date().toISOString(),
    });
  }

  publishSync() {
    this.publish(this.topics.sync, {
      protocolVersion: FIRING_PROTOCOL_VERSION,
      deviceId: this.controllerId,
      cycles: Array.from(this.cycleHistory.values()),
      samples: this.unsyncedSamples,
      timestamp: new Date().toISOString(),
      occurredAt: new Date().toISOString(),
    });
  }

  async persistAndPublishState() {
    this.rememberCycle();
    await this.persist();
    this.publishState();
  }

  publishStatus(status) {
    this.publish(
      this.topics.status,
      { deviceId: this.controllerId, status },
      { qos: 1, retain: true },
    );
  }

  publishPairingPin() {
    this.publish(this.topics.pairingPin, {
      pin: SIMULATOR_PAIRING_PIN,
      deviceSecret: `${SEED_DEVICE_SECRET}:${this.controllerId}`,
    });
  }

  publish(topic, payload, options = { qos: 1 }) {
    if (this.client?.connected) {
      this.client.publish(topic, JSON.stringify(payload), options);
    }
  }

  async restore() {
    try {
      const stored = JSON.parse(await fs.readFile(this.stateFile, "utf8"));
      this.currentTemp = stored.currentTemp ?? this.currentTemp;
      this.catalog = stored.catalog || [];
      this.selectedProgramId = stored.selectedProgramId ?? null;
      this.unsyncedSamples = stored.unsyncedSamples || [];
      this.processedCommands = new Map(stored.processedCommands || []);
      this.cycleHistory = new Map(
        (stored.cycleHistory || []).map(([controllerCycleId, cycle]) => [
          controllerCycleId,
          normalizePersistedCycle(cycle, this.stateFile),
        ]),
      );
      if (stored.activeCycle) {
        this.activeCycle = {
          ...normalizePersistedCycle(stored.activeCycle, this.stateFile),
          status: "PAUSED",
          stageElapsedMinutes: 0,
          stageStartTemperature: this.currentTemp,
          pauseTemperature: this.currentTemp,
          frozenSetpoint: this.currentTemp,
          recoveryInProgress: false,
        };
        this.rememberCycle();
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  async persist() {
    await fs.mkdir(STATE_DIR, { recursive: true });
    await fs.writeFile(
      this.stateFile,
      JSON.stringify({
        currentTemp: this.currentTemp,
        catalog: this.catalog,
        selectedProgramId: this.selectedProgramId,
        activeCycle: this.activeCycle,
        unsyncedSamples: this.unsyncedSamples,
        processedCommands: Array.from(this.processedCommands.entries()),
        cycleHistory: Array.from(this.cycleHistory.entries()),
      }),
      "utf8",
    );
  }

  async stop() {
    if (this.shuttingDown) return;
    this.shuttingDown = true;
    if (this.tempTimer) clearInterval(this.tempTimer);
    await this.persist();
    if (!this.client) return;
    await new Promise((resolve) => {
      this.publishStatus("offline");
      this.client.end(false, resolve);
    });
  }

  abortWithoutPersisting() {
    this.shuttingDown = true;
    if (this.tempTimer) clearInterval(this.tempTimer);
    if (!this.client) return Promise.resolve();
    return new Promise((resolve) => this.client.end(true, resolve));
  }
}

export class SimulatorService {
  constructor() {
    this.controllers = new Map();
    this.refreshTimer = null;
    this.shuttingDown = false;
  }

  async start() {
    console.log("[SIM] Iniciando simulador MQTT...");
    await this.syncControllers();
    this.refreshTimer = setInterval(
      () => void this.syncControllers(),
      REFRESH_MS,
    );
  }

  async syncControllers() {
    if (this.shuttingDown) return;
    const registered = await getRegisteredControllers();
    const ids = new Set(registered.map(({ controllerId }) => controllerId));
    for (const controller of registered) {
      if (this.controllers.has(controller.controllerId)) continue;
      const simulator = new ControllerSimulator(controller);
      try {
        await simulator.start();
      } catch (error) {
        await simulator.abortWithoutPersisting();
        throw error;
      }
      this.controllers.set(controller.controllerId, simulator);
      console.log(`[SIM] Controlador agregado: ${controller.controllerId.slice(-6)}`);
    }
    const stops = [];
    for (const [controllerId, simulator] of this.controllers) {
      if (ids.has(controllerId)) continue;
      this.controllers.delete(controllerId);
      stops.push(simulator.stop());
    }
    await Promise.allSettled(stops);
  }

  async stop() {
    if (this.shuttingDown) return;
    this.shuttingDown = true;
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    await Promise.allSettled(
      Array.from(this.controllers.values()).map((simulator) =>
        simulator.stop(),
      ),
    );
    this.controllers.clear();
    await prisma.$disconnect();
  }
}
