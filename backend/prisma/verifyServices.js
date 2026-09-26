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
  anonymizeOwnUser,
  anonymizeUser,
  createUser,
  deactivateOwnUser,
  setUserActive,
} from "../src/services/user.service.js";
import { login } from "../src/services/auth.service.js";

const prisma = new PrismaClient();

async function verifyCircuitValidation() {
  const valid = {
    type: "ROOT",
    connectionType: "SERIES",
    elements: [
      {
        type: "CHANNEL",
        name: "Puerta",
        resistanceOhms: 18.5,
        lengthMeters: 6.2,
      },
    ],
  };
  assert.equal(
    heatingCircuitConfigurationValidation.safeParse(valid).success,
    true,
  );
  assert.equal(
    heatingCircuitConfigurationValidation.safeParse({ ...valid, elements: [] })
      .success,
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
  const commune = await prisma.commune.findUniqueOrThrow({
    where: { code: "08101" },
    include: { region: { include: { country: true } } },
  });
  const email = `verify-services-${Date.now()}@argilla.test`;
  const user = await createUser({
    email,
    name: "Persona de Verificación",
    phone: "9 8765 4321",
    phoneCountryCode: "CL",
    countryId: commune.region.country.countryId,
    regionId: commune.regionId,
    communeId: commune.communeId,
    addressLine: "Los Carrera 1234",
    password: "Password123!",
    role: "CLIENT",
  });
  try {
    assert.equal(user.phone, "+56987654321");
    assert.equal(user.countryId, commune.region.country.countryId);
    assert.equal(user.regionId, commune.regionId);
    assert.equal(user.communeId, commune.communeId);
    assert.equal(user.addressLine, "Los Carrera 1234");
    await setUserActive(user.userId, false, adminId);
    await assert.rejects(() => login(email, "Password123!"), {
      code: "ACCOUNT_INACTIVE",
    });
    await setUserActive(user.userId, true, adminId);
    const anonymized = await anonymizeUser(user.userId, adminId);
    assert.equal(anonymized.isActive, false);
    assert.ok(anonymized.anonymizedAt);
    assert.equal(anonymized.phone, null);
    assert.equal(anonymized.countryId, null);
    assert.equal(anonymized.regionId, null);
    assert.equal(anonymized.communeId, null);
    assert.equal(anonymized.addressLine, null);
    assert.equal("passwordHash" in anonymized, false);
  } finally {
    await prisma.user.deleteMany({ where: { userId: user.userId } });
  }
}

async function verifyOwnAccountActions() {
  const commune = await prisma.commune.findUniqueOrThrow({
    where: { code: "08101" },
    include: { region: { include: { country: true } } },
  });
  const location = {
    countryId: commune.region.country.countryId,
    regionId: commune.regionId,
    communeId: commune.communeId,
  };
  const timestamp = Date.now();
  const deactivated = await createUser({
    email: `verify-own-deactivate-${timestamp}@argilla.test`,
    name: "Cuenta a desactivar",
    password: "Password123!",
    role: "CLIENT",
    ...location,
  });
  const deleted = await createUser({
    email: `verify-own-delete-${timestamp}@argilla.test`,
    name: "Cuenta a eliminar",
    phone: "+56987654321",
    password: "Password123!",
    role: "CLIENT",
    ...location,
  });

  try {
    const inactive = await deactivateOwnUser(deactivated.userId);
    assert.equal(inactive.isActive, false);

    const anonymized = await anonymizeOwnUser(deleted.userId);
    assert.equal(anonymized.isActive, false);
    assert.ok(anonymized.anonymizedAt);
    assert.equal(anonymized.phone, null);
    assert.equal(anonymized.countryId, null);
    assert.equal(anonymized.regionId, null);
    assert.equal(anonymized.communeId, null);
    assert.equal(anonymized.addressLine, null);
  } finally {
    await prisma.user.deleteMany({
      where: { userId: { in: [deactivated.userId, deleted.userId] } },
    });
  }
}

async function verifyPairing() {
  const controllerId = "55555555-5555-4555-8555-555555555555";
  const kiln = await prisma.kiln.findFirstOrThrow({
    where: { name: "Horno huérfano 1" },
  });
  const client = await prisma.user.findUniqueOrThrow({
    where: { email: "maria@argilla.test" },
  });
  const seedSecret =
    process.env.SEED_DEVICE_SECRET || "argilla-local-device-secret-change-me";
  const deviceSecret = `${seedSecret}:${controllerId}`;

  await unlinkUserFromKiln(kiln.kilnId);
  await unlinkControllerFromKiln(kiln.kilnId);
  await linkControllerToKiln(kiln.kilnId, controllerId);
  try {
    await receivePairingPin(controllerId, "123456", deviceSecret);
    await assert.rejects(
      () =>
        claimControllerBundle(controllerId.slice(-6), client.userId, "000000"),
      { code: "PAIRING_PIN_INVALID" },
    );
    let controller = await prisma.controller.findUniqueOrThrow({
      where: { controllerId },
    });
    assert.equal(controller.pairingFailedAttempts, 1);

    await receivePairingPin(controllerId, "123456", deviceSecret);
    controller = await prisma.controller.findUniqueOrThrow({
      where: { controllerId },
    });
    assert.equal(controller.pairingFailedAttempts, 1);

    const claimed = await claimControllerBundle(
      controllerId.slice(-6),
      client.userId,
      "123456",
    );
    assert.equal(claimed.userId, client.userId);
    assert.equal("deviceSecretHash" in claimed, false);
    assert.equal("pairingPinHash" in claimed, false);
    const claimedKiln = await prisma.kiln.findUniqueOrThrow({
      where: { kilnId: kiln.kilnId },
    });
    assert.equal(claimedKiln.userId, client.userId);

    await receivePairingPin(controllerId, "654321", deviceSecret);
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      await assert.rejects(
        () =>
          claimControllerBundle(
            controllerId.slice(-6),
            client.userId,
            "000000",
          ),
        { code: attempt === 10 ? "PAIRING_BLOCKED" : "PAIRING_PIN_INVALID" },
      );
    }
    controller = await prisma.controller.findUniqueOrThrow({
      where: { controllerId },
    });
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
  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: "admin@argilla.test" },
  });
  await verifyInactiveAndAnonymizedUsers(admin.userId);
  await verifyOwnAccountActions();
  await verifyPairing();
  console.log("[CHECK] Servicios verificados");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
