import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { heatingCircuitConfigurationValidation } from "../src/validations/kiln.validation.js";
import {
  claimControllerBundle,
  receivePairingPin,
} from "../src/services/controller.service.js";
import {
  linkControllerToKiln,
  unlinkControllerFromKiln,
  unlinkUserFromKiln,
} from "../src/services/kiln.service.js";
import {
  anonymizeUser,
  createUser,
  setUserActive,
} from "../src/services/user.service.js";
import { login } from "../src/services/auth.service.js";

const prisma = new PrismaClient();

async function verifyCircuitValidation() {
  const valid = {
    type: "ROOT",
    connectionType: "SERIES",
    elements: [
      { type: "CHANNEL", name: "Puerta", resistanceOhms: 18.5, lengthMeters: 6.2 },
    ],
  };
  assert.equal(heatingCircuitConfigurationValidation.safeParse(valid).success, true);
  assert.equal(
    heatingCircuitConfigurationValidation.safeParse({ ...valid, elements: [] }).success,
    false,
  );
  assert.equal(
    heatingCircuitConfigurationValidation.safeParse({
      ...valid,
      elements: [{ type: "ROOT", connectionType: "SERIES", elements: [] }],
    }).success,
    false,
  );
}

async function verifyInactiveAndAnonymizedUsers(adminId) {
  const email = `verify-services-${Date.now()}@argilla.test`;
  const user = await createUser({
    email,
    name: "Persona de Verificación",
    phone: "+56 9 0000 0000",
    password: "Password123!",
    role: "CLIENT",
  });
  try {
    await setUserActive(user.userId, false, adminId);
    await assert.rejects(() => login(email, "Password123!"), { code: "ACCOUNT_INACTIVE" });
    await setUserActive(user.userId, true, adminId);
    const anonymized = await anonymizeUser(user.userId, adminId);
    assert.equal(anonymized.isActive, false);
    assert.ok(anonymized.anonymizedAt);
    assert.equal("passwordHash" in anonymized, false);
  } finally {
    await prisma.user.deleteMany({ where: { userId: user.userId } });
  }
}

async function verifyPairing() {
  const controllerId = "55555555-5555-4555-8555-555555555555";
  const kiln = await prisma.kiln.findFirstOrThrow({ where: { name: "Horno huérfano 1" } });
  const client = await prisma.user.findUniqueOrThrow({ where: { email: "maria@argilla.test" } });
  const seedSecret = process.env.SEED_DEVICE_SECRET || "argilla-local-device-secret-change-me";
  const deviceSecret = `${seedSecret}:${controllerId}`;

  await unlinkUserFromKiln(kiln.kilnId);
  await unlinkControllerFromKiln(kiln.kilnId);
  await linkControllerToKiln(kiln.kilnId, controllerId);
  try {
    await receivePairingPin(controllerId, "123456", deviceSecret);
    await assert.rejects(
      () => claimControllerBundle(controllerId.slice(-6), client.userId, "000000"),
      { code: "PAIRING_PIN_INVALID" },
    );
    let controller = await prisma.controller.findUniqueOrThrow({ where: { controllerId } });
    assert.equal(controller.pairingFailedAttempts, 1);

    await receivePairingPin(controllerId, "123456", deviceSecret);
    controller = await prisma.controller.findUniqueOrThrow({ where: { controllerId } });
    assert.equal(controller.pairingFailedAttempts, 1);

    const claimed = await claimControllerBundle(controllerId.slice(-6), client.userId, "123456");
    assert.equal(claimed.userId, client.userId);
    assert.equal("deviceSecretHash" in claimed, false);
    assert.equal("pairingPinHash" in claimed, false);
    const claimedKiln = await prisma.kiln.findUniqueOrThrow({ where: { kilnId: kiln.kilnId } });
    assert.equal(claimedKiln.userId, client.userId);

    await receivePairingPin(controllerId, "654321", deviceSecret);
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      await assert.rejects(
        () => claimControllerBundle(controllerId.slice(-6), client.userId, "000000"),
        { code: attempt === 10 ? "PAIRING_BLOCKED" : "PAIRING_PIN_INVALID" },
      );
    }
    controller = await prisma.controller.findUniqueOrThrow({ where: { controllerId } });
    assert.equal(controller.pairingFailedAttempts, 10);
    assert.ok(controller.pairingBlockedUntil > new Date());
    assert.equal(controller.pairingPinHash, null);
    await assert.rejects(
      () => receivePairingPin(controllerId, "111111", deviceSecret),
      { code: "PAIRING_BLOCKED" },
    );
  } finally {
    await unlinkUserFromKiln(kiln.kilnId);
    await unlinkControllerFromKiln(kiln.kilnId);
    await prisma.controller.update({
      where: { controllerId },
      data: {
        pairingPinHash: null,
        pairingPinExpiresAt: null,
        pairingFailedAttempts: 0,
        pairingBlockedUntil: null,
      },
    });
  }
}

async function main() {
  await verifyCircuitValidation();
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@argilla.test" } });
  await verifyInactiveAndAnonymizedUsers(admin.userId);
  await verifyPairing();
  console.log("Service verification passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
