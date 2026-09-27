import assert from "node:assert/strict";
import test from "node:test";
import {
  createMaintenanceValidation,
  createSupportReasonValidation,
  createSupportTicketValidation,
  updateSupportReasonValidation,
  updateMaintenanceValidation,
} from "../src/validations/support.validation.js";

test("support tickets accept an optional kiln and require meaningful text", () => {
  const valid = createSupportTicketValidation.parse({
    kilnId: 12,
    supportReasonId: 3,
    title: "  Temperatura inestable  ",
    description: "La temperatura cae durante la segunda etapa.",
  });
  assert.equal(valid.title, "Temperatura inestable");
  assert.equal(
    createSupportTicketValidation.parse({
      supportReasonId: 3,
      title: "Ayuda de vinculación",
      description: "El controlador no completa la vinculación.",
    }).kilnId,
    undefined,
  );
  assert.throws(() =>
    createSupportTicketValidation.parse({
      kilnId: 0,
      supportReasonId: 3,
      title: "Ayuda de vinculación",
      description: "El controlador no completa la vinculación.",
    }),
  );
  assert.throws(() =>
    createSupportTicketValidation.parse({
      supportReasonId: 3,
      title: "Ok",
      description: "Muy corto",
    }),
  );
});

test("maintenance accepts kiln, controller or both but rejects no target", () => {
  const base = {
    type: "INSPECTION",
    title: "Revisión eléctrica",
    workPerformed: "Se revisaron conexiones y contactor.",
    performedAt: "2026-09-14T12:00:00.000Z",
  };
  assert.equal(
    createMaintenanceValidation.parse({ ...base, kilnId: 1 }).kilnId,
    1,
  );
  assert.ok(
    createMaintenanceValidation.parse({
      ...base,
      controllerId: "11111111-1111-4111-8111-111111111111",
    }).controllerId,
  );
  assert.deepEqual(
    Object.keys(
      createMaintenanceValidation.parse({
        ...base,
        kilnId: 1,
        controllerId: "11111111-1111-4111-8111-111111111111",
      }),
    ).includes("kilnId"),
    true,
  );
  assert.throws(() => createMaintenanceValidation.parse(base));
  assert.equal(
    updateMaintenanceValidation.parse({ ...base, kilnId: 1 }).title,
    "Revisión eléctrica",
  );
});

test("support reason codes are canonical and immutable on update", () => {
  assert.equal(
    createSupportReasonValidation.parse({
      code: "TEMPERATURE_SENSOR",
      name: "Sensor",
    }).code,
    "TEMPERATURE_SENSOR",
  );
  assert.throws(() =>
    createSupportReasonValidation.parse({ code: "lowercase", name: "Sensor" }),
  );
  assert.deepEqual(updateSupportReasonValidation.parse({ isActive: false }), {
    isActive: false,
  });
  assert.throws(() =>
    updateSupportReasonValidation.parse({ code: "NEW_CODE" }),
  );
});
