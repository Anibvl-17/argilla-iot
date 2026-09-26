import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../src/config/prisma.js";
import {
  claimSupportTicket,
  createTicketMaintenance,
  getSupportTicket,
  getSupportTelemetry,
  listSupportTickets,
  updateTicketMaintenance,
  updateSupportTicketStatus,
} from "../src/services/support.service.js";

const technician = { id: 41, role: "TECHNICIAN" };

function mockTicketMethod(t, name, implementation) {
  const original = prisma.supportTicket[name];
  prisma.supportTicket[name] = implementation;
  t.after(() => {
    prisma.supportTicket[name] = original;
  });
}

function mockMethod(t, target, name, implementation) {
  const original = target[name];
  target[name] = implementation;
  t.after(() => {
    target[name] = original;
  });
}

test("claim uses one conditional atomic update", async (t) => {
  let updateArguments;
  mockTicketMethod(t, "updateMany", async (args) => {
    updateArguments = args;
    return { count: 1 };
  });
  mockTicketMethod(t, "findFirst", async () => ({
    supportTicketId: 9,
    supportReasonId: 1,
    assignedToUserId: technician.id,
    kilnId: 2,
    title: "Ticket",
    description: "Descripción suficiente",
    status: "IN_PROGRESS",
    resolution: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    supportReason: { supportReasonId: 1, name: "Otro" },
    kiln: { kilnId: 2, name: "Horno" },
    createdByUser: {
      userId: 1,
      name: "Cliente",
      email: "c@example.com",
      phone: null,
    },
    assignedToUser: {
      userId: technician.id,
      name: "Técnico",
      role: "TECHNICIAN",
    },
    maintenanceRecords: [],
  }));

  const claimed = await claimSupportTicket(technician, 9);
  assert.equal(claimed.status, "IN_PROGRESS");
  assert.deepEqual(updateArguments.where, {
    supportTicketId: 9,
    assignedToUserId: null,
    status: "OPEN",
  });
  assert.deepEqual(updateArguments.data, {
    assignedToUserId: technician.id,
    status: "IN_PROGRESS",
  });
});

test("claim reports a conflict when the conditional update loses the race", async (t) => {
  mockTicketMethod(t, "updateMany", async () => ({ count: 0 }));
  mockTicketMethod(t, "findUnique", async () => ({ supportTicketId: 9 }));
  await assert.rejects(
    claimSupportTicket(technician, 9),
    (error) => error.code === "CLAIM_CONFLICT",
  );
});

test("resolving requires text and technicians can only work their assignment", async (t) => {
  mockTicketMethod(t, "findFirst", async () => ({
    supportTicketId: 9,
    assignedToUserId: technician.id,
    status: "IN_PROGRESS",
  }));
  await assert.rejects(
    updateSupportTicketStatus(technician, 9, { status: "RESOLVED" }),
    (error) => error.code === "RESOLUTION_REQUIRED",
  );
});

test("the state machine rejects direct and backward transitions", async (t) => {
  mockTicketMethod(t, "findFirst", async () => ({
    supportTicketId: 9,
    assignedToUserId: technician.id,
    status: "IN_PROGRESS",
  }));
  await assert.rejects(
    updateSupportTicketStatus(technician, 9, { status: "CLOSED" }),
    (error) => error.code === "INVALID_TRANSITION",
  );
});

test("a valid technician transition is committed with assignment and state guards", async (t) => {
  let calls = 0;
  mockTicketMethod(t, "findFirst", async () => {
    calls += 1;
    if (calls === 1) {
      return {
        supportTicketId: 9,
        assignedToUserId: technician.id,
        status: "IN_PROGRESS",
      };
    }
    return {
      supportTicketId: 9,
      supportReasonId: 1,
      assignedToUserId: technician.id,
      kilnId: 2,
      title: "Ticket",
      description: "Descripción suficiente",
      status: "RESOLVED",
      resolution: "Se reemplazó el sensor",
      createdAt: new Date(),
      updatedAt: new Date(),
      supportReason: { supportReasonId: 1, name: "Temperatura" },
      kiln: { kilnId: 2, name: "Horno", operationalStatus: "OPERATIONAL" },
      createdByUser: {
        userId: 1,
        name: "Cliente",
        email: "c@example.com",
        phone: null,
      },
      assignedToUser: {
        userId: technician.id,
        name: "Técnico",
        role: "TECHNICIAN",
      },
      maintenanceRecords: [],
    };
  });
  let updateArguments;
  mockTicketMethod(t, "updateMany", async (args) => {
    updateArguments = args;
    return { count: 1 };
  });

  const updated = await updateSupportTicketStatus(technician, 9, {
    status: "RESOLVED",
    resolution: "Se reemplazó el sensor",
  });
  assert.equal(updated.status, "RESOLVED");
  assert.deepEqual(updateArguments.where, {
    supportTicketId: 9,
    status: "IN_PROGRESS",
    assignedToUserId: technician.id,
  });
});

