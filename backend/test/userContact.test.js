import assert from "node:assert/strict";
import test from "node:test";
import {
  CHILE_REGIONS,
  COUNTRIES,
} from "../src/constants/userContact.constants.js";
import {
  normalizeInternationalPhone,
  normalizeLegacyInternationalPhone,
  normalizePhoneSearch,
  normalizeUserContactData,
} from "../src/utils/userContact.js";
import { registerValidation } from "../src/validations/auth.validation.js";

test("the catalog exposes supported countries, regions and all Chilean communes", () => {
  assert.ok(COUNTRIES.length > 200);
  assert.deepEqual(
    CHILE_REGIONS.map(({ code }) => code),
    Array.from({ length: 16 }, (_, index) =>
      String(index + 1).padStart(2, "0"),
    ),
  );
  const communes = CHILE_REGIONS.flatMap((region) => region.communes);
  assert.equal(communes.length, 346);
  assert.equal(new Set(communes.map(({ code }) => code)).size, 346);
  assert.deepEqual(
    CHILE_REGIONS.find(({ code }) => code === "08").communes.find(
      ({ code }) => code === "08101",
    ),
    { code: "08101", name: "Concepción" },
  );
  assert.deepEqual(
    COUNTRIES.find(({ code }) => code === "CL"),
    { code: "CL", name: "Chile", callingCode: "+56" },
  );
});

test("national Chilean, Argentinian and Peruvian phones become E.164", () => {
  assert.equal(
    normalizeInternationalPhone("9 8765 4321", "CL"),
    "+56987654321",
  );
  assert.equal(
    normalizeInternationalPhone("11 1234-5678", "AR"),
    "+541112345678",
  );
  assert.equal(
    normalizeInternationalPhone("987 654 321", "PE"),
    "+51987654321",
  );
});

test("an explicit international phone does not depend on an address country", () => {
  assert.equal(
    normalizeInternationalPhone("+54 11 1234 5678", "CL"),
    "+541112345678",
  );
});

test("a national phone uses its own country independently from the address", () => {
  assert.deepEqual(
    normalizeUserContactData({
      countryCode: "CL",
      regionCode: "08",
      communeCode: "08101",
      addressLine: "Los Carrera 1234",
      phoneCountryCode: "US",
      phone: "202 555 0123",
    }),
    {
      countryCode: "CL",
      regionCode: "08",
      communeCode: "08101",
      addressLine: "Los Carrera 1234",
      phone: "+12025550123",
    },
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

test("a Chilean address requires a valid region and commune", () => {
  assert.throws(
    () =>
      normalizeUserContactData({ countryCode: "CL", addressLine: "Calle 1" }),
    { code: "INVALID_USER_CONTACT", field: "regionCode" },
  );
  assert.deepEqual(
    normalizeUserContactData({
      countryCode: "cl",
      regionCode: "08",
      communeCode: "08101",
      addressLine: "  Los Carrera 1234  ",
    }),
    {
      countryCode: "CL",
      regionCode: "08",
      communeCode: "08101",
      addressLine: "Los Carrera 1234",
    },
  );
  assert.throws(
    () =>
      normalizeUserContactData({
        countryCode: "CL",
        regionCode: "08",
        addressLine: "Calle 1",
      }),
    { code: "INVALID_USER_CONTACT", field: "communeCode" },
  );
});

test("changing away from Chile clears a previous region and commune", () => {
  assert.deepEqual(
    normalizeUserContactData(
      { countryCode: "AR" },
      {
        countryCode: "CL",
        regionCode: "08",
        communeCode: "08101",
        addressLine: "Calle 1",
      },
    ),
    { countryCode: "AR", regionCode: null, communeCode: null },
  );
});

test("communes must exist and belong to the selected region", () => {
  assert.throws(
    () =>
      normalizeUserContactData({
        countryCode: "CL",
        regionCode: "08",
        communeCode: "13101",
      }),
    { code: "INVALID_USER_CONTACT", field: "communeCode" },
  );
  assert.throws(
    () =>
      normalizeUserContactData({
        countryCode: "CL",
        regionCode: "08",
        communeCode: "08999",
      }),
    { code: "INVALID_USER_CONTACT", field: "communeCode" },
  );
});

test("changing region clears an omitted commune before final-state validation", () => {
  assert.deepEqual(
    normalizeUserContactData(
      { regionCode: "13" },
      { countryCode: "CL", regionCode: "08", communeCode: "08101" },
    ),
    { regionCode: "13", communeCode: null },
  );
  assert.deepEqual(
    normalizeUserContactData(
      { regionCode: "13", communeCode: "13101" },
      { countryCode: "CL", regionCode: "08", communeCode: "08101" },
    ),
    { regionCode: "13", communeCode: "13101" },
  );
});

test("nullable address fields can be cleared explicitly", () => {
  assert.deepEqual(
    normalizeUserContactData(
      { countryCode: null, addressLine: null },
      {
        countryCode: "CL",
        regionCode: "08",
        communeCode: "08101",
        addressLine: "Calle 1",
      },
    ),
    {
      countryCode: null,
      regionCode: null,
      communeCode: null,
      addressLine: null,
    },
  );
});

test("foreign addresses accept no region and nullable contact fields", () => {
  assert.deepEqual(
    normalizeUserContactData({
      countryCode: "US",
      regionCode: "08",
      communeCode: "08101",
      addressLine: "1600 Pennsylvania Avenue NW, Washington DC",
      phone: null,
    }),
    {
      countryCode: "US",
      regionCode: null,
      communeCode: null,
      addressLine: "1600 Pennsylvania Avenue NW, Washington DC",
      phone: null,
    },
  );
});

test("legacy backfill preserves valid international phones only", () => {
  assert.equal(
    normalizeLegacyInternationalPhone("+56 9 8765 4321"),
    "+56987654321",
  );
  assert.equal(normalizeLegacyInternationalPhone("987654321"), null);
  assert.equal(normalizeLegacyInternationalPhone("+56 9 0000 0000"), null);
  assert.equal(normalizeLegacyInternationalPhone(null), null);
});

test("formatted phone searches are compacted to match stored E.164 values", () => {
  assert.equal(normalizePhoneSearch("+56 9 8765-4321"), "+56987654321");
  assert.equal(normalizePhoneSearch("María"), "");
});

test("request validation accepts minimal registration and validates optional contact", () => {
  assert.equal(
    registerValidation.safeParse({
      name: "María Pérez",
      email: "maria@example.com",
      password: "Password123!",
    }).success,
    true,
  );
  const parsed = registerValidation.parse({
    name: "María Pérez",
    email: "maria@example.com",
    password: "Password123!",
    countryCode: "cl",
    phoneCountryCode: "us",
  });
  assert.equal(parsed.countryCode, "CL");
  assert.equal(parsed.phoneCountryCode, "US");
  assert.equal(
    registerValidation.safeParse({
      name: "María Pérez",
      email: "maria@example.com",
      password: "Password123!",
      addressLine: "   ",
    }).success,
    false,
  );
});
