import { AsYouType, parsePhoneNumberWithError } from "libphonenumber-js/max";

class UserContactFormError extends Error {
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
    return parsePhoneNumberWithError(value, {
      extract: false,
    }).formatInternational();
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

  const countryId = data.countryId || null;
  const addressLine = data.addressLine?.trim() || null;
  let regionId = data.regionId || null;
  let communeId = data.communeId || null;
  const phoneInput = data.phone?.trim() || null;
  const phoneCountryCode =
    data.phoneCountryCode?.trim().toUpperCase() ||
    getPhoneCountryCode(phoneInput) ||
    null;

  const selectedCountry = catalog.countries.find(
    (country) => country.countryId === countryId,
  );
  if (!selectedCountry) {
    throw new UserContactFormError("countryId", "Selecciona un país válido");
  }

  if (
    phoneCountryCode &&
    !catalog.countries.some((country) => country.isoCode === phoneCountryCode)
  ) {
    throw new UserContactFormError(
      "phoneCountryCode",
      "Selecciona un país válido para el teléfono",
    );
  }

  if (selectedCountry.isoCode !== "CL") {
    regionId = null;
    communeId = null;
  }

  const selectedRegion = catalog.regions.find(
    (region) => region.regionId === regionId,
  );
  if (selectedCountry.isoCode === "CL" && !selectedRegion) {
    throw new UserContactFormError("regionId", "Selecciona una región válida");
  }

  if (communeId && !selectedRegion) {
    throw new UserContactFormError(
      "regionId",
      "Selecciona una región para la comuna indicada",
    );
  }

  if (
    communeId &&
    !selectedRegion.communes.some((commune) => commune.communeId === communeId)
  ) {
    throw new UserContactFormError(
      "communeId",
      "Selecciona una comuna de la región indicada",
    );
  }

  if (selectedCountry.isoCode === "CL" && !regionId) {
    throw new UserContactFormError("regionId", "Selecciona una región");
  }

  if (selectedCountry.isoCode === "CL" && !communeId) {
    throw new UserContactFormError("communeId", "Selecciona una comuna");
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
    countryId,
    regionId,
    communeId,
    addressLine,
  };
}

export function getCountryName(catalog, countryId) {
  return (
    catalog?.countries.find((country) => country.countryId === countryId)
      ?.name ||
    countryId ||
    "Sin país"
  );
}

export function isChileanCountry(catalog, countryId) {
  return (
    catalog?.countries.find((country) => country.countryId === countryId)
      ?.isoCode === "CL"
  );
}

export function getRegionName(catalog, regionId) {
  return (
    catalog?.regions.find((region) => region.regionId === regionId)?.name ||
    regionId ||
    "Sin región"
  );
}

export function getCommuneName(catalog, regionId, communeId) {
  return (
    catalog?.regions
      .find((region) => region.regionId === regionId)
      ?.communes.find((commune) => commune.communeId === communeId)?.name ||
    communeId ||
    "Sin comuna"
  );
}
