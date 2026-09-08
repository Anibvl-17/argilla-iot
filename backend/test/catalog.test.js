import assert from "node:assert/strict";
import test from "node:test";
import { getUserContactCatalog } from "../src/controllers/catalog.controller.js";

test("GET /catalog/user-contact exposes the shared catalog contract", () => {
  const response = {
    statusCode: null,
    payload: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };

  getUserContactCatalog({}, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.status, "Success");
  assert.ok(response.payload.data.countries.length > 200);
  assert.equal(response.payload.data.chileRegions.length, 16);
  const communes = response.payload.data.chileRegions.flatMap(
    (region) => region.communes,
  );
  assert.equal(communes.length, 346);
  assert.deepEqual(
    response.payload.data.chileRegions
      .find((region) => region.code === "08")
      .communes.find((commune) => commune.code === "08101"),
    { code: "08101", name: "Concepción" },
  );
});
