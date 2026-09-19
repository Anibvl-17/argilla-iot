import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import { prisma } from "../src/config/prisma.js";
import { authenticateJWT } from "../src/middlewares/authentication.middleware.js";

function mockMethod(t, target, name, implementation) {
  const original = target[name];
  target[name] = implementation;
  t.after(() => {
    target[name] = original;
  });
}

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("authentication rejects requests without a bearer token", async () => {
  const response = createResponse();
  let nextCalled = false;

  await authenticateJWT({ headers: {} }, response, () => {
    nextCalled = true;
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.message, "Token no proporcionado");
  assert.equal(nextCalled, false);
});

test("authentication rejects invalid tokens", async (t) => {
  mockMethod(t, jwt, "verify", () => {
    throw new Error("invalid signature");
  });
  const response = createResponse();
  let nextCalled = false;

  await authenticateJWT(
    { headers: { authorization: "Bearer invalid" } },
    response,
    () => {
      nextCalled = true;
    },
  );

  assert.equal(response.statusCode, 403);
  assert.equal(response.body.message, "Token inválido o expirado");
  assert.equal(nextCalled, false);
});

test("authentication exposes the current active user to downstream handlers", async (t) => {
  mockMethod(t, jwt, "verify", () => ({ id: 17 }));
  mockMethod(t, prisma.user, "findUnique", async () => ({
    userId: 17,
    name: "Camila",
    email: "camila@example.com",
    role: "CLIENT",
    isActive: true,
    anonymizedAt: null,
  }));
  const request = { headers: { authorization: "Bearer valid" } };
  const response = createResponse();
  let nextCalled = false;

  await authenticateJWT(request, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.deepEqual(request.user, {
    id: 17,
    name: "Camila",
    email: "camila@example.com",
    role: "CLIENT",
  });
  assert.equal(response.statusCode, null);
});

test("authentication rejects deactivated and anonymized accounts", async (t) => {
  mockMethod(t, jwt, "verify", (token) => ({ id: token }));
  mockMethod(t, prisma.user, "findUnique", async ({ where }) => ({
    userId: where.userId,
    name: "Cuenta bloqueada",
    email: "blocked@example.com",
    role: "CLIENT",
    isActive: where.userId !== "inactive",
    anonymizedAt: where.userId === "anonymized" ? new Date() : null,
  }));

  for (const token of ["inactive", "anonymized"]) {
    const response = createResponse();
    let nextCalled = false;
    await authenticateJWT(
      { headers: { authorization: `Bearer ${token}` } },
      response,
      () => {
        nextCalled = true;
      },
    );

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.message, "La cuenta está desactivada");
    assert.equal(nextCalled, false);
  }
});
