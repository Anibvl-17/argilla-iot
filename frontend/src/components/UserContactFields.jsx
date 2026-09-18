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
  renderOption = null,
  disabled = false,
  invalid,
  describedBy,
}) {
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find((option) => option.code === value);
  const normalizedSearch = search ? normalizeSearchText(search.trim()) : "";
  const matches = normalizedSearch
    ? options.filter((option) =>
        normalizeSearchText(getSearchText(option)).includes(normalizedSearch),
      )
    : [];
  const visibleOptions = matches.slice(0, MAX_SEARCH_RESULTS);
  const hiddenCount = matches.length - visibleOptions.length;

  function close() {
    setOpen(false);
    setSearch("");
  }

  function select(option) {
    onSelect(option.code);
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
          {!normalizedSearch && (
            <p className="px-3 py-4 text-center text-sm text-muted">{searchPrompt}</p>
          )}
          {normalizedSearch && !matches.length && (
            <p className="px-3 py-4 text-center text-sm text-muted">{noResultsMessage}</p>
          )}
          {visibleOptions.map((option) => (
            <button
              key={option.code}
              type="button"
              role="option"
              aria-selected={option.code === value}
              onClick={() => select(option)}
              className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover ${option.code === value ? "bg-surface-hover text-content" : "text-secondary"}`}
            >
              {renderOption ? (
                renderOption(option, { selected: option.code === value })
              ) : (
                <span className="truncate">{option.name}</span>
              )}
            </button>
          ))}
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
}) {
  const phoneCountryButtonRef = useRef(null);
  const [isPhoneCountryOpen, setIsPhoneCountryOpen] = useState(false);
  const [phoneCountrySearch, setPhoneCountrySearch] = useState("");
  const updateField = (field, fieldValue, extra = {}) => {
    onChange({ ...value, [field]: fieldValue, ...extra }, field);
    onClearError(field);
  };

  const updateCountry = (countryCode) => {
    onChange(
      {
        ...value,
        countryCode: countryCode || null,
        regionCode: countryCode === "CL" ? value.regionCode || null : null,
        communeCode: countryCode === "CL" ? value.communeCode || null : null,
      },
      "countryCode",
    );
    onClearError("countryCode");
    onClearError("regionCode");
    onClearError("communeCode");
  };

  const updateRegion = (regionCode) => {
    onChange(
      {
        ...value,
        regionCode: regionCode || null,
        communeCode: null,
      },
      "regionCode",
    );
    onClearError("regionCode");
    onClearError("communeCode");
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

  const selectedRegion = catalog.chileRegions.find(
    (region) => region.code === value.regionCode,
  );
  const phoneCountryCode =
    value.phoneCountryCode || getPhoneCountryCode(value.phone) || "CL";
  const selectedPhoneCountry = catalog.countries.find(
    (country) => country.code === phoneCountryCode,
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
          country.code
            .toLocaleLowerCase("es")
            .includes(normalizedPhoneCountrySearch),
      )
    : [];
  const preferredPhoneCountry = catalog.countries.find(
    (country) => country.code === "CL",
  );
  const orderedPhoneCountries =
    normalizedPhoneCountrySearch && preferredPhoneCountry
      ? [
          preferredPhoneCountry,
          ...matchingPhoneCountries.filter((country) => country.code !== "CL"),
        ]
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

      <div className="sm:col-span-2">
        <SearchableCatalogField
          label="País"
          value={value.countryCode || ""}
          options={catalog.countries}
          onSelect={updateCountry}
          placeholder="Selecciona un país"
          searchPlaceholder="Buscar país"
          searchPrompt="Busca un país para ver resultados."
          noResultsMessage="No encontramos países para esa búsqueda."
          listboxLabel="Países"
          getSearchText={(country) => `${country.name} ${country.code} ${country.callingCode}`}
          invalid={hasFormError(error, "countryCode")}
          describedBy={hasFormError(error, "countryCode") ? "country-code-error" : undefined}
        />
        <FieldError error={error} field="countryCode" id="country-code-error" />
      </div>

      {value.countryCode === "CL" ? (
        <div>
          <SearchableCatalogField
            label="Región"
            value={value.regionCode || ""}
            options={catalog.chileRegions}
            onSelect={updateRegion}
            placeholder="Selecciona una región"
            searchPlaceholder="Buscar región"
            searchPrompt="Busca una región para ver resultados."
            noResultsMessage="No encontramos regiones para esa búsqueda."
            listboxLabel="Regiones de Chile"
            invalid={hasFormError(error, "regionCode")}
            describedBy={hasFormError(error, "regionCode") ? "region-code-error" : undefined}
          />
          <FieldError error={error} field="regionCode" id="region-code-error" />
        </div>
      ) : (
        <div className="hidden sm:block" aria-hidden="true" />
      )}

      {value.countryCode === "CL" ? (
        <div>
          <SearchableCatalogField
            label="Comuna"
            value={value.communeCode || ""}
            options={selectedRegion?.communes || []}
            onSelect={(communeCode) => updateField("communeCode", communeCode)}
            placeholder={selectedRegion ? "Selecciona una comuna" : "Selecciona primero una región"}
            searchPlaceholder="Buscar comuna"
            searchPrompt="Busca una comuna para ver resultados."
            noResultsMessage="No encontramos comunas para esa búsqueda."
            listboxLabel="Comunas de la región"
            disabled={!selectedRegion}
            invalid={hasFormError(error, "communeCode")}
            describedBy={hasFormError(error, "communeCode") ? "commune-code-error" : undefined}
          />
          <FieldError
            error={error}
            field="communeCode"
            id="commune-code-error"
          />
        </div>
      ) : (
        <div className="hidden sm:block" aria-hidden="true" />
      )}

      <label className="block min-w-0 text-sm font-medium text-muted sm:col-span-2">
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

      <div className="block min-w-0 text-sm font-medium text-muted sm:col-span-2">
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
              {!normalizedPhoneCountrySearch && (
                <p className="px-3 py-4 text-center text-sm text-muted">
                  Busca por país o código para ver resultados.
                </p>
              )}
              {normalizedPhoneCountrySearch &&
                !orderedPhoneCountries.length && (
                  <p className="px-3 py-4 text-center text-sm text-muted">
                    No encontramos países para esa búsqueda.
                  </p>
                )}
              {visiblePhoneCountries.map((country, index) => (
                <div key={country.code}>
                  {index === 1 && visiblePhoneCountries[0]?.code === "CL" && (
                    <div
                      role="separator"
                      aria-label="Otros países"
                      className="my-1 mx-2 border-t border-border"
                    />
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={country.code === phoneCountryCode}
                    aria-label={`${country.name} (${country.callingCode})`}
                    onClick={() => updatePhoneCountry(country.code)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover ${
                      country.code === phoneCountryCode
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
