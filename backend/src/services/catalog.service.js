import { getCountryCallingCode } from "libphonenumber-js/max";
import { prisma } from "../config/prisma.js";

export async function getUserContactCatalogData(client = prisma) {
  const [countries, regions] = await Promise.all([
    client.country.findMany({ orderBy: { name: "asc" } }),
    client.region.findMany({
      orderBy: { code: "asc" },
      include: { communes: { orderBy: { name: "asc" } } },
    }),
  ]);

  return {
    countries: countries.map((country) => ({
      countryId: country.countryId,
      isoCode: country.isoCode,
      name: country.name,
      callingCode: `+${getCountryCallingCode(country.isoCode)}`,
    })),
    regions: regions.map((region) => ({
      regionId: region.regionId,
      countryId: region.countryId,
      code: region.code,
      name: region.name,
      communes: region.communes.map((commune) => ({
        communeId: commune.communeId,
        regionId: commune.regionId,
        code: commune.code,
        name: commune.name,
      })),
    })),
  };
}
