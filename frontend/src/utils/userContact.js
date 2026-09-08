import {
  AsYouType,
  parsePhoneNumberWithError,
} from "libphonenumber-js/max";

export class UserContactFormError extends Error {
  constructor(field, message) {
    super(message);
    this.field = field;
  }
}

export function formatPhoneInput(value, countryCode = null) {
  if (!value) return "";
  try {
    return new AsYouType(countryCode || undefined).input(value);
  } catch {
    return value;
  }
}

export function formatPhoneDisplay(value) {
  if (!value) return "";
  try {
    return parsePhoneNumberWithError(value, { extract: false }).formatInternational();
  } catch {
    return value;
  }
}

export function getPhoneCountryCode(value) {
  if (!value?.trim().startsWith("+")) return null;
  try {
    return parsePhoneNumberWithError(value, { extract: false }).country || null;
  } catch {
    return null;
  }
}

export function prepareUserContactPayload(data, catalog) {
  if (!catalog) {
    throw new UserContactFormError(
      null,
      "Espera a que termine de cargar el catálogo de contacto.",
    );
  }

  const countryCode = data.countryCode?.trim().toUpperCase() || null;
  const addressLine = data.addressLine?.trim() || null;
  let regionCode = data.regionCode?.trim() || null;
  let communeCode = data.communeCode?.trim() || null;
  const phoneInput = data.phone?.trim() || null;
  const phoneCountryCode =
    data.phoneCountryCode?.trim().toUpperCase() ||
    getPhoneCountryCode(phoneInput) ||
    null;

  const validCountry = catalog.countries.some(
    (country) => country.code === countryCode,
  );
  if (countryCode && !validCountry) {
    throw new UserContactFormError("countryCode", "Selecciona un país válido");
  }

  if (
    phoneCountryCode &&
    !catalog.countries.some((country) => country.code === phoneCountryCode)
  ) {
    throw new UserContactFormError(
      "phoneCountryCode",
      "Selecciona un país válido para el teléfono",
    );
  }

  if (countryCode !== "CL") {
    regionCode = null;
    communeCode = null;
  }

  const selectedRegion = catalog.chileRegions.find(
    (region) => region.code === regionCode,
  );
  if (regionCode && !selectedRegion) {
    throw new UserContactFormError("regionCode", "Selecciona una región válida");
  }

  if (communeCode && !selectedRegion) {
    throw new UserContactFormError(
      "regionCode",
      "Selecciona una región para la comuna indicada",
    );
  }

  if (
    communeCode &&
    !selectedRegion.communes.some((commune) => commune.code === communeCode)
  ) {
    throw new UserContactFormError(
      "communeCode",
      "Selecciona una comuna de la región indicada",
    );
  }

  if (addressLine && !countryCode) {
    throw new UserContactFormError(
      "countryCode",
      "Selecciona un país cuando ingresas una dirección",
    );
  }

  if (addressLine && countryCode === "CL" && !regionCode) {
    throw new UserContactFormError(
      "regionCode",
      "Selecciona una región para una dirección chilena",
    );
  }

  if (addressLine && countryCode === "CL" && !communeCode) {
    throw new UserContactFormError(
      "communeCode",
      "Selecciona una comuna para una dirección chilena",
    );
  }

  let phone = null;
  if (phoneInput) {
    const isInternational = phoneInput.startsWith("+");
    if (!isInternational && !phoneCountryCode) {
      throw new UserContactFormError(
        "phoneCountryCode",
        "Selecciona el país del teléfono para interpretar el número",
      );
    }

    try {
      const parsed = parsePhoneNumberWithError(
        phoneInput,
        isInternational
          ? { extract: false }
          : { defaultCountry: phoneCountryCode, extract: false },
      );
      if (!parsed.isPossible() || !parsed.isValid()) throw new Error("invalid");
      phone = parsed.number;
    } catch {
      throw new UserContactFormError(
        "phone",
        "Ingresa un teléfono válido para el país seleccionado",
      );
    }
  }

  return {
    phone,
    phoneCountryCode,
    countryCode,
    regionCode,
    communeCode,
    addressLine,
  };
}

export function getCountryName(catalog, countryCode) {
  return (
    catalog?.countries.find((country) => country.code === countryCode)?.name ||
    countryCode ||
    "Sin país"
  );
}

export function getRegionName(catalog, regionCode) {
  return (
    catalog?.chileRegions.find((region) => region.code === regionCode)?.name ||
    regionCode ||
    "Sin región"
  );
}

export function getCommuneName(catalog, regionCode, communeCode) {
  return (
    catalog?.chileRegions
      .find((region) => region.code === regionCode)
      ?.communes.find((commune) => commune.code === communeCode)?.name ||
    communeCode ||
    "Sin comuna"
  );
}
