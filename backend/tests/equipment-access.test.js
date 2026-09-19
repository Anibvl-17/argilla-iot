import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../src/config/prisma.js";
import kilnRouter from "../src/routes/kiln.routes.js";
import controllerRouter from "../src/routes/controller.routes.js";
import {
  edit,
  getKilnsPage,
  linkControllerToKiln,
  remove as removeKiln,
} from "../src/services/kiln.service.js";
import {
  edit as editController,
  getControllersPage,
} from "../src/services/controller.service.js";

function mockMethod(t, target, name, implementation) {
  const original = target[name];
  target[name] = implementation;
  t.after(() => {
    target[name] = original;
  });
}

function roleMiddleware(router, method, path) {
  const layer = router.stack.find(
    (candidate) =>
      candidate.route?.path === path && candidate.route.methods[method],
  );
  assert.ok(layer, `Route ${method.toUpperCase()} ${path} was not found`);
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

test("technicians can list, create, and edit eligible equipment but cannot access history", () => {
  for (const [router, method, path] of [
    [kilnRouter, "get", "/all"],
    [kilnRouter, "post", "/create"],
    [kilnRouter, "patch", "/:kilnId/edit"],
    [kilnRouter, "post", "/:kilnId/link"],
    [controllerRouter, "get", "/all"],
    [controllerRouter, "post", "/create"],
    [controllerRouter, "patch", "/:controllerId/edit"],
  ]) {
    assert.equal(
      authorize(roleMiddleware(router, method, path), "TECHNICIAN").nextCalled,
      true,
    );
  }

  assert.equal(
    authorize(
      roleMiddleware(kilnRouter, "get", "/admin/:kilnId/telemetry"),
      "TECHNICIAN",
    ).statusCode,
    403,
  );
});

test("technician kiln edits reject owned kilns", async (t) => {
  mockMethod(t, prisma.kiln, "findUnique", async () => ({
    kilnId: 7,
    userId: 4,
    controller: null,
  }));

  await assert.rejects(
    edit(7, { name: "Nuevo nombre" }, { requireUnowned: true }),
    (error) => error.code === "KILN_HAS_OWNER",
  );
});

test("technician kiln edits use an atomic unowned guard", async (t) => {
  let updateWhere;
  let reads = 0;
  mockMethod(t, prisma.kiln, "findUnique", async () => {
    reads += 1;
    return reads === 1
      ? { kilnId: 7, userId: null, controller: null }
      : { kilnId: 7, userId: null, name: "Actualizado" };
  });
  mockMethod(t, prisma.kiln, "updateMany", async (args) => {
    updateWhere = args.where;
    return { count: 1 };
  });

  const result = await edit(
    7,
    { name: "Actualizado" },
    { requireUnowned: true },
  );
  assert.deepEqual(updateWhere, { kilnId: 7, userId: null });
  assert.equal(result.name, "Actualizado");
});

test("a rejected kiln deletion does not unlink its controller first", async (t) => {
  let updateCalls = 0;
  mockMethod(t, prisma.kiln, "findUnique", async () => ({ kilnId: 7 }));
  mockMethod(t, prisma.kiln, "update", async () => {
    updateCalls += 1;
  });
  mockMethod(t, prisma.kiln, "delete", async () => {
    const error = new Error("Foreign key constraint failed");
    error.code = "P2003";
    throw error;
  });

  await assert.rejects(removeKiln(7), (error) => error.code === "P2003");
  assert.equal(updateCalls, 0);
});

test("technician controller edits reject owned controllers", async (t) => {
  mockMethod(t, prisma.controller, "findUnique", async () => ({
    controllerId: "11111111-1111-4111-8111-111111abcdef",
    userId: 4,
    kiln: null,
  }));

  await assert.rejects(
    editController(
      "11111111-1111-4111-8111-111111abcdef",
      { switchCurrentCapacity: 30 },
      { requireUnowned: true },
    ),
    (error) => error.code === "CONTROLLER_HAS_OWNER",
  );
});

test("technician controller edits use an atomic unowned guard", async (t) => {
  let updateWhere;
  let reads = 0;
  mockMethod(t, prisma.controller, "findUnique", async () => {
    reads += 1;
    return reads === 1
      ? {
          controllerId: "11111111-1111-4111-8111-111111abcdef",
          userId: null,
          kiln: null,
        }
      : {
          controllerId: "11111111-1111-4111-8111-111111abcdef",
          userId: null,
          switchType: "SSR",
          switchCurrentCapacity: 30,
          operationalStatus: "OPERATIONAL",
          user: null,
          kiln: null,
        };
  });
  mockMethod(t, prisma.controller, "updateMany", async (args) => {
    updateWhere = args.where;
    return { count: 1 };
  });

  const result = await editController(
    "11111111-1111-4111-8111-111111abcdef",
    { switchType: "SSR", switchCurrentCapacity: 30 },
    { requireUnowned: true, restrictPresentation: true },
  );

  assert.deepEqual(updateWhere, {
    controllerId: "11111111-1111-4111-8111-111111abcdef",
    userId: null,
  });
  assert.equal(result.switchType, "SSR");
  assert.equal(result.switchCurrentCapacity, 30);
});

test("technician equipment listings expose only the approved fields", async (t) => {
  let kilnWhere;
  let controllerWhere;
  const owner = {
    userId: 4,
    name: "Cliente",
    email: "cliente@example.com",
    phone: "+56911111111",
    addressLine: "Dirección privada",
  };
  mockMethod(t, prisma.kiln, "findMany", async (args) => {
    kilnWhere = args.where;
    return [
      {
        kilnId: 7,
        userId: 4,
        name: "Horno",
        user: owner,
        controller: null,
      },
    ];
  });
  mockMethod(t, prisma.kiln, "count", async () => 1);
  mockMethod(t, prisma.controller, "findMany", async (args) => {
    controllerWhere = args.where;
    return [
      {
        controllerId: "11111111-1111-4111-8111-111111abcdef",
        userId: 4,
        operationalStatus: "OPERATIONAL",
        switchType: "CONTACTOR",
        switchCurrentCapacity: 25,
        user: owner,
        kiln: null,
      },
    ];
  });
  mockMethod(t, prisma.controller, "count", async () => 1);
  mockMethod(t, prisma, "$transaction", async (operations) =>
    Promise.all(operations),
  );

  const kilns = await getKilnsPage({
    search: "Cliente",
    restrictUserDetails: true,
  });
  const controllers = await getControllersPage({
    search: "Cliente",
    restrictUserDetails: true,
  });

  assert.deepEqual(kilns.items[0].user, { userId: 4, name: "Cliente" });
  assert.deepEqual(controllers.items[0].user, { userId: 4, name: "Cliente" });
  assert.equal("name" in kilns.items[0], false);
  assert.equal("temperature" in controllers.items[0], false);
  assert.equal("firmwareVersion" in controllers.items[0], false);
  assert.equal(controllers.items[0].switchType, "CONTACTOR");
  assert.equal(controllers.items[0].switchCurrentCapacity, 25);
  const kilnOwnerSearch = kilnWhere.OR.find((entry) => entry.user).user.is.OR;
  const controllerOwnerSearch = controllerWhere.OR.find((entry) => entry.user)
    .user.is.OR;
  assert.equal(
    kilnOwnerSearch.some((entry) => entry.email),
    false,
  );
  assert.equal(
    controllerOwnerSearch.some((entry) => entry.email),
    false,
  );
});

test("linking inherits an existing owner when only one equipment item has one", async (t) => {
  let controllerUpdate;
  let kilnUpdate;
  const tx = {
    kiln: {
      findUnique: async () => ({
        kilnId: 7,
        userId: 4,
        controllerId: null,
        nominalCurrent: 20,
        operationalStatus: "OPERATIONAL",
      }),
      update: async (args) => {
        kilnUpdate = args;
        return {
          kilnId: 7,
          userId: 4,
          controllerId: "11111111-1111-4111-8111-111111abcdef",
          user: { userId: 4, name: "Cliente" },
          controller: {
            controllerId: "11111111-1111-4111-8111-111111abcdef",
            switchType: "CONTACTOR",
            switchCurrentCapacity: 25,
          },
        };
      },
    },
    controller: {
      findUnique: async () => ({
        controllerId: "11111111-1111-4111-8111-111111abcdef",
        userId: null,
        operationalStatus: "MAINTENANCE",
        switchCurrentCapacity: 25,
        kiln: null,
      }),
      update: async (args) => {
        controllerUpdate = args;
        return args;
      },
    },
  };
  mockMethod(t, prisma, "$transaction", async (callback) => callback(tx));

  const result = await linkControllerToKiln(
    7,
    "11111111-1111-4111-8111-111111abcdef",
    { restrictPresentation: true },
  );

  assert.deepEqual(controllerUpdate.data, { userId: 4 });
  assert.deepEqual(kilnUpdate.data, {
    controllerId: "11111111-1111-4111-8111-111111abcdef",
  });
  assert.deepEqual(result.user, { userId: 4, name: "Cliente" });
  assert.equal("name" in result, false);
});

test("linking also transfers the controller owner to an unowned kiln", async (t) => {
  let kilnUpdate;
  const tx = {
    kiln: {
      findUnique: async () => ({
        kilnId: 7,
        userId: null,
        controllerId: null,
        nominalCurrent: 20,
        operationalStatus: "MAINTENANCE",
      }),
      update: async (args) => {
        kilnUpdate = args;
        return {
          kilnId: 7,
          userId: 9,
          controllerId: "11111111-1111-4111-8111-111111abcdef",
          user: { userId: 9, name: "Cliente" },
          controller: {
            controllerId: "11111111-1111-4111-8111-111111abcdef",
            switchType: "CONTACTOR",
            switchCurrentCapacity: 25,
          },
        };
      },
    },
    controller: {
      findUnique: async () => ({
        controllerId: "11111111-1111-4111-8111-111111abcdef",
        userId: 9,
        operationalStatus: "OPERATIONAL",
        switchCurrentCapacity: 25,
        kiln: null,
      }),
      update: async () => assert.fail("the owned controller must not change"),
    },
  };
  mockMethod(t, prisma, "$transaction", async (callback) => callback(tx));

  await linkControllerToKiln(7, "11111111-1111-4111-8111-111111abcdef");

  assert.deepEqual(kilnUpdate.data, {
    controllerId: "11111111-1111-4111-8111-111111abcdef",
    userId: 9,
  });
});

test("linking rejects equipment owned by different clients", async (t) => {
  const tx = {
    kiln: {
      findUnique: async () => ({
        kilnId: 7,
        userId: 4,
        controllerId: null,
        nominalCurrent: 20,
        operationalStatus: "OPERATIONAL",
      }),
    },
    controller: {
      findUnique: async () => ({
        controllerId: "11111111-1111-4111-8111-111111abcdef",
        userId: 9,
        operationalStatus: "OPERATIONAL",
        switchCurrentCapacity: 25,
        kiln: null,
      }),
    },
  };
  mockMethod(t, prisma, "$transaction", async (callback) => callback(tx));

  await assert.rejects(
    linkControllerToKiln(7, "11111111-1111-4111-8111-111111abcdef"),
    /clientes distintos/,
  );
});

test("linking rejects equipment that is out of service", async (t) => {
  const tx = {
    kiln: {
      findUnique: async () => ({
        kilnId: 7,
        userId: null,
        controllerId: null,
        nominalCurrent: 20,
        operationalStatus: "OUT_OF_SERVICE",
      }),
    },
    controller: {
      findUnique: async () => ({
        controllerId: "11111111-1111-4111-8111-111111abcdef",
        userId: null,
        operationalStatus: "OPERATIONAL",
        switchCurrentCapacity: 25,
        kiln: null,
      }),
    },
  };
  mockMethod(t, prisma, "$transaction", async (callback) => callback(tx));

  await assert.rejects(
    linkControllerToKiln(7, "11111111-1111-4111-8111-111111abcdef"),
    /fuera de servicio/,
  );
});

test("linking also rejects an out-of-service controller", async (t) => {
  const tx = {
    kiln: {
      findUnique: async () => ({
        kilnId: 7,
        userId: null,
        controllerId: null,
        nominalCurrent: 20,
        operationalStatus: "OPERATIONAL",
      }),
    },
    controller: {
      findUnique: async () => ({
        controllerId: "11111111-1111-4111-8111-111111abcdef",
        userId: null,
        operationalStatus: "OUT_OF_SERVICE",
        switchCurrentCapacity: 25,
        kiln: null,
      }),
    },
  };
  mockMethod(t, prisma, "$transaction", async (callback) => callback(tx));

  await assert.rejects(
    linkControllerToKiln(7, "11111111-1111-4111-8111-111111abcdef"),
    /fuera de servicio/,
  );
});
