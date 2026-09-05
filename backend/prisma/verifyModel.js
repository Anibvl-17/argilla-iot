import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const rollbackMarker = new Error("ROLLBACK_MODEL_VERIFICATION");
const validCircuit = {
  type: "ROOT",
  connectionType: "PARALLEL",
  elements: [
    {
      type: "CHANNEL",
      name: "Verification channel",
      resistanceOhms: 10,
      lengthMeters: 2,
    },
  ],
};

async function expectConstraintViolation(work, label) {
  await assert.rejects(work, undefined, label);
}

async function verifySeed() {
  const reasons = await prisma.supportReason.findMany({
    orderBy: { code: "asc" },
    select: { code: true },
  });
  assert.deepEqual(
    reasons.map(({ code }) => code),
    [
      "CONNECTIVITY",
      "CONTROLLER",
      "ELECTRICAL",
      "FIRING_PROBLEM",
      "OTHER",
      "TEMPERATURE",
    ],
  );
  assert.equal(await prisma.telemetry.count(), 0);

  const roles = await prisma.user.groupBy({ by: ["role"] });
  assert.ok(roles.some(({ role }) => role === "ADMIN"));
  assert.ok(roles.some(({ role }) => role === "TECHNICIAN"));
  assert.ok(roles.some(({ role }) => role === "CLIENT"));
  assert.equal(await prisma.user.count({ where: { isActive: false } }), 0);
  assert.equal(
    await prisma.kiln.count({
      where: { heatingCircuitConfiguration: { equals: { type: "ROOT", connectionType: "PARALLEL", elements: [] } } },
    }),
    0,
  );

  const controllers = await prisma.controller.findMany({
    select: { deviceSecretHash: true, pairingPinHash: true },
  });
  assert.ok(controllers.length > 0);
  assert.ok(
    controllers.every(
      ({ deviceSecretHash, pairingPinHash }) =>
        deviceSecretHash.startsWith("$2") && pairingPinHash === null,
    ),
  );
}

async function verifyFiringCycleCheck() {
  await expectConstraintViolation(
    () =>
      prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: "verify-cycle-invalid@argilla.test",
            passwordHash: "not-a-real-password-hash",
            name: "Model verification",
          },
        });
        const kiln = await tx.kiln.create({
          data: { userId: user.userId, liters: 1, nominalCurrent: 1, heatingCircuitConfiguration: validCircuit },
        });
        await tx.firingCycle.create({
          data: { kilnId: kiln.kilnId, executionType: "DIRECT" },
        });
      }),
    "DIRECT cycles without targetTemperature must be rejected",
  );

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: "verify-cycle-valid@argilla.test",
          passwordHash: "not-a-real-password-hash",
          name: "Model verification",
        },
      });
      const kiln = await tx.kiln.create({
        data: { userId: user.userId, liters: 1, nominalCurrent: 1, heatingCircuitConfiguration: validCircuit },
      });
      const configuration = {
        stages: [
          {
            targetTemperature: 600,
            rampDurationMinutes: 120,
            holdDurationMinutes: 0,
          },
        ],
      };
      const program = await tx.program.create({
        data: {
          userId: user.userId,
          name: "Verification program",
          configuration,
        },
      });

      await tx.firingCycle.create({
        data: {
          kilnId: kiln.kilnId,
          executionType: "DIRECT",
          targetTemperature: 600,
        },
      });
      await tx.firingCycle.create({
        data: {
          kilnId: kiln.kilnId,
          programId: program.programId,
          executionType: "PROGRAM",
          programConfig: configuration,
        },
      });
      throw rollbackMarker;
    });
  } catch (error) {
    if (error !== rollbackMarker) throw error;
  }
}

async function verifyRelationsAndChecks() {
  await expectConstraintViolation(
    () =>
      prisma.telemetry.create({
        data: {
          firingCycleId: 2147483647,
          temperature: 20,
          setpointTemperature: 20,
          switchState: false,
          voltage: 0,
          current: 0,
        },
      }),
    "Telemetry without a firing cycle must be rejected",
  );

  await expectConstraintViolation(
    () =>
      prisma.$transaction(async (tx) => {
        const controller = await tx.controller.create({
          data: { deviceSecretHash: "not-a-real-device-secret-hash" },
        });
        await tx.kiln.create({
          data: {
            controllerId: controller.controllerId,
            liters: 1,
            nominalCurrent: 1,
            heatingCircuitConfiguration: validCircuit,
          },
        });
        await tx.kiln.create({
          data: {
            controllerId: controller.controllerId,
            liters: 1,
            nominalCurrent: 1,
            heatingCircuitConfiguration: validCircuit,
          },
        });
      }),
    "A controller cannot be linked to two kilns",
  );

  await expectConstraintViolation(
    () =>
      prisma.$transaction(async (tx) => {
        const technician = await tx.user.create({
          data: {
            email: "verify-maintenance@argilla.test",
            passwordHash: "not-a-real-password-hash",
            name: "Model verification",
            role: "TECHNICIAN",
          },
        });
        await tx.maintenanceRecord.create({
          data: {
            performedByUserId: technician.userId,
            type: "INSPECTION",
            title: "Invalid maintenance",
            workPerformed: "No target",
            performedAt: new Date(),
          },
        });
      }),
    "Maintenance without kiln or controller must be rejected",
  );

  await expectConstraintViolation(
    () =>
      prisma.supportReason.create({
        data: { code: "CONTROLLER", name: "Duplicate" },
      }),
    "Support reason codes must be unique",
  );

  await expectConstraintViolation(
    () =>
      prisma.$transaction(async (tx) => {
        await tx.controller.create({
          data: {
            controllerId: "12345678-1234-4234-8234-123456abcdef",
            deviceSecretHash: "hash",
          },
        });
        await tx.controller.create({
          data: {
            controllerId: "87654321-4321-4321-8321-654321abcdef",
            deviceSecretHash: "hash",
          },
        });
      }),
    "Controller pairing suffixes must be unique",
  );

  const suffixIndex = await prisma.$queryRaw`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'Controller'
      AND indexname = 'Controller_pairing_suffix_key'
  `;
  assert.equal(suffixIndex.length, 1);
}

async function main() {
  await verifySeed();
  await verifyFiringCycleCheck();
  await verifyRelationsAndChecks();
  console.log("Model verification passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
