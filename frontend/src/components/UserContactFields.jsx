import { useRef, useState } from "react";
import FieldError from "./FieldError";
import FloatingDropdown from "./FloatingDropdown";
import { hasFormError } from "../utils/formError";
import { formatPhoneInput, getPhoneCountryCode } from "../utils/userContact";

const inputClassName =
  "mt-2 min-w-0 max-w-full w-full rounded-lg border-2 border-control-border bg-field px-3 py-2.5 text-content outline-none transition-colors focus:border-focus disabled:cursor-not-allowed disabled:opacity-60";
const MAX_SEARCH_RESULTS = 10;

const normalizeSearchText = (value) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es");

export function SearchableCatalogField({
  label,
  value,
  options,
  onSelect,
  placeholder,
  searchPlaceholder,
  searchPrompt,
  noResultsMessage,
  listboxLabel,
  getSearchText = (option) => `${option.name} ${option.code}`,
  getOptionId = (option) => option.code,
  renderOption = null,
  disabled = false,
  invalid,
  describedBy,
}) {
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find((option) => getOptionId(option) === value);
  const selectedId = selected ? getOptionId(selected) : null;
  const normalizedSearch = search ? normalizeSearchText(search.trim()) : "";
  const matches = normalizedSearch
    ? options.filter((option) =>
        normalizeSearchText(getSearchText(option)).includes(normalizedSearch),
      )
    : [];
  const otherMatches = matches.filter(
    (option) => getOptionId(option) !== selectedId,
  );
  const resultLimit = selected ? MAX_SEARCH_RESULTS - 1 : MAX_SEARCH_RESULTS;
  const visibleMatches = otherMatches.slice(0, resultLimit);
  const hiddenCount = otherMatches.length - visibleMatches.length;

  const renderCatalogOption = (option) => {
    const isSelected = getOptionId(option) === value;
    return (
      <button
        key={getOptionId(option)}
        type="button"
        role="option"
        aria-selected={isSelected}
        onClick={() => select(option)}
        className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover ${isSelected ? "bg-surface-hover text-content" : "text-secondary"}`}
      >
        {renderOption ? (
          renderOption(option, { selected: isSelected })
        ) : (
          <span className="truncate">{option.name}</span>
        )}
      </button>
    );
  };

  function close() {
    setOpen(false);
    setSearch("");
  }

  function select(option) {
    onSelect(getOptionId(option));
    close();
  }

  return (
    <div className="block min-w-0 text-sm font-medium text-muted">
      <span>{label}</span>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={`${inputClassName} flex items-center justify-between gap-3 text-left`}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      >
        <span className={selected ? "truncate text-content" : "truncate text-muted"}>
          {selected?.name || placeholder}
        </span>
        <svg
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m7 10 5 5 5-5" />
        </svg>
      </button>
      <FloatingDropdown
        anchorRef={buttonRef}
        open={open && !disabled}
        onRequestClose={close}
        minWidth={280}
        maxHeight={288}
      >
        <div className="border-b border-border bg-surface-muted p-2">
          <input
            autoFocus
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full rounded-lg border border-control-border bg-field px-3 py-2 text-sm text-content outline-none focus:border-focus"
          />
        </div>
        <div role="listbox" aria-label={listboxLabel} className="max-h-44 overflow-y-auto p-1">
          {selected && renderCatalogOption(selected)}
          {selected &&
            (!normalizedSearch || visibleMatches.length > 0 || !matches.length) && (
              <div
                role="separator"
                aria-label="Otros resultados"
                className="my-1 mx-2 border-t border-border"
              />
            )}
          {!normalizedSearch && (
            <p className="px-3 py-4 text-center text-sm text-muted">{searchPrompt}</p>
          )}
          {normalizedSearch && !matches.length && (
            <p className="px-3 py-4 text-center text-sm text-muted">{noResultsMessage}</p>
          )}
          {visibleMatches.map(renderCatalogOption)}
        </div>
        {hiddenCount > 0 && (
          <p className="border-t border-border bg-surface-muted px-3 py-2 text-xs text-muted">
            Hay {hiddenCount} resultados ocultos. Haz una búsqueda más específica.
          </p>
        )}
      </FloatingDropdown>
    </div>
  );
}

export default function UserContactFields({
  value,
  onChange,
  error = null,
  onClearError = () => {},
  catalog,
  catalogLoading = false,
  catalogError = "",
  onRetryCatalog = () => {},
  profileLayout = false,
}) {
  const phoneCountryButtonRef = useRef(null);
  const [isPhoneCountryOpen, setIsPhoneCountryOpen] = useState(false);
  const [phoneCountrySearch, setPhoneCountrySearch] = useState("");
  const updateField = (field, fieldValue, extra = {}) => {
    onChange({ ...value, [field]: fieldValue, ...extra }, field);
    onClearError(field);
  };

  const updateCountry = (countryId) => {
    const country = catalog.countries.find(
      (candidate) => candidate.countryId === countryId,
    );
    const isChile = country?.isoCode === "CL";
    onChange(
      {
        ...value,
        countryId: countryId || null,
        regionId: isChile ? value.regionId || null : null,
        communeId: isChile ? value.communeId || null : null,
      },
      "countryId",
    );
    onClearError("countryId");
    onClearError("regionId");
    onClearError("communeId");
  };

  const updateRegion = (regionId) => {
    onChange(
      {
        ...value,
        regionId: regionId || null,
        communeId: null,
      },
      "regionId",
    );
    onClearError("regionId");
    onClearError("communeId");
  };

  const updatePhoneCountry = (phoneCountryCode) => {
    onChange(
      {
        ...value,
        phoneCountryCode,
        phone: "",
      },
      "phoneCountryCode",
    );
    onClearError("phoneCountryCode");
    onClearError("phone");
    setIsPhoneCountryOpen(false);
    setPhoneCountrySearch("");
  };

  if (catalogLoading) {
    return (
      <p className="text-sm text-muted">
        Cargando países, regiones y comunas...
      </p>
    );
  }

  if (catalogError || !catalog) {
    return (
      <div className="rounded-lg border border-warning/50 bg-surface-muted p-3 text-sm text-warning">
        <p>{catalogError || "No se pudo cargar el catálogo de contacto."}</p>
        <button
          type="button"
          className="mt-2 font-semibold underline"
          onClick={onRetryCatalog}
        >
          Reintentar
        </button>
      </div>
    );
  }

  const selectedCountry = catalog.countries.find(
    (country) => country.countryId === value.countryId,
  );
  const isChile = selectedCountry?.isoCode === "CL";
  const availableRegions = catalog.regions.filter(
    (region) => region.countryId === value.countryId,
  );
  const selectedRegion = availableRegions.find(
    (region) => region.regionId === value.regionId,
  );
  const phoneCountryCode =
    value.phoneCountryCode || getPhoneCountryCode(value.phone) || "CL";
  const selectedPhoneCountry = catalog.countries.find(
    (country) => country.isoCode === phoneCountryCode,
  );
  const normalizedPhoneCountrySearch = phoneCountrySearch
    ? normalizeSearchText(phoneCountrySearch.trim())
    : "";
  const matchingPhoneCountries = normalizedPhoneCountrySearch
    ? catalog.countries.filter(
        (country) =>
          normalizeSearchText(country.name).includes(
            normalizedPhoneCountrySearch,
          ) ||
          country.callingCode.includes(normalizedPhoneCountrySearch) ||
          country.isoCode
            .toLocaleLowerCase("es")
            .includes(normalizedPhoneCountrySearch),
      )
    : [];
  const preferredPhoneCountry =
    selectedPhoneCountry ||
    catalog.countries.find((country) => country.isoCode === "CL");
  const otherMatchingPhoneCountries = matchingPhoneCountries.filter(
    (country) => country.isoCode !== preferredPhoneCountry?.isoCode,
  );
  const orderedPhoneCountries = preferredPhoneCountry
    ? [preferredPhoneCountry, ...otherMatchingPhoneCountries]
    : matchingPhoneCountries;
  const visiblePhoneCountries = orderedPhoneCountries.slice(
    0,
    MAX_SEARCH_RESULTS,
  );
  const hiddenPhoneCountryCount =
    orderedPhoneCountries.length - visiblePhoneCountries.length;

  return (
    <fieldset className="grid min-w-0 gap-4 sm:grid-cols-2">
      <legend className="sr-only">Información de contacto y dirección</legend>

      <div className={profileLayout ? "order-2" : "sm:col-span-2"}>
        <SearchableCatalogField
          label="País"
          value={value.countryId || null}
          options={catalog.countries}
          getOptionId={(country) => country.countryId}
          onSelect={updateCountry}
          placeholder="Selecciona un país"
          searchPlaceholder="Buscar país"
          searchPrompt="Busca un país para ver resultados."
          noResultsMessage="No encontramos países para esa búsqueda."
          listboxLabel="Países"
          getSearchText={(country) => `${country.name} ${country.isoCode} ${country.callingCode}`}
          invalid={hasFormError(error, "countryId")}
          describedBy={hasFormError(error, "countryId") ? "country-id-error" : undefined}
        />
        <FieldError error={error} field="countryId" id="country-id-error" />
      </div>

      {isChile ? (
        <div className={profileLayout ? "order-3" : undefined}>
          <SearchableCatalogField
            label="Región"
            value={value.regionId || null}
            options={availableRegions}
            getOptionId={(region) => region.regionId}
            onSelect={updateRegion}
            placeholder="Selecciona una región"
            searchPlaceholder="Buscar región"
            searchPrompt="Busca una región para ver resultados."
            noResultsMessage="No encontramos regiones para esa búsqueda."
            listboxLabel="Regiones de Chile"
            invalid={hasFormError(error, "regionId")}
            describedBy={hasFormError(error, "regionId") ? "region-id-error" : undefined}
          />
          <FieldError error={error} field="regionId" id="region-id-error" />
        </div>
      ) : (
        <div
          className={`${profileLayout ? "order-3 " : ""}hidden sm:block`}
          aria-hidden="true"
        />
      )}

      {isChile ? (
        <div className={profileLayout ? "order-4" : undefined}>
          <SearchableCatalogField
            label="Comuna"
            value={value.communeId || null}
            options={selectedRegion?.communes || []}
            getOptionId={(commune) => commune.communeId}
            onSelect={(communeId) => updateField("communeId", communeId)}
            placeholder={selectedRegion ? "Selecciona una comuna" : "Selecciona primero una región"}
            searchPlaceholder="Buscar comuna"
            searchPrompt="Busca una comuna para ver resultados."
            noResultsMessage="No encontramos comunas para esa búsqueda."
            listboxLabel="Comunas de la región"
            disabled={!selectedRegion}
            invalid={hasFormError(error, "communeId")}
            describedBy={hasFormError(error, "communeId") ? "commune-id-error" : undefined}
          />
          <FieldError
            error={error}
            field="communeId"
            id="commune-id-error"
          />
        </div>
      ) : (
        <div
          className={`${profileLayout ? "order-4 " : ""}hidden sm:block`}
          aria-hidden="true"
        />
      )}

      <label
        className={`${profileLayout ? "order-5 " : ""}block min-w-0 text-sm font-medium text-muted sm:col-span-2`}
      >
        Dirección <span className="font-normal">(opcional)</span>
        <input
          className={inputClassName}
          name="addressLine"
          maxLength={300}
          placeholder="Calle, número y departamento"
          value={value.addressLine || ""}
          onChange={(event) => updateField("addressLine", event.target.value)}
          aria-invalid={hasFormError(error, "addressLine") || undefined}
          aria-describedby={
            hasFormError(error, "addressLine")
              ? "address-line-error"
              : undefined
          }
        />
        <FieldError error={error} field="addressLine" id="address-line-error" />
      </label>

      <div
        className={`${profileLayout ? "order-1" : "sm:col-span-2"} block min-w-0 text-sm font-medium text-muted`}
      >
        <span id="phone-label">
          Teléfono <span className="font-normal">(opcional)</span>
        </span>
        <div className="mt-2 flex min-w-0 rounded-lg border-2 border-control-border bg-field focus-within:border-focus">
          <button
            ref={phoneCountryButtonRef}
            type="button"
            className="flex w-20 shrink-0 items-center justify-between gap-1 rounded-l-md border-r border-control-border bg-field px-2.5 py-2.5 text-content outline-none"
            name="phoneCountryCode"
            aria-label="País del teléfono"
            aria-haspopup="listbox"
            aria-expanded={isPhoneCountryOpen}
            onClick={() => setIsPhoneCountryOpen((current) => !current)}
            aria-invalid={hasFormError(error, "phoneCountryCode") || undefined}
            aria-describedby={
              hasFormError(error, "phoneCountryCode")
                ? "phone-country-code-error"
                : undefined
            }
          >
            <span>{selectedPhoneCountry?.callingCode || "+"}</span>
            <svg
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m7 10 5 5 5-5"
              />
            </svg>
          </button>
          <FloatingDropdown
            anchorRef={phoneCountryButtonRef}
            open={isPhoneCountryOpen}
            onRequestClose={() => setIsPhoneCountryOpen(false)}
            minWidth={280}
            maxHeight={288}
          >
            <div className="border-b border-border bg-surface-muted p-2">
              <input
                autoFocus
                className="w-full rounded-lg border border-control-border bg-field px-3 py-2 text-sm text-content outline-none focus:border-focus"
                type="search"
                value={phoneCountrySearch}
                onChange={(event) => setPhoneCountrySearch(event.target.value)}
                placeholder="Buscar país o código"
                aria-label="Buscar país del teléfono"
              />
            </div>
            <div
              role="listbox"
              aria-label="Países para el teléfono"
              className="max-h-44 overflow-y-auto p-1"
            >
              {visiblePhoneCountries.map((country, index) => (
                <div key={country.countryId}>
                  {index === 1 && (
                    <div
                      role="separator"
                      aria-label="Otros países"
                      className="my-1 mx-2 border-t border-border"
                    />
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={country.isoCode === phoneCountryCode}
                    aria-label={`${country.name} (${country.callingCode})`}
                    onClick={() => updatePhoneCountry(country.isoCode)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover ${
                      country.isoCode === phoneCountryCode
                        ? "bg-surface-hover text-content"
                        : "text-secondary"
                    }`}
                  >
                    <span className="truncate">{country.name}</span>
                    <span className="shrink-0 font-medium text-content">
                      {country.callingCode}
                    </span>
                  </button>
                </div>
              ))}
              {!normalizedPhoneCountrySearch && (
                <p className="px-3 py-4 text-center text-sm text-muted">
                  Busca por país o código para ver resultados.
                </p>
              )}
              {normalizedPhoneCountrySearch &&
                !matchingPhoneCountries.length && (
                  <p className="px-3 py-4 text-center text-sm text-muted">
                    No encontramos países para esa búsqueda.
                  </p>
                )}
            </div>
            {hiddenPhoneCountryCount > 0 && (
              <p className="border-t border-border bg-surface-muted px-3 py-2 text-xs text-muted">
                Hay {hiddenPhoneCountryCount} resultados ocultos. Haz una
                búsqueda más específica.
              </p>
            )}
          </FloatingDropdown>
          <input
            className="w-0 min-w-0 flex-1 bg-transparent px-3 py-2.5 text-content outline-none"
            name="phone"
            type="tel"
            placeholder={
              phoneCountryCode === "CL"
                ? "9 8765 4321"
                : "Número nacional o + internacional"
            }
            value={formatPhoneInput(value.phone || "", phoneCountryCode)}
            onChange={(event) =>
              updateField("phone", event.target.value, { phoneCountryCode })
            }
            aria-labelledby="phone-label"
            aria-invalid={hasFormError(error, "phone") || undefined}
            aria-describedby={
              hasFormError(error, "phone") ? "phone-error" : undefined
            }
          />
        </div>
        <FieldError
          error={error}
          field="phoneCountryCode"
          id="phone-country-code-error"
        />
        <FieldError error={error} field="phone" id="phone-error" />
      </div>
    </fieldset>
  );
}
