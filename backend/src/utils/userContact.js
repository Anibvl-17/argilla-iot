import { parsePhoneNumberWithError } from "libphonenumber-js/max";
import {
  CHILE_COUNTRY_CODE,
  CHILE_COMMUNE_REGION_BY_CODE,
  CHILE_REGION_CODES,
  COUNTRY_CODES,
} from "../constants/userContact.constants.js";

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

export class UserContactError extends Error {
  constructor(field, message) {
    super(message);
    this.code = "INVALID_USER_CONTACT";
    this.field = field;
  }
}

export function normalizeInternationalPhone(phone, phoneCountryCode = null) {
  if (phone === null || phone === undefined) return null;

  const rawPhone = String(phone).trim();
  if (!rawPhone) {
    throw new UserContactError("phone", "El teléfono no puede estar vacío");
  }

  const isExplicitInternational = rawPhone.startsWith("+");
  if (!isExplicitInternational && !phoneCountryCode) {
    throw new UserContactError(
      "phoneCountryCode",
      "Debe seleccionar el país del teléfono para interpretar el número",
    );
  }

  try {
    const parsed = parsePhoneNumberWithError(
      rawPhone,
      isExplicitInternational
        ? { extract: false }
        : { defaultCountry: phoneCountryCode, extract: false },
    );

    if (!parsed.isPossible() || !parsed.isValid()) {
      throw new Error("invalid phone");
    }

    return parsed.number;
  } catch {
    throw new UserContactError(
      "phone",
      "Debe ingresar un teléfono válido para el país seleccionado",
    );
  }
}

export function normalizeLegacyInternationalPhone(phone) {
  if (phone === null || phone === undefined) return null;
  const rawPhone = String(phone).trim();
  if (!rawPhone.startsWith("+")) return null;

  try {
    return normalizeInternationalPhone(rawPhone);
  } catch {
    return null;
  }
}

export function normalizePhoneSearch(value) {
  const compact = String(value || "").replace(/[^\d+]/g, "");
  return /\d/.test(compact) ? compact : "";
}

export function normalizeUserContactData(data, current = {}) {
  const updates = {};
  const next = {
    phone: current.phone ?? null,
    countryCode: current.countryCode ?? null,
    regionCode: current.regionCode ?? null,
    communeCode: current.communeCode ?? null,
    addressLine: current.addressLine ?? null,
  };

  if (hasOwn(data, "countryCode")) {
    const countryCode = data.countryCode?.trim().toUpperCase() || null;
    if (countryCode && !COUNTRY_CODES.has(countryCode)) {
      throw new UserContactError(
        "countryCode",
        "El país seleccionado no es válido",
      );
    }
    updates.countryCode = countryCode;
    next.countryCode = countryCode;
  }

  const phoneCountryCode = data.phoneCountryCode?.trim().toUpperCase() || null;
  if (phoneCountryCode && !COUNTRY_CODES.has(phoneCountryCode)) {
    throw new UserContactError(
      "phoneCountryCode",
      "El país seleccionado para el teléfono no es válido",
    );
  }

  if (hasOwn(data, "addressLine")) {
    const addressLine =
      data.addressLine === null ? null : data.addressLine.trim();
    if (addressLine === "") {
      throw new UserContactError(
        "addressLine",
        "La dirección no puede estar vacía",
      );
    }
    updates.addressLine = addressLine;
    next.addressLine = addressLine;
  }

  if (hasOwn(data, "regionCode")) {
    const regionCode = data.regionCode?.trim() || null;
    updates.regionCode = regionCode;
    next.regionCode = regionCode;
  }

  if (hasOwn(data, "communeCode")) {
    const communeCode = data.communeCode?.trim() || null;
    updates.communeCode = communeCode;
    next.communeCode = communeCode;
  } else if (
    hasOwn(data, "regionCode") &&
    next.regionCode !== (current.regionCode ?? null)
  ) {
    updates.communeCode = null;
    next.communeCode = null;
  }

  if (next.countryCode !== CHILE_COUNTRY_CODE) {
    next.regionCode = null;
    next.communeCode = null;
    if (
      hasOwn(data, "regionCode") ||
      (hasOwn(data, "countryCode") && current.regionCode)
    ) {
      updates.regionCode = null;
    }
    if (
      hasOwn(data, "communeCode") ||
      (hasOwn(data, "countryCode") && current.communeCode)
    ) {
      updates.communeCode = null;
    }
  } else {
    if (next.regionCode && !CHILE_REGION_CODES.has(next.regionCode)) {
      throw new UserContactError(
        "regionCode",
        "La región seleccionada no es válida",
      );
    }

    if (next.communeCode) {
      const communeRegion = CHILE_COMMUNE_REGION_BY_CODE.get(next.communeCode);
      if (!communeRegion) {
        throw new UserContactError(
          "communeCode",
          "La comuna seleccionada no es válida",
        );
      }
      if (!next.regionCode) {
        throw new UserContactError(
          "regionCode",
          "Debe seleccionar una región para la comuna indicada",
        );
      }
      if (communeRegion !== next.regionCode) {
        throw new UserContactError(
          "communeCode",
          "La comuna seleccionada no pertenece a la región indicada",
        );
      }
    }
  }

  if (next.addressLine && !next.countryCode) {
    throw new UserContactError(
      "countryCode",
      "Debe seleccionar un país cuando ingresa una dirección",
    );
  }

  if (
    next.addressLine &&
    next.countryCode === CHILE_COUNTRY_CODE &&
    !next.regionCode
  ) {
    throw new UserContactError(
      "regionCode",
      "Debe seleccionar una región para una dirección chilena",
    );
  }

  if (
    next.addressLine &&
    next.countryCode === CHILE_COUNTRY_CODE &&
    !next.communeCode
  ) {
    throw new UserContactError(
      "communeCode",
      "Debe seleccionar una comuna para una dirección chilena",
    );
  }

  if (hasOwn(data, "phone")) {
    updates.phone =
      data.phone === null
        ? null
        : normalizeInternationalPhone(data.phone, phoneCountryCode);
  }

  return updates;
}
