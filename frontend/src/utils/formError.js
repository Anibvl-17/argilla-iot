export const DEFAULT_FORM_ERROR =
  "No pudimos completar la solicitud. Revisa los datos e inténtalo nuevamente.";

function validField(field) {
  return typeof field === "string" && field ? field : null;
}

function validMessage(message) {
  return typeof message === "string" ? message.trim() : "";
}

function errorItem(detail, fallbackField = null) {
  if (typeof detail === "string") {
    const message = validMessage(detail);
    return message ? { message, field: validField(fallbackField) } : null;
  }

  const message = validMessage(detail?.message);
  if (!message) return null;

  return {
    message,
    field: validField(detail.errorField || detail.field || fallbackField),
  };
}

function buildFormErrors(items) {
  const errors = items.filter(Boolean);
  const normalized = errors.length
    ? errors
    : [{ message: DEFAULT_FORM_ERROR, field: null }];

  return {
    message: normalized[0].message,
    field: normalized[0].field,
    errors: normalized,
  };
}

export function formError(message, field = null) {
  return buildFormErrors([errorItem(message, field)]);
}

export function normalizeFormError(source, defaultField = null) {
  if (typeof source === "string") return formError(source, defaultField);

  const payload = source?.response?.data ?? source?.data ?? source ?? {};
  const fallbackField =
    payload?.errorField || payload?.field || source?.errorField || defaultField;

  if (Array.isArray(payload?.errors) && payload.errors.length) {
    return buildFormErrors(
      payload.errors.map((detail) => errorItem(detail, fallbackField)),
    );
  }

  if (Array.isArray(payload?.errorDetails)) {
    const errorFields = Array.isArray(payload.errorFields)
      ? payload.errorFields
      : [];
    const items = payload.errorDetails.map((detail, index) =>
      errorItem(
        detail,
        typeof detail === "object"
          ? fallbackField
          : errorFields[index] ||
              (payload.errorDetails.length === 1 ? fallbackField : null),
      ),
    );
    if (items.some(Boolean)) return buildFormErrors(items);
  }

  const detail = errorItem(payload?.errorDetails, fallbackField);
  if (detail) return buildFormErrors([detail]);

  const message =
    validMessage(payload?.message) || validMessage(source?.message);
  return buildFormErrors([
    errorItem(message || DEFAULT_FORM_ERROR, fallbackField),
  ]);
}

export function hasFormError(source, field = null) {
  if (!source) return false;
  return normalizeFormError(source).errors.some(
    (error) => error.field === field,
  );
}

export function clearFormError(source, changedField) {
  if (!source) return null;
  const remaining = normalizeFormError(source).errors.filter(
    (error) => error.field !== null && error.field !== changedField,
  );
  return remaining.length ? buildFormErrors(remaining) : null;
}
