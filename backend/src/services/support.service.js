import { prisma } from "../config/prisma.js";
import { ROLES } from "../constants/user.constants.js";
import {
  EQUIPMENT_STATUS_TARGETS,
  updateEquipmentOperationalStatusInTransaction,
} from "./equipmentStatus.service.js";

const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

function serviceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function ticketScope(actor) {
  if (actor.role === ROLES.ADMIN) return {};
  if (actor.role === ROLES.TECHNICIAN) {
    return {
      OR: [{ assignedToUserId: null }, { assignedToUserId: actor.id }],
    };
  }
  return { createdByUserId: actor.id };
}

const ticketInclude = {
  supportReason: true,
  kiln: {
    select: {
      kilnId: true,
      name: true,
      operationalStatus: true,
      controllerId: true,
    },
  },
  createdByUser: {
    select: { userId: true, name: true, email: true, phone: true },
  },
  assignedToUser: {
    select: { userId: true, name: true, role: true, isActive: true },
  },
  maintenanceRecords: {
    include: {
      performedByUser: { select: { userId: true, name: true, role: true } },
    },
    orderBy: { performedAt: "desc" },
  },
};

function presentTicket(ticket, actor, { summary = false } = {}) {
  const kiln = ticket.kiln
    ? {
        kilnId: ticket.kiln.kilnId,
        name: ticket.kiln.name,
        operationalStatus: ticket.kiln.operationalStatus,
      }
    : null;
  const base = {
    supportTicketId: ticket.supportTicketId,
    supportReasonId: ticket.supportReasonId,
    supportReason: ticket.supportReason,
    kilnId: ticket.kilnId,
    kiln,
    title: ticket.title,
    description: summary ? undefined : ticket.description,
    status: ticket.status,
    resolution: summary ? undefined : ticket.resolution,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };

  if (actor.role === ROLES.CLIENT) return base;

  return {
    ...base,
    createdByUser: ticket.createdByUser,
    assignedToUser: ticket.assignedToUser,
    assignedToUserId: ticket.assignedToUserId,
    ...(summary ? {} : { maintenanceRecords: ticket.maintenanceRecords }),
  };
}

function parseDate(value, endOfDay = false) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    throw serviceError("INVALID_FILTER", "Fecha de filtro inválida");
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setUTCHours(23, 59, 59, 999);
  }
  return date;
}

async function findVisibleTicket(
  actor,
  supportTicketId,
  include = ticketInclude,
) {
  return prisma.supportTicket.findFirst({
    where: { supportTicketId, ...ticketScope(actor) },
    include,
  });
}

