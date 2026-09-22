import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { prisma } from "../src/config/prisma.js";
import {
  FIRING_COMMANDS,
  FIRING_PROTOCOL_VERSION,
  GLOBAL_PROGRAMS,
  MAX_START_TEMPERATURE_C,
} from "../src/constants/firing.constants.js";
import firingRouter from "../src/routes/firing.routes.js";
import {
  assertCanStart,
  persistControllerSample,
  selectOwnedKilnProgram,
  upsertControllerCycle,
} from "../src/services/firing.service.js";
import {
  selectProgramValidation,
  startProgramValidation,
} from "../src/validations/firing.validation.js";
import { syncGlobalPrograms } from "../prisma/syncGlobalPrograms.js";

function mockMethod(t, target, name, implementation) {
  const original = target[name];
  target[name] = implementation;
  t.after(() => {
    target[name] = original;
  });
}

test("the five canonical programs preserve their approved curves", () => {
  assert.deepEqual(
    GLOBAL_PROGRAMS.map(({ name }) => name),
    ["Bizcocho", "Cono 6 (Gres)", "Cono 6", "Cono 7", "Quema de Prueba"],
  );
  assert.deepEqual(GLOBAL_PROGRAMS[0].configuration.stages.at(-1), {
    durationMinutes: 10,
    targetTemperature: 950,
  });
  assert.equal(GLOBAL_PROGRAMS[1].configuration.stages[3].targetTemperature, 573);
  assert.equal(GLOBAL_PROGRAMS[2].configuration.stages.at(-1).targetTemperature, 1212);
  assert.equal(GLOBAL_PROGRAMS[3].configuration.stages.at(-1).targetTemperature, 1230);
  assert.deepEqual(GLOBAL_PROGRAMS[4], {
    name: "Quema de Prueba",
    description: "Programa de quema para probar el estado tu horno.",
    configuration: {
      schemaVersion: 1,
      initialTemperature: 20,
      stages: [{ durationMinutes: 1, targetTemperature: 1240 }],
    },
  });
});

test("the public contract exposes only program-based starts", () => {
  assert.equal(FIRING_PROTOCOL_VERSION, 2);
  assert.deepEqual(Object.values(FIRING_COMMANDS), [
    "START_PROGRAM",
    "PAUSE",
    "RESUME",
    "CANCEL",
  ]);
  const routePaths = firingRouter.stack
    .map((layer) => layer.route?.path)
    .filter(Boolean);
  assert.ok(routePaths.includes("/kilns/:kilnId/cycles/program"));
  assert.ok(!routePaths.includes("/kilns/:kilnId/cycles/direct"));
});

