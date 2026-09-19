import assert from "node:assert/strict";
import test from "node:test";
import { getUserContactCatalogData } from "../src/services/catalog.service.js";

test("the contact catalog is read from relational geographic tables", async () => {
  const client = {
    country: {
      findMany: async () => [
        { countryId: 1, isoCode: "AR", name: "Argentina" },
        { countryId: 2, isoCode: "CL", name: "Chile" },
      ],
    },
    region: {
      findMany: async () => [
        {
          regionId: 8,
          countryId: 2,
          code: "08",
          name: "Biobío",
          communes: [
            { communeId: 101, regionId: 8, code: "08101", name: "Concepción" },
          ],
        },
      ],
    },
  };

  const catalog = await getUserContactCatalogData(client);

  assert.deepEqual(catalog.countries[0], {
    countryId: 1,
    isoCode: "AR",
    name: "Argentina",
    callingCode: "+54",
  });
  assert.deepEqual(catalog.regions[0].communes[0], {
    communeId: 101,
    regionId: 8,
    code: "08101",
    name: "Concepción",
  });
});
