import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../src/config/prisma.js";
import {
  anonymizeOwnUser,
  anonymizeUser,
  deactivateOwnUser,
  setUserActive,
  updateUser,
} from "../src/services/user.service.js";

const activeAdmin = {
  userId: 1,
  role: "ADMIN",
  isActive: true,
  anonymizedAt: null,
};

function mockMethod(t, target, name, implementation) {
  const original = target[name];
  target[name] = implementation;
  t.after(() => {
    target[name] = original;
  });
}

function mockTransaction(t, user) {
  let updateCalled = false;
  mockMethod(t, prisma, "$transaction", async (operation) =>
    operation({
      user: {
        findUnique: async () => user,
        count: async () => 1,
        update: async () => {
          updateCalled = true;
          return user;
        },
      },
    }),
  );
  return () => updateCalled;
}

test("the last active administrator cannot be downgraded", async (t) => {
  mockMethod(t, prisma.user, "findUnique", async () => activeAdmin);
  mockMethod(t, prisma.user, "count", async () => 1);

  await assert.rejects(
    updateUser(1, { role: "CLIENT" }),
    (error) => error.code === "LAST_ACTIVE_ADMIN",
  );
});

test("the last active administrator cannot deactivate their own account", async (t) => {
  const updateCalled = mockTransaction(t, activeAdmin);

  await assert.rejects(
    deactivateOwnUser(1),
    (error) => error.code === "LAST_ACTIVE_ADMIN",
  );
  assert.equal(updateCalled(), false);
});

test("administrators cannot deactivate or anonymize themselves through admin actions", async () => {
  await assert.rejects(
    setUserActive(7, false, 7),
    (error) => error.code === "SELF_DEACTIVATION",
  );
  await assert.rejects(
    anonymizeUser(7, 7),
    (error) => error.code === "SELF_ANONYMIZATION",
  );
});

test("an anonymized account cannot be reactivated", async (t) => {
  const updateCalled = mockTransaction(t, {
    ...activeAdmin,
    role: "CLIENT",
    isActive: false,
    anonymizedAt: new Date(),
  });

  await assert.rejects(
    setUserActive(9, true, 1),
    (error) => error.code === "USER_ANONYMIZED",
  );
  assert.equal(updateCalled(), false);
});

test("the last active administrator cannot be anonymized", async (t) => {
  const updateCalled = mockTransaction(t, activeAdmin);

  await assert.rejects(
    anonymizeOwnUser(1),
    (error) => error.code === "LAST_ACTIVE_ADMIN",
  );
  assert.equal(updateCalled(), false);
});