export function listSupportReasons(actor, includeInactive = false) {
  return prisma.supportReason.findMany({
    where:
      actor.role === ROLES.ADMIN && includeInactive ? {} : { isActive: true },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export async function createSupportReason(data) {
  try {
    return await prisma.supportReason.create({ data });
  } catch (error) {
    if (error.code === "P2002")
      throw serviceError("DUPLICATE_REASON", "El código ya está en uso");
    throw error;
  }
}

export async function updateSupportReason(supportReasonId, data) {
  try {
    return await prisma.supportReason.update({
      where: { supportReasonId },
      data,
    });
  } catch (error) {
    if (error.code === "P2025")
      throw serviceError("NOT_FOUND", "Motivo no encontrado");
    throw error;
  }
}

export function listEligibleAssignees() {
  return prisma.user.findMany({
    where: {
      role: { in: [ROLES.ADMIN, ROLES.TECHNICIAN] },
      isActive: true,
      anonymizedAt: null,
    },
    select: { userId: true, name: true, email: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

export async function createSupportTicket(actor, data) {
  if (actor.role !== ROLES.CLIENT) {
    throw serviceError("FORBIDDEN", "Solo los clientes pueden crear tickets");
  }

  const [kiln, reason] = await Promise.all([
    data.kilnId
      ? prisma.kiln.findFirst({
          where: { kilnId: data.kilnId, userId: actor.id },
        })
      : Promise.resolve(null),
    prisma.supportReason.findFirst({
      where: { supportReasonId: data.supportReasonId, isActive: true },
    }),
  ]);
  if (data.kilnId && !kiln)
    throw serviceError("INVALID_KILN", "El horno no pertenece al cliente");
  if (!reason)
    throw serviceError("INVALID_REASON", "El motivo no está disponible");

  const ticket = await prisma.supportTicket.create({
    data: {
      ...data,
      kilnId: data.kilnId ?? null,
      createdByUserId: actor.id,
      status: "OPEN",
    },
    include: ticketInclude,
  });
  return presentTicket(ticket, actor);
}

export async function listSupportTickets(actor, query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 10));
  const createdFrom = parseDate(query.createdFrom);
  const createdTo = parseDate(query.createdTo, true);
  const status = TICKET_STATUSES.includes(query.status)
    ? query.status
    : undefined;
  const supportReasonId = Number(query.supportReasonId);
  const kilnId = Number(query.kilnId);
  const assignedToUserId = Number(query.assignedToUserId);
  const assignment = ["unassigned", "assigned"].includes(query.assignment)
    ? query.assignment
    : undefined;
  const search = String(query.search || "").trim();
  const numericSearch = Number(search.replace(/^#/, ""));

  const filters = {
    ...(status ? { status } : {}),
    ...(Number.isInteger(supportReasonId) && supportReasonId > 0
      ? { supportReasonId }
      : {}),
    ...(Number.isInteger(kilnId) && kilnId > 0 ? { kilnId } : {}),
    ...(createdFrom || createdTo
      ? {
          createdAt: {
            ...(createdFrom ? { gte: createdFrom } : {}),
            ...(createdTo ? { lte: createdTo } : {}),
          },
        }
      : {}),
    ...(assignment === "unassigned" ? { assignedToUserId: null } : {}),
    ...(assignment === "assigned" ? { assignedToUserId: { not: null } } : {}),
    ...(actor.role === ROLES.ADMIN &&
    Number.isInteger(assignedToUserId) &&
    assignedToUserId > 0
      ? { assignedToUserId }
      : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            {
              kiln: { is: { name: { contains: search, mode: "insensitive" } } },
            },
            {
              createdByUser: {
                is: { name: { contains: search, mode: "insensitive" } },
              },
            },
            {
              assignedToUser: {
                is: { name: { contains: search, mode: "insensitive" } },
              },
            },
            ...(Number.isInteger(numericSearch) && numericSearch > 0
              ? [{ supportTicketId: numericSearch }, { kilnId: numericSearch }]
              : []),
          ],
        }
      : {}),
  };
  const where = { AND: [ticketScope(actor), filters] };
  const [items, total] = await prisma.$transaction([
    prisma.supportTicket.findMany({
      where,
      include: ticketInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.supportTicket.count({ where }),
  ]);

  return {
    items: items.map((ticket) =>
      presentTicket(ticket, actor, { summary: true }),
    ),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getSupportTicket(actor, supportTicketId) {
  const ticket = await findVisibleTicket(actor, supportTicketId);
  return ticket ? presentTicket(ticket, actor) : null;
}

export async function claimSupportTicket(actor, supportTicketId) {
  if (![ROLES.ADMIN, ROLES.TECHNICIAN].includes(actor.role)) {
    throw serviceError("FORBIDDEN", "No puedes tomar tickets");
  }
  const result = await prisma.supportTicket.updateMany({
    where: { supportTicketId, assignedToUserId: null, status: "OPEN" },
    data: { assignedToUserId: actor.id, status: "IN_PROGRESS" },
  });
  if (result.count !== 1) {
    const exists = await prisma.supportTicket.findUnique({
      where: { supportTicketId },
      select: { supportTicketId: true },
    });
    if (!exists) throw serviceError("NOT_FOUND", "Ticket no encontrado");
    throw serviceError(
      "CLAIM_CONFLICT",
      "El ticket ya fue tomado o no está abierto",
    );
  }
  return getSupportTicket(actor, supportTicketId);
}

export async function assignSupportTicket(
  actor,
  supportTicketId,
  assignedToUserId,
) {
  if (actor.role !== ROLES.ADMIN)
    throw serviceError(
      "FORBIDDEN",
      "Solo un administrador puede reasignar tickets",
    );
  return prisma.$transaction(async (tx) => {
    const [ticket, assignee] = await Promise.all([
      tx.supportTicket.findUnique({ where: { supportTicketId } }),
      tx.user.findFirst({
        where: {
          userId: assignedToUserId,
          role: { in: [ROLES.ADMIN, ROLES.TECHNICIAN] },
          isActive: true,
          anonymizedAt: null,
        },
      }),
    ]);
    if (!ticket) throw serviceError("NOT_FOUND", "Ticket no encontrado");
    if (!assignee)
      throw serviceError("INVALID_ASSIGNEE", "El responsable no es elegible");
    await tx.supportTicket.update({
      where: { supportTicketId },
      data: {
        assignedToUserId,
        ...(ticket.status === "OPEN" ? { status: "IN_PROGRESS" } : {}),
      },
    });
    const updated = await tx.supportTicket.findUnique({
      where: { supportTicketId },
      include: ticketInclude,
    });
    return presentTicket(updated, actor);
  });
}

export async function updateSupportTicketStatus(actor, supportTicketId, data) {
  const ticket = await findVisibleTicket(actor, supportTicketId, {});
  if (!ticket) throw serviceError("NOT_FOUND", "Ticket no encontrado");
  if (actor.role === ROLES.TECHNICIAN && ticket.assignedToUserId !== actor.id) {
    throw serviceError("NOT_FOUND", "Ticket no encontrado");
  }
  if (![ROLES.ADMIN, ROLES.TECHNICIAN].includes(actor.role)) {
    throw serviceError("FORBIDDEN", "No puedes cambiar el estado del ticket");
  }

  const allowed = {
    IN_PROGRESS: ["RESOLVED"],
    RESOLVED: ["CLOSED", "IN_PROGRESS"],
    CLOSED: ["IN_PROGRESS"],
  };
  if (!allowed[ticket.status]?.includes(data.status)) {
    throw serviceError(
      "INVALID_TRANSITION",
      `No se puede cambiar de ${ticket.status} a ${data.status}`,
    );
  }
  if (data.status === "RESOLVED" && !data.resolution?.trim()) {
    throw serviceError("RESOLUTION_REQUIRED", "La resolución es obligatoria");
  }

  const result = await prisma.supportTicket.updateMany({
    where: {
      supportTicketId,
      status: ticket.status,
      ...(actor.role === ROLES.TECHNICIAN
        ? { assignedToUserId: actor.id }
        : {}),
    },
    data: {
      status: data.status,
      ...(data.status === "RESOLVED"
        ? { resolution: data.resolution.trim() }
        : {}),
    },
  });
  if (result.count !== 1) {
    throw serviceError(
      "STATE_CONFLICT",
      "El ticket cambió mientras era actualizado",
    );
  }
  const updated = await getSupportTicket(actor, supportTicketId);
  if (!updated) throw serviceError("NOT_FOUND", "Ticket no encontrado");
  return updated;
}

export async function getSupportDiagnostics(actor, supportTicketId) {
  const visible = await findVisibleTicket(actor, supportTicketId, {});
  if (!visible) return null;
  if (visible.kilnId == null) {
    throw serviceError(
      "NO_ASSOCIATED_KILN",
      "La solicitud no tiene un horno asociado",
    );
  }
  const kiln = await prisma.kiln.findUnique({
    where: { kilnId: visible.kilnId },
    select: {
      kilnId: true,
      name: true,
      liters: true,
      phaseCount: true,
      nominalVoltage: true,
      nominalCurrent: true,
      manufacturedAt: true,
      deliveredAt: true,
      operationalStatus: true,
      manufacturer: true,
      heatingCircuitConfiguration: true,
      _count: { select: { firingCycles: true } },
      controller: {
        select: {
          controllerId: true,
          temperature: true,
          connectionStatus: true,
          activityStatus: true,
          operationalStatus: true,
          switchCurrentCapacity: true,
          switchType: true,
          manufacturedAt: true,
          deliveredAt: true,
          firmwareVersion: true,
          firmwareUpdatedAt: true,
        },
      },
      firingCycles: {
        select: {
          firingCycleId: true,
          startedAt: true,
          endedAt: true,
          status: true,
          program: { select: { programId: true, name: true } },
        },
        orderBy: { startedAt: "desc" },
        take: 20,
      },
    },
  });
  if (!kiln) return null;
  const { _count, ...kilnDetails } = kiln;
  return {
    ...kilnDetails,
    firingCycleCount: _count.firingCycles,
    controller: kiln.controller
      ? {
          ...kiln.controller,
          controllerCode: kiln.controller.controllerId.slice(-6),
        }
      : null,
  };
}

export async function updateTicketEquipmentStatus(
  actor,
  supportTicketId,
  { target, operationalStatus },
) {
  if (![ROLES.ADMIN, ROLES.TECHNICIAN].includes(actor.role)) {
    throw serviceError("FORBIDDEN", "No puedes cambiar el estado del equipo");
  }

  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw`
      SELECT "supportTicketId" FROM "SupportTicket"
      WHERE "supportTicketId" = ${supportTicketId}
      FOR UPDATE
    `;
    if (locked.length === 0) {
      throw serviceError("NOT_FOUND", "Ticket no encontrado");
    }

    const ticket = await tx.supportTicket.findUnique({
      where: { supportTicketId },
      select: {
        supportTicketId: true,
        assignedToUserId: true,
        status: true,
        kilnId: true,
        kiln: { select: { controllerId: true } },
      },
    });
    if (!ticket) throw serviceError("NOT_FOUND", "Ticket no encontrado");

    if (
      actor.role === ROLES.TECHNICIAN &&
      (ticket.assignedToUserId !== actor.id || ticket.status !== "IN_PROGRESS")
    ) {
      throw serviceError(
        "FORBIDDEN",
        "Solo el técnico asignado puede cambiar el equipo mientras el ticket está en progreso",
      );
    }

    if (ticket.kilnId == null || !ticket.kiln) {
      throw serviceError(
        "NO_ASSOCIATED_KILN",
        "La solicitud no tiene un horno asociado",
      );
    }

    if (target === EQUIPMENT_STATUS_TARGETS.KILN) {
      return updateEquipmentOperationalStatusInTransaction(tx, {
        target,
        kilnId: ticket.kilnId,
        operationalStatus,
      });
    }

    if (target === EQUIPMENT_STATUS_TARGETS.CONTROLLER) {
      if (!ticket.kiln.controllerId) {
        throw serviceError(
          "INVALID_TARGET",
          "El horno del ticket no tiene un controlador vinculado",
        );
      }
      return updateEquipmentOperationalStatusInTransaction(tx, {
        target,
        controllerId: ticket.kiln.controllerId,
        expectedKilnId: ticket.kilnId,
        operationalStatus,
      });
    }

    throw serviceError("INVALID_TARGET", "Equipo no válido");
  });
}

export async function getSupportTelemetry(actor, supportTicketId, query = {}) {
  const visible = await findVisibleTicket(actor, supportTicketId, {});
  if (!visible) return null;
  if (visible.kilnId == null) {
    throw serviceError(
      "NO_ASSOCIATED_KILN",
      "La solicitud no tiene un horno asociado",
    );
  }
  const firingCycleId = Number(query.firingCycleId);
  if (!Number.isInteger(firingCycleId) || firingCycleId < 1) {
    throw serviceError(
      "INVALID_FILTER",
      "Debe indicar un ciclo de quema válido",
    );
  }
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 10));
  const cycle = await prisma.firingCycle.findFirst({
    where: { firingCycleId, kilnId: visible.kilnId },
    select: { firingCycleId: true },
  });
  if (!cycle) throw serviceError("NOT_FOUND", "Ciclo de quema no encontrado");
  const where = { firingCycleId };
  const [items, total] = await prisma.$transaction([
    prisma.telemetry.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.telemetry.count({ where }),
  ]);
  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function createTicketMaintenance(actor, supportTicketId, data) {
  if (![ROLES.ADMIN, ROLES.TECHNICIAN].includes(actor.role)) {
    throw serviceError("FORBIDDEN", "No puedes registrar mantenimientos");
  }
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.findUnique({
      where: { supportTicketId },
      include: { kiln: { select: { kilnId: true, controllerId: true } } },
    });
    if (!ticket) throw serviceError("NOT_FOUND", "Ticket no encontrado");
    if (
      actor.role === ROLES.TECHNICIAN &&
      ticket.assignedToUserId !== actor.id
    ) {
      throw serviceError("NOT_FOUND", "Ticket no encontrado");
    }
    if (ticket.kilnId == null || !ticket.kiln) {
      throw serviceError(
        "NO_ASSOCIATED_KILN",
        "La solicitud no tiene un horno asociado",
      );
    }
    if (!["IN_PROGRESS", "RESOLVED"].includes(ticket.status)) {
      throw serviceError(
        "INVALID_MAINTENANCE_STATUS",
        "El ticket no admite nuevos mantenimientos",
      );
    }
    if (data.kilnId && data.kilnId !== ticket.kilnId) {
      throw serviceError("INVALID_TARGET", "El horno no corresponde al ticket");
    }
    if (data.controllerId && data.controllerId !== ticket.kiln.controllerId) {
      throw serviceError(
        "INVALID_TARGET",
        "El controlador no corresponde al horno del ticket",
      );
    }

    const guard = await tx.supportTicket.updateMany({
      where: {
        supportTicketId,
        status: ticket.status,
        ...(actor.role === ROLES.TECHNICIAN
          ? { assignedToUserId: actor.id }
          : {}),
      },
      data: { updatedAt: new Date() },
    });
    if (guard.count !== 1) {
      throw serviceError(
        "STATE_CONFLICT",
        "El ticket cambió mientras se registraba el mantenimiento",
      );
    }

    return tx.maintenanceRecord.create({
      data: {
        ...data,
        performedAt: new Date(data.performedAt),
        supportTicketId,
        performedByUserId: actor.id,
      },
      include: {
        performedByUser: { select: { userId: true, name: true, role: true } },
      },
    });
  });
}

export async function updateTicketMaintenance(
  actor,
  supportTicketId,
  maintenanceId,
  data,
) {
  if (![ROLES.ADMIN, ROLES.TECHNICIAN].includes(actor.role)) {
    throw serviceError("FORBIDDEN", "No puedes editar mantenimientos");
  }
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.findUnique({
      where: { supportTicketId },
      include: { kiln: { select: { kilnId: true, controllerId: true } } },
    });
    if (!ticket) throw serviceError("NOT_FOUND", "Ticket no encontrado");
    if (
      actor.role === ROLES.TECHNICIAN &&
      ticket.assignedToUserId !== actor.id
    ) {
      throw serviceError("NOT_FOUND", "Ticket no encontrado");
    }
    if (ticket.kilnId == null || !ticket.kiln) {
      throw serviceError(
        "NO_ASSOCIATED_KILN",
        "La solicitud no tiene un horno asociado",
      );
    }
    if (data.kilnId && data.kilnId !== ticket.kilnId) {
      throw serviceError("INVALID_TARGET", "El horno no corresponde al ticket");
    }
    if (data.controllerId && data.controllerId !== ticket.kiln.controllerId) {
      throw serviceError(
        "INVALID_TARGET",
        "El controlador no corresponde al horno del ticket",
      );
    }

    const result = await tx.maintenanceRecord.updateMany({
      where: {
        maintenanceId,
        supportTicketId,
        performedByUserId: actor.id,
      },
      data: {
        ...data,
        performedAt: new Date(data.performedAt),
      },
    });
    if (result.count !== 1) {
      const record = await tx.maintenanceRecord.findFirst({
        where: { maintenanceId, supportTicketId },
        select: { maintenanceId: true },
      });
      if (!record)
        throw serviceError("NOT_FOUND", "Mantenimiento no encontrado");
      throw serviceError(
        "FORBIDDEN",
        "Solo puedes editar mantenimientos registrados por ti",
      );
    }

    return tx.maintenanceRecord.findUnique({
      where: { maintenanceId },
      include: {
        performedByUser: { select: { userId: true, name: true, role: true } },
      },
    });
  });
}
