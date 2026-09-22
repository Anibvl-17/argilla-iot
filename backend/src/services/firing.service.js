import { prisma } from "../config/prisma.js";
import {
  ACTIVE_FIRING_STATUSES,
  MAX_TEMPERATURE_C,
  MAX_START_TEMPERATURE_C,
  MIN_TEMPERATURE_C,
} from "../constants/firing.constants.js";

function serviceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

const cycleInclude = {
  program: {
    select: {
      programId: true,
      name: true,
      description: true,
      configuration: true,
    },
  },
};

export function listAvailablePrograms(userId) {
  return prisma.program.findMany({
    where: { OR: [{ userId: null }, { userId }] },
    select: {
      programId: true,
      name: true,
      description: true,
      configuration: true,
      userId: true,
    },
    orderBy: [{ userId: "asc" }, { programId: "asc" }],
  });
}

export async function getOwnedFiringContext(userId, kilnId) {
  return prisma.kiln.findFirst({
    where: { kilnId, userId },
    select: {
      kilnId: true,
      userId: true,
      selectedProgramId: true,
      selectedProgram: {
        select: {
          programId: true,
          name: true,
          description: true,
          configuration: true,
        },
      },
      controller: {
        select: {
          controllerId: true,
          connectionStatus: true,
          activityStatus: true,
          operationalStatus: true,
          temperature: true,
        },
      },
      firingCycles: {
        where: { status: { in: ACTIVE_FIRING_STATUSES } },
        include: cycleInclude,
        orderBy: { startedAt: "desc" },
        take: 1,
      },
    },
  });
}

