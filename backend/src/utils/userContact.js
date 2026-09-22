import { getCountries, parsePhoneNumberWithError } from "libphonenumber-js/max";

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const PHONE_COUNTRY_CODES = new Set(getCountries());

class UserContactError extends Error {
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

export async function normalizeUserContactData(data, current = {}, client) {
  if (!client) throw new Error("Se requiere un cliente de catálogo geográfico");
  const updates = {};
  const next = {
    phone: current.phone ?? null,
    countryId: current.countryId ?? null,
    regionId: current.regionId ?? current.commune?.regionId ?? null,
    communeId: current.communeId ?? null,
    addressLine: current.addressLine ?? null,
  };

  if (hasOwn(data, "countryId")) {
    updates.countryId = data.countryId;
    next.countryId = data.countryId;
  }

  const phoneCountryCode = data.phoneCountryCode?.trim().toUpperCase() || null;
  if (phoneCountryCode && !PHONE_COUNTRY_CODES.has(phoneCountryCode)) {
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

  if (hasOwn(data, "regionId")) {
    next.regionId = data.regionId;
  }

  if (hasOwn(data, "communeId")) {
    updates.communeId = data.communeId;
    next.communeId = data.communeId;
  } else if (
    hasOwn(data, "regionId") &&
    next.regionId !== (current.regionId ?? current.commune?.regionId ?? null)
  ) {
    updates.communeId = null;
    next.communeId = null;
  }

  if (!next.countryId) {
    throw new UserContactError("countryId", "Debe seleccionar un país");
  }

  const country = await client.country.findUnique({
    where: { countryId: next.countryId },
  });
  if (!country) {
    throw new UserContactError(
      "countryId",
      "El país seleccionado no es válido",
    );
  }

  if (country.isoCode !== "CL") {
    next.regionId = null;
    next.communeId = null;
    if (hasOwn(data, "communeId") || current.communeId) {
      updates.communeId = null;
    }
  } else {
    if (!next.regionId) {
      throw new UserContactError("regionId", "Debe seleccionar una región");
    }
    if (!next.communeId) {
      throw new UserContactError("communeId", "Debe seleccionar una comuna");
    }

    const commune = await client.commune.findUnique({
      where: { communeId: next.communeId },
      include: { region: true },
    });
    if (!commune) {
      throw new UserContactError(
        "communeId",
        "La comuna seleccionada no es válida",
      );
    }
    if (commune.regionId !== next.regionId) {
      throw new UserContactError(
        "communeId",
        "La comuna seleccionada no pertenece a la región indicada",
      );
    }
    if (commune.region.countryId !== country.countryId) {
      throw new UserContactError(
        "communeId",
        "La comuna seleccionada no pertenece al país indicado",
      );
    }
  }

  if (hasOwn(data, "phone")) {
    updates.phone =
      data.phone === null
        ? null
        : normalizeInternationalPhone(data.phone, phoneCountryCode);
  }

  return updates;
}
