import {
  getCountries,
  getCountryCallingCode,
} from "libphonenumber-js/max";
import {
  CHILE_COMMUNES_BY_REGION,
} from "./chileCommunes.constants.js";

const CHILE_REGION_BASE = [
  { code: "01", name: "Tarapacá" },
  { code: "02", name: "Antofagasta" },
  { code: "03", name: "Atacama" },
  { code: "04", name: "Coquimbo" },
  { code: "05", name: "Valparaíso" },
  { code: "06", name: "O'Higgins" },
  { code: "07", name: "Maule" },
  { code: "08", name: "Biobío" },
  { code: "09", name: "Araucanía" },
  { code: "10", name: "Los Lagos" },
  { code: "11", name: "Aysén" },
  { code: "12", name: "Magallanes" },
  { code: "13", name: "Metropolitana" },
  { code: "14", name: "Los Ríos" },
  { code: "15", name: "Arica y Parinacota" },
  { code: "16", name: "Ñuble" },
];

export const CHILE_REGIONS = Object.freeze(
  CHILE_REGION_BASE.map((region) => ({
    ...region,
    communes: CHILE_COMMUNES_BY_REGION[region.code],
  })),
);

const displayNames = new Intl.DisplayNames(["es"], { type: "region" });
const NON_ISO_PHONE_TERRITORIES = new Set(["AC", "TA", "XK"]);

export const COUNTRIES = Object.freeze(
  getCountries()
    .filter((code) => !NON_ISO_PHONE_TERRITORIES.has(code))
    .map((code) => ({
      code,
      name: displayNames.of(code) || code,
      callingCode: `+${getCountryCallingCode(code)}`,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "es")),
);