test("the migration refuses DIRECT data before dropping its columns", async () => {
  const migration = await fs.readFile(
    new URL(
      "../prisma/migrations/20260921000000_program_only_firing_cycles/migration.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const guardPosition = migration.indexOf("direct_cycle_count > 0");
  const dropPosition = migration.indexOf('DROP COLUMN "executionType"');
  assert.ok(guardPosition >= 0 && guardPosition < dropPosition);
  assert.match(migration, /RAISE EXCEPTION[\s\S]*no eliminará ni convertirá datos/);
  assert.doesNotMatch(migration, /DELETE\s+FROM\s+"FiringCycle"/i);
});

test("global program synchronization updates canonical records without changing ids", async () => {
  const updates = [];
  const creates = [];
  const existing = GLOBAL_PROGRAMS.map((program, index) => ({
    programId: index + 10,
    name: program.name,
    description: "anterior",
    configuration: {},
  }));
  await syncGlobalPrograms({
    program: {
      findMany: async () => existing,
      update: async (args) => updates.push(args),
      create: async (args) => creates.push(args),
    },
  });
  assert.equal(updates.length, 5);
  assert.equal(creates.length, 0);
  assert.deepEqual(
    updates.map(({ where }) => where.programId),
    [10, 11, 12, 13, 14],
  );
});

test("global program synchronization is idempotent when repeated", async () => {
  const records = [];
  let nextId = 1;
  const client = {
    program: {
      findMany: async () => records.map((record) => ({ ...record })),
      create: async ({ data }) => {
        records.push({ programId: nextId++, ...data });
      },
      update: async ({ where, data }) => {
        Object.assign(
          records.find(({ programId }) => programId === where.programId),
          data,
        );
      },
    },
  };
  await syncGlobalPrograms(client);
  await syncGlobalPrograms(client);
  assert.equal(records.length, 5);
  assert.deepEqual(
    records.map(({ programId }) => programId),
    [1, 2, 3, 4, 5],
  );
});

test("global program synchronization fails on duplicates and unexpected names", async () => {
  const client = (records) => ({
    program: {
      findMany: async () => records,
      update: async () => {},
      create: async () => {},
    },
  });
  await assert.rejects(
    () =>
      syncGlobalPrograms(
        client([
          { programId: 1, name: "Bizcocho" },
          { programId: 2, name: "Bizcocho" },
        ]),
      ),
    /duplicado: Bizcocho/,
  );
  await assert.rejects(
    () => syncGlobalPrograms(client([{ programId: 1, name: "No canónico" }])),
    /inesperados: No canónico/,
  );
});

test("firing request validation only accepts a command id for program starts", () => {
  assert.equal(selectProgramValidation.safeParse({ programId: 1 }).success, true);
  assert.equal(selectProgramValidation.safeParse({ programId: -1 }).success, false);
  assert.equal(
    startProgramValidation.safeParse({
      commandId: "550e8400-e29b-41d4-a716-446655440000",
    }).success,
    true,
  );
  assert.equal(
    startProgramValidation.safeParse({
      commandId: "550e8400-e29b-41d4-a716-446655440000",
      targetTemperature: 800,
    }).success,
    false,
  );
});

test("start preconditions reject hot kilns and require a selected program", async () => {
  const base = {
    controller: {
      connectionStatus: "ONLINE",
      operationalStatus: "OPERATIONAL",
      temperature: MAX_START_TEMPERATURE_C,
    },
    firingCycles: [],
    selectedProgram: { programId: 1 },
  };
  await assert.rejects(() => assertCanStart(base), {
    code: "START_TEMPERATURE_INVALID",
  });
  await assert.rejects(
    () =>
      assertCanStart(
        {
          ...base,
          selectedProgram: null,
          controller: { ...base.controller, temperature: 25 },
        },
      ),
    { code: "PROGRAM_REQUIRED" },
  );
});

test("program selection accepts a global program and updates only an idle owned kiln", async (t) => {
  let updateData;
  const tx = {
    $queryRaw: async () => [{ kilnId: 7 }],
    kiln: {
      findFirst: async () => ({
        kilnId: 7,
        userId: 3,
        controller: { connectionStatus: "ONLINE" },
      }),
      update: async ({ data }) => {
        updateData = data;
      },
    },
    firingCycle: { findFirst: async () => null },
    program: {
      findFirst: async () => ({
        programId: 4,
        name: "Cono 7",
        configuration: {},
      }),
    },
  };
  mockMethod(t, prisma, "$transaction", (work) => work(tx));
  const result = await selectOwnedKilnProgram(3, 7, 4);
  assert.equal(result.name, "Cono 7");
  assert.deepEqual(updateData, { selectedProgramId: 4 });
});

test("samples arriving before their cycle remain unacknowledged by persistence", async (t) => {
  mockMethod(t, prisma.firingCycle, "findFirst", async () => null);
  const result = await persistControllerSample("cycle-before-confirmation", {
    sampleSequence: 0,
    sampleType: "INITIAL",
  });
  assert.equal(result, null);
});

test("controller cycle snapshots preserve the immutable program configuration", async (t) => {
  const snapshot = {
    controllerCycleId: "controller-cycle-1",
    programId: 2,
    programConfig: GLOBAL_PROGRAMS[1].configuration,
    status: "RUNNING",
    startedAt: "2026-09-20T12:00:00.000Z",
  };
  let createArgs;
  mockMethod(t, prisma.controller, "findUnique", async () => ({
    kiln: { kilnId: 9 },
  }));
  mockMethod(t, prisma.firingCycle, "findUnique", async () => null);
  mockMethod(t, prisma.firingCycle, "findFirst", async () => null);
  mockMethod(t, prisma.firingCycle, "create", async (args) => {
    createArgs = args;
    return args.data;
  });
  await upsertControllerCycle("controller-1", snapshot);
  assert.equal(createArgs.data.controllerCycleId, "controller-cycle-1");
  assert.deepEqual(createArgs.data.programConfig, snapshot.programConfig);
});

test("later controller states cannot rewrite a cycle program snapshot", async (t) => {
  let updateArgs;
  mockMethod(t, prisma.controller, "findUnique", async () => ({
    kiln: { kilnId: 9 },
  }));
  mockMethod(t, prisma.firingCycle, "findUnique", async () => ({
    firingCycleId: 4,
    controllerCycleId: "controller-cycle-1",
    kilnId: 9,
    programConfig: GLOBAL_PROGRAMS[0].configuration,
    status: "RUNNING",
  }));
  mockMethod(t, prisma.firingCycle, "update", async (args) => {
    updateArgs = args;
    return args.data;
  });
  await upsertControllerCycle("controller-1", {
    controllerCycleId: "controller-cycle-1",
    programId: 1,
    programConfig: {
      schemaVersion: 1,
      initialTemperature: 20,
      stages: [{ durationMinutes: 1, targetTemperature: 30 }],
    },
    status: "PAUSED",
    startedAt: "2026-09-20T12:00:00.000Z",
  });
  assert.equal(updateArgs.data.status, "PAUSED");
  assert.equal("programConfig" in updateArgs.data, false);
});
