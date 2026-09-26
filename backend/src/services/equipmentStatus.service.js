import { prisma } from "../config/prisma.js";
import { ACTIVE_FIRING_STATUSES } from "../constants/firing.constants.js";

export const EQUIPMENT_STATUS_TARGETS = {
  KILN: "KILN",
  CONTROLLER: "CONTROLLER",
};

function serviceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function assertKilnHasNoActiveCycle(tx, kilnId) {
  const activeCycle = await tx.firingCycle.findFirst({
    where: { kilnId, status: { in: ACTIVE_FIRING_STATUSES } },
    select: { firingCycleId: true },
  });
  if (activeCycle) {
    throw serviceError(
      "CYCLE_ACTIVE",
      "No se puede cambiar a un estado no operativo durante una quema activa",
    );
  }
}

async function updateKilnStatus(tx, kilnId, operationalStatus) {
  const locked = await tx.$queryRaw`
    SELECT "kilnId" FROM "Kiln" WHERE "kilnId" = ${kilnId} FOR UPDATE
  `;
  if (locked.length === 0) {
    throw serviceError("NOT_FOUND", "Horno no encontrado");
  }

  const kiln = await tx.kiln.findUnique({
    where: { kilnId },
    select: {
      kilnId: true,
      name: true,
      controllerId: true,
      operationalStatus: true,
    },
  });
  if (!kiln) throw serviceError("NOT_FOUND", "Horno no encontrado");
  if (kiln.operationalStatus === operationalStatus) return kiln;

  if (operationalStatus !== "OPERATIONAL") {
    await assertKilnHasNoActiveCycle(tx, kilnId);
  }

  return tx.kiln.update({
    where: { kilnId },
    data: { operationalStatus },
    select: {
      kilnId: true,
      name: true,
      controllerId: true,
      operationalStatus: true,
    },
  });
}

async function updateControllerStatus(
  tx,
  controllerId,
  operationalStatus,
  expectedKilnId,
) {
  let controller = await tx.controller.findUnique({
    where: { controllerId },
    select: {
      controllerId: true,
      operationalStatus: true,
      kiln: { select: { kilnId: true } },
    },
  });
  if (!controller) {
    throw serviceError("NOT_FOUND", "Controlador no encontrado");
  }

  const kilnId = controller.kiln?.kilnId ?? null;
  if (expectedKilnId !== undefined && kilnId !== expectedKilnId) {
    throw serviceError(
      "INVALID_TARGET",
      "El controlador no corresponde al horno del ticket",
    );
  }

  if (kilnId !== null) {
    const locked = await tx.$queryRaw`
      SELECT "kilnId" FROM "Kiln" WHERE "kilnId" = ${kilnId} FOR UPDATE
    `;
    if (locked.length === 0) {
      throw serviceError("INVALID_TARGET", "El horno vinculado no existe");
    }
    controller = await tx.controller.findUnique({
      where: { controllerId },
      select: {
        controllerId: true,
        operationalStatus: true,
        kiln: { select: { kilnId: true } },
      },
    });
    if (!controller) {
      throw serviceError("NOT_FOUND", "Controlador no encontrado");
    }
    if (controller.kiln?.kilnId !== kilnId) {
      throw serviceError(
        "STATE_CONFLICT",
        "La vinculación del controlador cambió durante la actualización",
      );
    }
  }

  if (controller.operationalStatus === operationalStatus) return controller;

  if (operationalStatus !== "OPERATIONAL" && kilnId !== null) {
    await assertKilnHasNoActiveCycle(tx, kilnId);
  }

  return tx.controller.update({
    where: { controllerId },
    data: { operationalStatus },
    select: {
      controllerId: true,
      operationalStatus: true,
      kiln: { select: { kilnId: true } },
    },
  });
}

export function updateEquipmentOperationalStatusInTransaction(
  tx,
  { target, kilnId, controllerId, operationalStatus, expectedKilnId },
) {
  if (target === EQUIPMENT_STATUS_TARGETS.KILN) {
    return updateKilnStatus(tx, kilnId, operationalStatus);
  }
  if (target === EQUIPMENT_STATUS_TARGETS.CONTROLLER) {
    return updateControllerStatus(
      tx,
      controllerId,
      operationalStatus,
      expectedKilnId,
    );
  }
  throw serviceError("INVALID_TARGET", "Equipo no válido");
}

export function updateEquipmentOperationalStatus(data) {
  return prisma.$transaction((tx) =>
    updateEquipmentOperationalStatusInTransaction(tx, data),
  );
}