test("ticket listing always combines filters with the actor visibility scope", async (t) => {
  const captured = [];
  mockTicketMethod(t, "findMany", async (args) => {
    captured.push(args.where);
    return [];
  });
  mockTicketMethod(t, "count", async () => 0);
  mockMethod(t, prisma, "$transaction", async (operations) =>
    Promise.all(operations),
  );

  await listSupportTickets({ id: 1, role: "CLIENT" }, { status: "OPEN" });
  await listSupportTickets({ id: 2, role: "TECHNICIAN" });
  await listSupportTickets({ id: 3, role: "ADMIN" });

  assert.deepEqual(captured[0].AND[0], { createdByUserId: 1 });
  assert.deepEqual(captured[0].AND[1], { status: "OPEN" });
  assert.deepEqual(captured[1].AND[0], {
    OR: [{ assignedToUserId: null }, { assignedToUserId: 2 }],
  });
  assert.deepEqual(captured[2].AND[0], {});
});

test("smart ticket search covers kiln, client, assignee and numeric identifiers", async (t) => {
  let where;
  mockTicketMethod(t, "findMany", async (args) => {
    where = args.where;
    return [];
  });
  mockTicketMethod(t, "count", async () => 0);
  mockMethod(t, prisma, "$transaction", async (operations) =>
    Promise.all(operations),
  );

  await listSupportTickets({ id: 3, role: "ADMIN" }, { search: "#27" });
  const searchFilter = where.AND[1].OR;
  assert.ok(searchFilter.some((entry) => entry.kiln?.is?.name));
  assert.ok(searchFilter.some((entry) => entry.createdByUser?.is?.name));
  assert.ok(searchFilter.some((entry) => entry.assignedToUser?.is?.name));
  assert.ok(searchFilter.some((entry) => entry.supportTicketId === 27));
  assert.ok(searchFilter.some((entry) => entry.kilnId === 27));
});

test("client ticket responses omit contact, assignment, maintenance and controller id", async (t) => {
  mockTicketMethod(t, "findFirst", async () => ({
    supportTicketId: 9,
    supportReasonId: 1,
    assignedToUserId: 41,
    kilnId: 2,
    title: "Ticket",
    description: "Descripción suficiente",
    status: "RESOLVED",
    resolution: "Solución",
    createdAt: new Date(),
    updatedAt: new Date(),
    supportReason: { supportReasonId: 1, name: "Otro" },
    kiln: {
      kilnId: 2,
      name: "Horno",
      operationalStatus: "OPERATIONAL",
      controllerId: "11111111-1111-4111-8111-111111111111",
    },
    createdByUser: {
      userId: 1,
      name: "Cliente",
      email: "c@example.com",
      phone: "+56912345678",
    },
    assignedToUser: { userId: 41, name: "Técnico", role: "TECHNICIAN" },
    maintenanceRecords: [{ maintenanceId: 1 }],
  }));

  const result = await getSupportTicket({ id: 1, role: "CLIENT" }, 9);
  assert.equal(result.kiln.controllerId, undefined);
  assert.equal(result.createdByUser, undefined);
  assert.equal(result.assignedToUser, undefined);
  assert.equal(result.maintenanceRecords, undefined);
  assert.equal(result.resolution, "Solución");
});

test("ticket telemetry is paginated and restricted to a cycle from the ticket kiln", async (t) => {
  let cycleWhere;
  let telemetryWhere;
  mockTicketMethod(t, "findFirst", async () => ({ kilnId: 2 }));
  mockMethod(t, prisma.firingCycle, "findFirst", async (args) => {
    cycleWhere = args.where;
    return { firingCycleId: 44 };
  });
  mockMethod(t, prisma.telemetry, "findMany", (args) => {
    telemetryWhere = args.where;
    return Promise.resolve([{ telemetryId: 1, firingCycleId: 44 }]);
  });
  mockMethod(t, prisma.telemetry, "count", async () => 11);
  mockMethod(t, prisma, "$transaction", async (operations) =>
    Promise.all(operations),
  );

  const result = await getSupportTelemetry(technician, 9, {
    firingCycleId: "44",
    page: "2",
    pageSize: "10",
  });

  assert.deepEqual(cycleWhere, { firingCycleId: 44, kilnId: 2 });
  assert.deepEqual(telemetryWhere, { firingCycleId: 44 });
  assert.deepEqual(result.pagination, {
    page: 2,
    pageSize: 10,
    total: 11,
    totalPages: 2,
  });
});