export async function selectOwnedKilnProgram(userId, kilnId, programId) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "kilnId" FROM "Kiln" WHERE "kilnId" = ${kilnId} FOR UPDATE`;
    const kiln = await tx.kiln.findFirst({
      where: { kilnId, userId },
      include: { controller: true },
    });
    if (!kiln) throw serviceError("NOT_FOUND", "Horno no encontrado");
    if (!kiln.controller) {
      throw serviceError("CONTROLLER_REQUIRED", "El horno no tiene controlador");
    }
    if (kiln.controller.connectionStatus !== "ONLINE") {
      throw serviceError(
        "CONTROLLER_OFFLINE",
        "El controlador debe estar conectado para cambiar el programa",
      );
    }
    const active = await tx.firingCycle.findFirst({
      where: { kilnId, status: { in: ACTIVE_FIRING_STATUSES } },
      select: { firingCycleId: true },
    });
    if (active) {
      throw serviceError(
        "CYCLE_ACTIVE",
        "No se puede cambiar el programa durante una quema",
      );
    }
    const program = await tx.program.findFirst({
      where: { programId, OR: [{ userId: null }, { userId }] },
      select: {
        programId: true,
        name: true,
        description: true,
        configuration: true,
      },
    });
    if (!program) throw serviceError("PROGRAM_NOT_FOUND", "Programa no disponible");
    await tx.kiln.update({
      where: { kilnId },
      data: { selectedProgramId: programId },
    });
    return program;
  });
}

export async function applyControllerSelection(controllerId, programId) {
  return prisma.$transaction(async (tx) => {
    const controller = await tx.controller.findUnique({
      where: { controllerId },
      include: { kiln: true },
    });
    if (!controller?.kiln?.userId) return null;
    const program = await tx.program.findFirst({
      where: {
        programId,
        OR: [{ userId: null }, { userId: controller.kiln.userId }],
      },
      select: { programId: true },
    });
    if (!program) return null;
    return tx.kiln.update({
      where: { kilnId: controller.kiln.kilnId },
      data: { selectedProgramId: programId },
      select: { kilnId: true, selectedProgramId: true },
    });
  });
}

export async function assertCanStart(context) {
  if (!context) throw serviceError("NOT_FOUND", "Horno no encontrado");
  if (!context.controller) {
    throw serviceError("CONTROLLER_REQUIRED", "El horno no tiene controlador");
  }
  if (context.controller.connectionStatus !== "ONLINE") {
    throw serviceError("CONTROLLER_OFFLINE", "El controlador está desconectado");
  }
  if (context.controller.operationalStatus !== "OPERATIONAL") {
    throw serviceError("CONTROLLER_UNAVAILABLE", "El controlador no está operativo");
  }
  if (context.firingCycles.length > 0) {
    throw serviceError("CYCLE_ACTIVE", "El horno ya tiene una quema activa");
  }
  if (
    context.controller.temperature == null ||
    context.controller.temperature >= MAX_START_TEMPERATURE_C
  ) {
    throw serviceError(
      "START_TEMPERATURE_INVALID",
      "La temperatura inicial debe ser inferior a 35 °C",
    );
  }
  if (!context.selectedProgram) {
    throw serviceError("PROGRAM_REQUIRED", "Selecciona un programa de quema");
  }
}

function cycleDataFromSnapshot(kilnId, snapshot) {
  return {
    kilnId,
    programId: Number(snapshot.programId),
    programConfig: snapshot.programConfig,
    startedAt: new Date(snapshot.startedAt),
    endedAt: snapshot.endedAt ? new Date(snapshot.endedAt) : null,
    status: snapshot.status,
    statusReasonCode: snapshot.statusReasonCode || null,
    statusReason: snapshot.statusReason || null,
  };
}

function mutableCycleDataFromSnapshot(snapshot) {
  return {
    endedAt: snapshot.endedAt ? new Date(snapshot.endedAt) : null,
    status: snapshot.status,
    statusReasonCode: snapshot.statusReasonCode || null,
    statusReason: snapshot.statusReason || null,
  };
}

function assertValidCycleSnapshot(snapshot) {
  const stages = snapshot?.programConfig?.stages;
  const validProgram =
    Number.isInteger(Number(snapshot?.programId)) &&
    snapshot?.programConfig?.schemaVersion === 1 &&
    Number.isFinite(snapshot?.programConfig?.initialTemperature) &&
    snapshot.programConfig.initialTemperature >= MIN_TEMPERATURE_C &&
    snapshot.programConfig.initialTemperature <= MAX_TEMPERATURE_C &&
    Array.isArray(stages) &&
    stages.length > 0 &&
    stages.every(
      ({ durationMinutes, targetTemperature }) =>
        Number.isFinite(durationMinutes) &&
        durationMinutes > 0 &&
        Number.isFinite(targetTemperature) &&
        targetTemperature >= MIN_TEMPERATURE_C &&
        targetTemperature <= MAX_TEMPERATURE_C,
    );
  if (
    !snapshot?.controllerCycleId ||
    ![...ACTIVE_FIRING_STATUSES, "COMPLETED", "CANCELLED", "ERROR", "UNKNOWN"].includes(
      snapshot.status,
    ) ||
    !validProgram ||
    Number.isNaN(Date.parse(snapshot.startedAt)) ||
    (snapshot.endedAt && Number.isNaN(Date.parse(snapshot.endedAt)))
  ) {
    throw serviceError("INVALID_CYCLE_SNAPSHOT", "Snapshot de ciclo inválido");
  }
}

export async function upsertControllerCycle(controllerId, snapshot) {
  assertValidCycleSnapshot(snapshot);
  const controller = await prisma.controller.findUnique({
    where: { controllerId },
    select: { kiln: { select: { kilnId: true } } },
  });
  if (!controller?.kiln) {
    throw serviceError("CONTROLLER_KILN_REQUIRED", "Controlador sin horno");
  }
  const kilnId = controller.kiln.kilnId;
  const existing = await prisma.firingCycle.findUnique({
    where: { controllerCycleId: snapshot.controllerCycleId },
    include: cycleInclude,
  });
  if (existing && existing.kilnId !== kilnId) {
    throw serviceError(
      "CYCLE_OWNERSHIP_MISMATCH",
      "El ciclo pertenece a otro horno",
    );
  }
  if (existing && !ACTIVE_FIRING_STATUSES.includes(existing.status)) {
    return existing;
  }
  if (!existing) {
    const active = await prisma.firingCycle.findFirst({
      where: { kilnId, status: { in: ACTIVE_FIRING_STATUSES } },
    });
    if (active) {
      const error = serviceError("CYCLE_CONFLICT", "Existe otro ciclo activo");
      error.activeCycle = active;
      error.incomingSnapshot = snapshot;
      error.kilnId = kilnId;
      throw error;
    }
    const data = cycleDataFromSnapshot(kilnId, snapshot);
    return prisma.firingCycle.create({
      data: { controllerCycleId: snapshot.controllerCycleId, ...data },
      include: cycleInclude,
    });
  }
  return prisma.firingCycle.update({
    where: { controllerCycleId: snapshot.controllerCycleId },
    data: mutableCycleDataFromSnapshot(snapshot),
    include: cycleInclude,
  });
}

export async function resolveCycleConflictAsUnknown({
  kilnId,
  activeCycleId,
  incomingSnapshot,
}) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "kilnId" FROM "Kiln" WHERE "kilnId" = ${kilnId} FOR UPDATE`;
    const active = await tx.firingCycle.findFirst({
      where: {
        firingCycleId: activeCycleId,
        kilnId,
        status: { in: ACTIVE_FIRING_STATUSES },
      },
    });
    if (active) {
      await tx.firingCycle.update({
        where: { firingCycleId: active.firingCycleId },
        data: {
          status: "UNKNOWN",
          statusReasonCode: "FINAL_STATE_UNRECOVERABLE",
          statusReason:
            "El controlador confirmó que el ciclo ya no estaba activo y no pudo recuperar su resultado final",
        },
      });
    }
    if (!incomingSnapshot) {
      return active
        ? tx.firingCycle.findUnique({
            where: { firingCycleId: active.firingCycleId },
            include: cycleInclude,
          })
        : null;
    }
    assertValidCycleSnapshot(incomingSnapshot);
    const existingIncoming = await tx.firingCycle.findUnique({
      where: { controllerCycleId: incomingSnapshot.controllerCycleId },
    });
    if (existingIncoming && existingIncoming.kilnId !== kilnId) {
      throw serviceError(
        "CYCLE_OWNERSHIP_MISMATCH",
        "El ciclo pertenece a otro horno",
      );
    }
    if (existingIncoming) {
      if (!ACTIVE_FIRING_STATUSES.includes(existingIncoming.status)) {
        return tx.firingCycle.findUnique({
          where: { controllerCycleId: incomingSnapshot.controllerCycleId },
          include: cycleInclude,
        });
      }
      return tx.firingCycle.update({
        where: { controllerCycleId: incomingSnapshot.controllerCycleId },
        data: mutableCycleDataFromSnapshot(incomingSnapshot),
        include: cycleInclude,
      });
    }
    const data = cycleDataFromSnapshot(kilnId, incomingSnapshot);
    return tx.firingCycle.create({
      data: {
        controllerCycleId: incomingSnapshot.controllerCycleId,
        ...data,
      },
      include: cycleInclude,
    });
  });
}

