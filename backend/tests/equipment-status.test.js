import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../src/config/prisma.js";
import controllerRouter from "../src/routes/controller.routes.js";
import kilnRouter from "../src/routes/kiln.routes.js";
import supportRouter from "../src/routes/support.routes.js";
import {
  EQUIPMENT_STATUS_TARGETS,
  updateEquipmentOperationalStatus,
} from "../src/services/equipmentStatus.service.js";
import { updateTicketEquipmentStatus } from "../src/services/support.service.js";
import {
  updateOperationalStatusValidation,
  updateTicketEquipmentStatusValidation,
} from "../src/validations/equipmentStatus.validation.js";

const controllerId = "11111111-1111-4111-8111-111111abcdef";

function mockMethod(t, target, name, implementation) {
  const original = target[name];
  target[name] = implementation;
  t.after(() => {
    target[name] = original;
  });
}

function roleMiddleware(router, path) {
  const layer = router.stack.find(
    (candidate) =>
      candidate.route?.path === path && candidate.route.methods.patch,
  );
  assert.ok(layer, `Route PATCH ${path} was not found`);
  return layer.route.stack[0].handle;
}

function authorize(middleware, role) {
  let nextCalled = false;
  let statusCode;
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  };
  middleware({ user: { role } }, response, () => {
    nextCalled = true;
  });
  return { nextCalled, statusCode };
}

test("direct operational-status routes are admin-only and support accepts technicians", () => {
  for (const [router, path] of [
    [kilnRouter, "/:kilnId/operational-status"],
    [controllerRouter, "/:controllerId/operational-status"],
  ]) {
    const middleware = roleMiddleware(router, path);
    assert.equal(authorize(middleware, "ADMIN").nextCalled, true);
    assert.equal(authorize(middleware, "TECHNICIAN").statusCode, 403);
  }

  const supportMiddleware = roleMiddleware(
    supportRouter,
    "/tickets/:ticketId/equipment-status",
  );
  assert.equal(authorize(supportMiddleware, "ADMIN").nextCalled, true);
  assert.equal(authorize(supportMiddleware, "TECHNICIAN").nextCalled, true);
  assert.equal(authorize(supportMiddleware, "CLIENT").statusCode, 403);
});

test("operational-status payloads accept only the documented strict enums", () => {
  assert.equal(
    updateOperationalStatusValidation.safeParse({
      operationalStatus: "MAINTENANCE",
    }).success,
    true,
  );
  assert.equal(
    updateOperationalStatusValidation.safeParse({ operationalStatus: "IDLE" })
      .success,
    false,
  );
  assert.equal(
    updateOperationalStatusValidation.safeParse({
      operationalStatus: "OPERATIONAL",
      reason: "extra",
    }).success,
    false,
  );
  assert.equal(
    updateTicketEquipmentStatusValidation.safeParse({
      target: "CONTROLLER",
      operationalStatus: "OUT_OF_SERVICE",
    }).success,
    true,
  );
  assert.equal(
    updateTicketEquipmentStatusValidation.safeParse({
      target: "OTHER",
      operationalStatus: "OPERATIONAL",
    }).success,
    false,
  );
});

test("a kiln cannot become non-operational during an active firing", async (t) => {
  let updated = false;
  const tx = {
    $queryRaw: async () => [{ kilnId: 7 }],
    kiln: {
      findUnique: async () => ({
        kilnId: 7,
        name: "Horno",
        controllerId,
        operationalStatus: "OPERATIONAL",
      }),
      update: async () => {
        updated = true;
      },
    },
    firingCycle: {
      findFirst: async () => ({ firingCycleId: 12 }),
    },
  };
  mockMethod(t, prisma, "$transaction", (work) => work(tx));

  await assert.rejects(
    updateEquipmentOperationalStatus({
      target: EQUIPMENT_STATUS_TARGETS.KILN,
      kilnId: 7,
      operationalStatus: "MAINTENANCE",
    }),
    (error) => error.code === "CYCLE_ACTIVE",
  );
  assert.equal(updated, false);
});

test("an idempotent status change does not fail because of an active firing", async (t) => {
  let activeCycleQueries = 0;
  let updates = 0;
  const tx = {
    $queryRaw: async () => [{ kilnId: 7 }],
    kiln: {
      findUnique: async () => ({
        kilnId: 7,
        name: "Horno",
        controllerId,
        operationalStatus: "MAINTENANCE",
      }),
      update: async () => {
        updates += 1;
      },
    },
    firingCycle: {
      findFirst: async () => {
        activeCycleQueries += 1;
        return { firingCycleId: 12 };
      },
    },
  };
  mockMethod(t, prisma, "$transaction", (work) => work(tx));

  const kiln = await updateEquipmentOperationalStatus({
    target: EQUIPMENT_STATUS_TARGETS.KILN,
    kilnId: 7,
    operationalStatus: "MAINTENANCE",
  });
  assert.equal(kiln.operationalStatus, "MAINTENANCE");
  assert.equal(activeCycleQueries, 0);
  assert.equal(updates, 0);
});

