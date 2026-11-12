const ITALIAN_TZ = "Europe/Rome";

/**
 * Converte un timestamp (stringa ISO/PostgreSQL o Date) in oggetto Date,
 * trattando come UTC eventuali stringhe prive di suffisso di fuso orario.
 */
export function parseUtcTimestamp(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const normalized = raw.includes(" ") && !raw.includes("T") ? raw.replace(" ", "T") : raw;
  const hasTimezone = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(normalized);
  const iso = hasTimezone ? normalized : `${normalized}Z`;

  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formatta una data/ora nel fuso orario italiano (Europe/Rome),
 * gestendo automaticamente ora solare (+01:00) e ora legale (+02:00).
 */
export function formatItalianDateTime(
  value?: string | Date | null,
  options?: { includeSeconds?: boolean; fallback?: string }
): string {
  const fallback = options?.fallback ?? "N/D";
  const date = parseUtcTimestamp(value);
  if (!date) return fallback;

  return new Intl.DateTimeFormat("it-IT", {
    timeZone: ITALIAN_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(options?.includeSeconds ? { second: "2-digit" } : {}),
  }).format(date);
}

