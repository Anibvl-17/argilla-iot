import assert from "node:assert/strict";
import test from "node:test";
import { CHILE_REGIONS, COUNTRIES } from "../src/constants/userContact.constants.js";
import {
  normalizeInternationalPhone,
  normalizeLegacyInternationalPhone,
  normalizePhoneSearch,
  normalizeUserContactData,
} from "../src/utils/userContact.js";
import { registerValidation } from "../src/validations/auth.validation.js";

const countries = new Map([
  [1, { countryId: 1, isoCode: "CL", name: "Chile" }],
  [2, { countryId: 2, isoCode: "US", name: "Estados Unidos" }],
]);
const communes = new Map([
  [101, { communeId: 101, regionId: 8, region: { regionId: 8, countryId: 1 } }],
  [102, { communeId: 102, regionId: 13, region: { regionId: 13, countryId: 1 } }],
]);
const catalogClient = {
  country: { findUnique: async ({ where }) => countries.get(where.countryId) ?? null },
  commune: { findUnique: async ({ where }) => communes.get(where.communeId) ?? null },
};

test("the seed source contains all supported countries and Chilean territory", () => {
  assert.ok(COUNTRIES.length > 200);
  assert.equal(CHILE_REGIONS.length, 16);
  const allCommunes = CHILE_REGIONS.flatMap((region) => region.communes);
  assert.equal(allCommunes.length, 346);
  assert.equal(new Set(allCommunes.map(({ code }) => code)).size, 346);
});

test("national Chilean, Argentinian and Peruvian phones become E.164", () => {
  assert.equal(normalizeInternationalPhone("9 8765 4321", "CL"), "+56987654321");
  assert.equal(normalizeInternationalPhone("11 1234-5678", "AR"), "+541112345678");
  assert.equal(normalizeInternationalPhone("987 654 321", "PE"), "+51987654321");
});

test("an explicit international phone does not depend on an address country", () => {
  assert.equal(normalizeInternationalPhone("+54 11 1234 5678", "CL"), "+541112345678");
});

test("a Chilean user requires a valid region and commune relation", async () => {
  await assert.rejects(normalizeUserContactData({ countryId: 1 }, {}, catalogClient), {
    code: "INVALID_USER_CONTACT",
    field: "regionId",
  });
  await assert.rejects(
    normalizeUserContactData({ countryId: 1, regionId: 8 }, {}, catalogClient),
    { code: "INVALID_USER_CONTACT", field: "communeId" },
  );
  assert.deepEqual(
    await normalizeUserContactData(
      {
        countryId: 1,
        regionId: 8,
        communeId: 101,
        addressLine: "  Los Carrera 1234  ",
      },
      {},
      catalogClient,
    ),
    { countryId: 1, communeId: 101, addressLine: "Los Carrera 1234" },
  );
});

test("a commune must belong to the selected region", async () => {
  await assert.rejects(
    normalizeUserContactData(
      { countryId: 1, regionId: 8, communeId: 102 },
      {},
      catalogClient,
    ),
    { code: "INVALID_USER_CONTACT", field: "communeId" },
  );
});

test("changing region clears an omitted commune before validation", async () => {
  await assert.rejects(
    normalizeUserContactData(
      { regionId: 13 },
      { countryId: 1, communeId: 101, commune: { regionId: 8 } },
      catalogClient,
    ),
    { code: "INVALID_USER_CONTACT", field: "communeId" },
  );
});

test("an international user keeps only the country relation", async () => {
  assert.deepEqual(
    await normalizeUserContactData(
      {
        countryId: 2,
        regionId: 8,
        communeId: 101,
        addressLine: "1600 Pennsylvania Avenue NW",
        phone: null,
      },
      {},
      catalogClient,
    ),
    {
      countryId: 2,
      communeId: null,
      addressLine: "1600 Pennsylvania Avenue NW",
      phone: null,
    },
  );
});

test("an incomplete legacy user must choose a country on profile edit", async () => {
  await assert.rejects(normalizeUserContactData({ addressLine: null }, {}, catalogClient), {
    code: "INVALID_USER_CONTACT",
    field: "countryId",
  });
});

test("phone country remains independent from the residence country", async () => {
  assert.deepEqual(
    await normalizeUserContactData(
      {
        countryId: 1,
        regionId: 8,
        communeId: 101,
        phoneCountryCode: "US",
        phone: "202 555 0123",
      },
      {},
      catalogClient,
    ),
    { countryId: 1, communeId: 101, phone: "+12025550123" },
  );
});

test("invalid and context-free national phones are rejected with a field", () => {
  assert.throws(() => normalizeInternationalPhone("123", "CL"), {
    code: "INVALID_USER_CONTACT",
    field: "phone",
  });
  assert.throws(() => normalizeInternationalPhone("987654321"), {
    code: "INVALID_USER_CONTACT",
    field: "phoneCountryCode",
  });
});

test("legacy phone backfill and formatted search remain supported", () => {
  assert.equal(normalizeLegacyInternationalPhone("+56 9 8765 4321"), "+56987654321");
  assert.equal(normalizeLegacyInternationalPhone("987654321"), null);
  assert.equal(normalizePhoneSearch("+56 9 8765-4321"), "+56987654321");
  assert.equal(normalizePhoneSearch("María"), "");
});

test("registration requires a numeric country id and validates optional contact", () => {
  assert.equal(
    registerValidation.safeParse({
      name: "María Pérez",
      email: "maria@example.com",
      password: "Password123!",
    }).success,
    false,
  );
  assert.equal(
    registerValidation.safeParse({
      name: "María Pérez",
      email: "maria@example.com",
      password: "Password123!",
      countryId: 1,
      regionId: 8,
      communeId: 101,
      phoneCountryCode: "us",
    }).success,
    true,
  );
});
