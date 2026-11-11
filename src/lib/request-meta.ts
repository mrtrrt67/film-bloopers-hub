import type { SupabaseClient } from "@supabase/supabase-js";

export interface ClientGeoMetadata {
  ip_address: string | null;
  country: string | null;
  city: string | null;
}

function safeDecodeHeader(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

/** Extracts full client IP and Vercel edge geolocation headers (country, city). */
export function extractClientMetadata(request: Request): ClientGeoMetadata {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstForwardedIp = forwardedFor ? forwardedFor.split(",")[0]?.trim() : null;
  const realIp = request.headers.get("x-real-ip")?.trim() || null;
  const cfIp = request.headers.get("cf-connecting-ip")?.trim() || null;

  const ip_address = firstForwardedIp || realIp || cfIp || null;
  const country = safeDecodeHeader(request.headers.get("x-vercel-ip-country"));
  const city = safeDecodeHeader(request.headers.get("x-vercel-ip-city"));

  return { ip_address, country, city };
}

function isMissingColumnError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "PGRST204" || error.code === "42703") return true;
  const msg = (error.message || "").toLowerCase();
  return msg.includes("column") || msg.includes("schema cache");
}

/** Inserts a log row including IP/geo columns, falling back to basePayload if the DB schema is not migrated yet. */
export async function insertLogWithMeta(
  db: SupabaseClient,
  table: "log_accessi" | "log_ricerche",
  basePayload: Record<string, unknown>,
  meta: ClientGeoMetadata
) {
  const fullPayload = { ...basePayload, ...meta };
  const { error } = await db.from(table).insert(fullPayload);
  if (error && isMissingColumnError(error)) {
    await db.from(table).insert(basePayload);
  }
}

/** Updates a log row including IP/geo columns, falling back to basePayload if the DB schema is not migrated yet. */
export async function updateLogWithMeta(
  db: SupabaseClient,
  table: "log_ricerche",
  id: string | number,
  basePayload: Record<string, unknown>,
  meta: ClientGeoMetadata
) {
  const fullPayload = { ...basePayload, ...meta };
  const { error } = await db.from(table).update(fullPayload).eq("id", id);
  if (error && isMissingColumnError(error)) {
    await db.from(table).update(basePayload).eq("id", id);
  }
}