export async function persistControllerSample(
  controllerCycleId,
  sample,
  controllerId = null,
) {
  const cycle = await prisma.firingCycle.findFirst({
    where: {
      controllerCycleId,
      ...(controllerId ? { kiln: { controllerId } } : {}),
    },
    select: { firingCycleId: true },
  });
  if (!cycle) return null;
  return prisma.telemetry.upsert({
    where: {
      firingCycleId_sampleSequence: {
        firingCycleId: cycle.firingCycleId,
        sampleSequence: Number(sample.sampleSequence),
      },
    },
    create: {
      firingCycleId: cycle.firingCycleId,
      sampleSequence: Number(sample.sampleSequence),
      sampleType: sample.sampleType,
      temperature: Number(sample.temperature),
      setpointTemperature: Number(sample.setpointTemperature),
      switchState: Boolean(sample.switchState),
      stageIndex:
        sample.stageIndex == null ? null : Number(sample.stageIndex),
      voltage: Number(sample.voltage),
      current: Number(sample.current),
      timestamp: new Date(sample.timestamp),
    },
    update: {},
  });
}

export function hasFinalSample(controllerCycleId) {
  return prisma.telemetry.findFirst({
    where: {
      firingCycle: { controllerCycleId },
      sampleType: "FINAL",
    },
    select: { telemetryId: true },
  });
}

async function listCyclesForKiln(
  kilnId,
  page = 1,
  pageSize = 10,
  ownerUserId = null,
) {
  const kiln = await prisma.kiln.findFirst({
    where: { kilnId, ...(ownerUserId == null ? {} : { userId: ownerUserId }) },
    select: { kilnId: true },
  });
  if (!kiln) return null;
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(50, Math.max(1, Number(pageSize) || 10));
  const where = { kilnId };
  const [items, total] = await prisma.$transaction([
    prisma.firingCycle.findMany({
      where,
      include: cycleInclude,
      orderBy: { startedAt: "desc" },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    }),
    prisma.firingCycle.count({ where }),
  ]);
  return {
    items,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    },
  };
}

export function listOwnedCycles(userId, kilnId, page = 1, pageSize = 10) {
  return listCyclesForKiln(kilnId, page, pageSize, userId);
}

export function listAdminCycles(kilnId, page = 1, pageSize = 10) {
  return listCyclesForKiln(kilnId, page, pageSize);
}

async function getCycleTelemetryForKiln(
  kilnId,
  firingCycleId,
  page = 1,
  pageSize = 20,
  ownerUserId = null,
) {
  const cycle = await prisma.firingCycle.findFirst({
    where: {
      firingCycleId,
      kilnId,
      ...(ownerUserId == null ? {} : { kiln: { userId: ownerUserId } }),
    },
    include: cycleInclude,
  });
  if (!cycle) return null;
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 20));
  const where = { firingCycleId };
  const [items, total] = await prisma.$transaction([
    prisma.telemetry.findMany({
      where,
      orderBy: [{ sampleSequence: "asc" }],
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    }),
    prisma.telemetry.count({ where }),
  ]);
  return {
    cycle,
    items,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / safePageSize)),
    },
  };
}

export function getOwnedCycleTelemetry(
  userId,
  kilnId,
  firingCycleId,
  page = 1,
  pageSize = 20,
) {
  return getCycleTelemetryForKiln(
    kilnId,
    firingCycleId,
    page,
    pageSize,
    userId,
  );
}

export function getAdminCycleTelemetry(
  kilnId,
  firingCycleId,
  page = 1,
  pageSize = 20,
) {
  return getCycleTelemetryForKiln(kilnId, firingCycleId, page, pageSize);
}

export function getCycleByControllerId(controllerCycleId) {
  return prisma.firingCycle.findUnique({
    where: { controllerCycleId },
    include: cycleInclude,
  });
}
