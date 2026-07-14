import { normalizeFormError } from "../utils/formError";

export default function FieldError({ error, field = null, id }) {
  if (!error) return null;
  const messages = normalizeFormError(error).errors.filter(
    (item) => item.field === field,
  );
  if (!messages.length) return null;

  return (
    <div id={id} role="alert" className="mt-1 space-y-1">
      {messages.map((item, index) => (
        <p key={`${item.field || "general"}-${index}`} className="text-sm font-medium text-amber-400">
          {item.message}
        </p>
      ))}
    </div>
  );
}
