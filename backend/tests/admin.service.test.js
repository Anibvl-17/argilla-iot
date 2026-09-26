import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../src/config/prisma.js";
import { getAdminSummary } from "../src/services/admin.service.js";

function mockMethod(t, target, name, implementation) {
  const original = target[name];
  target[name] = implementation;
  t.after(() => {
    target[name] = original;
  });
}

test("the admin summary includes administrators in the user totals", async (t) => {
  mockMethod(t, prisma.kiln, "count", async () => 0);
  mockMethod(t, prisma.controller, "count", async () => 0);
  mockMethod(t, prisma.user, "count", async ({ where } = {}) => {
    if (!where) return 9;
    return { ADMIN: 2, TECHNICIAN: 3, CLIENT: 4 }[where.role];
  });
  mockMethod(t, prisma, "$transaction", async (operations) =>
    Promise.all(operations),
  );

  const summary = await getAdminSummary();

  assert.deepEqual(summary.users, {
    total: 9,
    administrators: 2,
    technicians: 3,
    clients: 4,
  });
});
