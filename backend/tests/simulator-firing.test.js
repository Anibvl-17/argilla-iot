import assert from "node:assert/strict";
import test from "node:test";
import { GLOBAL_PROGRAMS } from "../src/constants/firing.constants.js";
import {
  ControllerSimulator,
  calculateProgramSetpoint,
  calculateRecoveryStep,
  isProgramStageComplete,
  normalizePersistedCycle,
} from "../src/services/simulator.service.js";

test("the simulator restores state before opening and binding MQTT", async () => {
  const simulator = new ControllerSimulator({
    controllerId: "test-controller",
    temperature: 20,
    kiln: { nominalVoltage: 220, nominalCurrent: 20 },
  });
  const steps = [];
  simulator.restore = async () => steps.push("restore");
  simulator.connectClient = () => steps.push("connect");
  simulator.bindEvents = () => steps.push("bind");

  assert.equal(simulator.client, null);
  await simulator.start();
  assert.deepEqual(steps, ["restore", "connect", "bind"]);
});

test("the simulator waits for the first interval before advancing time", () => {
  const simulator = new ControllerSimulator({
    controllerId: "test-controller",
    temperature: 20,
    kiln: { nominalVoltage: 220, nominalCurrent: 20 },
  });
  let ticks = 0;
  let livePublications = 0;
  simulator.tick = async () => {
    ticks += 1;
  };
  simulator.publishLiveTelemetry = () => {
    livePublications += 1;
  };

  simulator.startTemperatureLoop();

  assert.equal(ticks, 0);
  assert.equal(livePublications, 1);
  assert.ok(Date.now() - simulator.lastTickAt < 100);
  clearInterval(simulator.tempTimer);
});

test("the simulator interpolates ramps for their full configured duration", () => {
  assert.equal(calculateProgramSetpoint(20, 100, 15, 30), 60);
  assert.equal(calculateProgramSetpoint(20, 100, 30, 30), 100);
  assert.equal(calculateProgramSetpoint(20, 100, 60, 30), 100);
});

test("a stage requires both elapsed time and target temperature", () => {
  const stage = { durationMinutes: 30, targetTemperature: 100 };
  assert.equal(isProgramStageComplete(stage, 29, 100), false);
  assert.equal(isProgramStageComplete(stage, 30, 99.9), false);
  assert.equal(isProgramStageComplete(stage, 30, 100), true);
});

test("the one-minute test program follows the standard accelerated curve logic", () => {
  const program = GLOBAL_PROGRAMS.find(({ name }) => name === "Quema de Prueba");
  const stage = program.configuration.stages[0];
  assert.equal(program.configuration.initialTemperature, 20);
  assert.equal(calculateProgramSetpoint(20, stage.targetTemperature, 1, 1), 1240);
  assert.equal(isProgramStageComplete(stage, 1, 1240), true);
});

test("pause recovery first restores the measured pause temperature", () => {
  assert.deepEqual(
    calculateRecoveryStep({
      currentTemperature: 180,
      pauseTemperature: 200,
      frozenSetpoint: 240,
      currentSetpoint: 180,
      maximumStep: 10,
    }),
    { setpoint: 200, complete: false },
  );
  assert.deepEqual(
    calculateRecoveryStep({
      currentTemperature: 205,
      pauseTemperature: 200,
      frozenSetpoint: 240,
      currentSetpoint: 200,
      maximumStep: 10,
    }),
    { setpoint: 215, complete: false },
  );
});

test("persisted program cycles are normalized to the program-only contract", () => {
  assert.deepEqual(
    normalizePersistedCycle({
      controllerCycleId: "program-cycle",
      executionType: "PROGRAM",
      targetTemperature: null,
      programId: 5,
      programConfig: { schemaVersion: 1, initialTemperature: 20, stages: [] },
    }),
    {
      controllerCycleId: "program-cycle",
      programId: 5,
      programConfig: { schemaVersion: 1, initialTemperature: 20, stages: [] },
    },
  );
});

test("persisted direct cycles fail without being converted", () => {
  const directCycle = {
    controllerCycleId: "direct-cycle",
    executionType: "DIRECT",
    targetTemperature: 800,
  };
  assert.throws(
    () => normalizePersistedCycle(directCycle, "/state/controller.json"),
    /contiene el ciclo DIRECT direct-cycle.*no fue modificado/i,
  );
  assert.deepEqual(directCycle, {
    controllerCycleId: "direct-cycle",
    executionType: "DIRECT",
    targetTemperature: 800,
  });
});