test("changing a linked controller checks the kiln cycle and leaves the kiln status untouched", async (t) => {
  let controllerStatus = "OPERATIONAL";
  let kilnUpdates = 0;
  const tx = {
    $queryRaw: async () => [{ kilnId: 7 }],
    controller: {
      findUnique: async () => ({
        controllerId,
        operationalStatus: controllerStatus,
        kiln: { kilnId: 7 },
      }),
      update: async ({ data }) => {
        controllerStatus = data.operationalStatus;
        return {
          controllerId,
          operationalStatus: controllerStatus,
          kiln: { kilnId: 7 },
        };
      },
    },
    kiln: {
      update: async () => {
        kilnUpdates += 1;
      },
    },
    firingCycle: { findFirst: async () => null },
  };
  mockMethod(t, prisma, "$transaction", (work) => work(tx));

  const result = await updateEquipmentOperationalStatus({
    target: EQUIPMENT_STATUS_TARGETS.CONTROLLER,
    controllerId,
    operationalStatus: "OUT_OF_SERVICE",
  });
  assert.equal(result.operationalStatus, "OUT_OF_SERVICE");
  assert.equal(kilnUpdates, 0);
});

test("assigned technicians can update ticket equipment only while it is in progress", async (t) => {
  const ticket = {
    supportTicketId: 9,
    assignedToUserId: 41,
    status: "IN_PROGRESS",
    kilnId: 7,
    kiln: { controllerId },
  };
  const tx = {
    $queryRaw: async () => [{ supportTicketId: 9 }],
    supportTicket: { findUnique: async () => ticket },
    kiln: {
      findUnique: async () => ({
        kilnId: 7,
        name: "Horno",
        controllerId,
        operationalStatus: "OPERATIONAL",
      }),
      update: async ({ data }) => ({
        kilnId: 7,
        operationalStatus: data.operationalStatus,
      }),
    },
    firingCycle: { findFirst: async () => null },
  };
  mockMethod(t, prisma, "$transaction", (work) => work(tx));

  const result = await updateTicketEquipmentStatus(
    { id: 41, role: "TECHNICIAN" },
    9,
    { target: "KILN", operationalStatus: "MAINTENANCE" },
  );
  assert.equal(result.operationalStatus, "MAINTENANCE");

  ticket.status = "RESOLVED";
  await assert.rejects(
    updateTicketEquipmentStatus({ id: 41, role: "TECHNICIAN" }, 9, {
      target: "KILN",
      operationalStatus: "OPERATIONAL",
    }),
    (error) => error.code === "FORBIDDEN",
  );
});

test("administrators can update resolved ticket equipment and missing controllers conflict", async (t) => {
  const ticket = {
    supportTicketId: 9,
    assignedToUserId: null,
    status: "RESOLVED",
    kilnId: 7,
    kiln: { controllerId: null },
  };
  const tx = {
    $queryRaw: async () => [{ supportTicketId: 9 }],
    supportTicket: { findUnique: async () => ticket },
    kiln: {
      findUnique: async () => ({
        kilnId: 7,
        name: "Horno",
        controllerId: null,
        operationalStatus: "MAINTENANCE",
      }),
      update: async ({ data }) => ({
        kilnId: 7,
        operationalStatus: data.operationalStatus,
      }),
    },
    firingCycle: { findFirst: async () => null },
  };
  mockMethod(t, prisma, "$transaction", (work) => work(tx));

  const result = await updateTicketEquipmentStatus(
    { id: 1, role: "ADMIN" },
    9,
    { target: "KILN", operationalStatus: "OPERATIONAL" },
  );
  assert.equal(result.operationalStatus, "OPERATIONAL");

  await assert.rejects(
    updateTicketEquipmentStatus({ id: 1, role: "ADMIN" }, 9, {
      target: "CONTROLLER",
      operationalStatus: "OPERATIONAL",
    }),
    (error) => error.code === "INVALID_TARGET",
  );
});

test("ticket equipment status rejects support requests without a kiln", async (t) => {
  const tx = {
    $queryRaw: async () => [{ supportTicketId: 10 }],
    supportTicket: {
      findUnique: async () => ({
        supportTicketId: 10,
        assignedToUserId: null,
        status: "OPEN",
        kilnId: null,
        kiln: null,
      }),
    },
  };
  mockMethod(t, prisma, "$transaction", (work) => work(tx));

  await assert.rejects(
    updateTicketEquipmentStatus({ id: 1, role: "ADMIN" }, 10, {
      target: "KILN",
      operationalStatus: "MAINTENANCE",
    }),
    (error) => error.code === "NO_ASSOCIATED_KILN",
  );
});