test("ticket telemetry rejects missing and foreign firing cycles", async (t) => {
  mockTicketMethod(t, "findFirst", async () => ({ kilnId: 2 }));

  await assert.rejects(
    getSupportTelemetry(technician, 9, {}),
    (error) => error.code === "INVALID_FILTER",
  );

  mockMethod(t, prisma.firingCycle, "findFirst", async () => null);
  await assert.rejects(
    getSupportTelemetry(technician, 9, { firingCycleId: 55 }),
    (error) => error.code === "NOT_FOUND",
  );
});

test("ticket maintenance accepts both matching targets and rejects foreign equipment", async (t) => {
  let created;
  const transaction = {
    supportTicket: {
      findUnique: async () => ({
        supportTicketId: 9,
        assignedToUserId: technician.id,
        kilnId: 2,
        status: "IN_PROGRESS",
        kiln: {
          kilnId: 2,
          controllerId: "11111111-1111-4111-8111-111111111111",
        },
      }),
      updateMany: async () => ({ count: 1 }),
    },
    maintenanceRecord: {
      create: async (args) => {
        created = args.data;
        return args.data;
      },
    },
  };
  mockMethod(t, prisma, "$transaction", async (callback) => {
    return callback(transaction);
  });
  const base = {
    kilnId: 2,
    controllerId: "11111111-1111-4111-8111-111111111111",
    type: "INSPECTION",
    title: "Inspección",
    workPerformed: "Trabajo realizado",
    performedAt: "2026-09-14T12:00:00.000Z",
  };

  await createTicketMaintenance(technician, 9, base);
  assert.equal(created.kilnId, 2);
  assert.equal(created.controllerId, base.controllerId);
  assert.equal(created.performedByUserId, technician.id);

  await assert.rejects(
    createTicketMaintenance(technician, 9, { ...base, kilnId: 99 }),
    (error) => error.code === "INVALID_TARGET",
  );
});

test("ticket maintenance can only be edited by the user who registered it", async (t) => {
  let updatedWhere;
  const transaction = {
    supportTicket: {
      findUnique: async () => ({
        supportTicketId: 9,
        assignedToUserId: technician.id,
        kilnId: 2,
        kiln: {
          kilnId: 2,
          controllerId: "11111111-1111-4111-8111-111111111111",
        },
      }),
    },
    maintenanceRecord: {
      updateMany: async (args) => {
        updatedWhere = args.where;
        return { count: 1 };
      },
      findUnique: async () => ({
        maintenanceId: 7,
        performedByUserId: technician.id,
      }),
    },
  };
  mockMethod(t, prisma, "$transaction", async (callback) => {
    return callback(transaction);
  });
  const data = {
    kilnId: 2,
    type: "CORRECTIVE",
    title: "Ajuste eléctrico",
    workPerformed: "Se ajustaron los terminales.",
    performedAt: "2026-09-14T12:00:00.000Z",
  };

  await updateTicketMaintenance(technician, 9, 7, data);

  assert.deepEqual(updatedWhere, {
    maintenanceId: 7,
    supportTicketId: 9,
    performedByUserId: technician.id,
  });
});

test("ticket maintenance rejects edits from a different user", async (t) => {
  const transaction = {
    supportTicket: {
      findUnique: async () => ({
        supportTicketId: 9,
        assignedToUserId: technician.id,
        kilnId: 2,
        kiln: { kilnId: 2, controllerId: null },
      }),
    },
    maintenanceRecord: {
      updateMany: async () => ({ count: 0 }),
      findFirst: async () => ({ maintenanceId: 7 }),
    },
  };
  mockMethod(t, prisma, "$transaction", async (callback) => {
    return callback(transaction);
  });

  await assert.rejects(
    updateTicketMaintenance(technician, 9, 7, {
      kilnId: 2,
      type: "INSPECTION",
      title: "Inspección",
      workPerformed: "Trabajo actualizado",
      performedAt: "2026-09-14T12:00:00.000Z",
    }),
    (error) => error.code === "FORBIDDEN",
  );
});
