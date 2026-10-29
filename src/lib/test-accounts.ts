/**
 * Utility centralizzata per la gestione di ambienti (Staging vs Produzione)
 * e identificazione di account e log di test.
 */

export const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL ||
  process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
  "mrtrrt67@gmail.com"
).toLowerCase().trim();

/**
 * Rileva se il codice è in esecuzione nell'ambiente di Staging / Preview / Locale
 */
export function isStagingEnvironment(request?: Request): boolean {
  if (
    process.env.VERCEL_ENV === "preview" ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" ||
    process.env.NODE_ENV === "development"
  ) {
    return true;
  }

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    ""
  ).toLowerCase();

  if (
    siteUrl.includes("staging") ||
    siteUrl.includes("vercel.app") ||
    siteUrl.includes("localhost") ||
    siteUrl.includes("127.0.0.1")
  ) {
    return true;
  }

  if (request) {
    const host = (
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      ""
    ).toLowerCase();

    if (
      host.includes("staging") ||
      host.includes("vercel.app") ||
      host.includes("localhost") ||
      host.includes("127.0.0.1")
    ) {
      return true;
    }
  }

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").toLowerCase();
  if (supabaseUrl.includes("hktzscarmerpbgxgxliq") || supabaseUrl.includes("staging")) {
    return true;
  }

  return false;
}

/**
 * Gli utenti di test vanno esclusi SOLO in PRODUZIONE.
 * In STAGING devono rimanere visibili, conteggiati e attivi per consentire i test completi.
 */
export function shouldExcludeTestAccounts(request?: Request): boolean {
  return !isStagingEnvironment(request);
}

export function isTestEmail(email?: string | null): boolean {
  if (!email) return false;
  const e = email.toLowerCase().trim();

  // Admin
  if (e === ADMIN_EMAIL || e.includes("mrtrrt67")) return true;

  // Pattern account di test / audit
  if (
    e.startsWith("test") ||
    e.includes("test_") ||
    e.includes("_test") ||
    e.includes("audit") ||
    e.includes("diag_") ||
    e.includes("dummy") ||
    e.endsWith("@filmbloopers.online") ||
    e.endsWith("@example.com") ||
    e.endsWith("@test.com")
  ) {
    return true;
  }

  return false;
}

export function isTestUsername(username?: string | null): boolean {
  if (!username) return false;
  const u = username.toLowerCase().trim();

  // Admin
  if (u === "mrtrrt67" || u.includes("mrtrrt67")) return true;

  // Username di test / audit
  if (
    u.startsWith("test") ||
    u.includes("test_") ||
    u.includes("_test") ||
    u.includes("audit") ||
    u.includes("dummy") ||
    u === "audituser" ||
    u === "utente_free" ||
    u === "utente_premium"
  ) {
    return true;
  }

  return false;
}

export function isTestAccount(email?: string | null, username?: string | null): boolean {
  return isTestEmail(email) || isTestUsername(username);
}

export function isTestAccessType(tipo?: string | null, testPrefixes?: Set<string>): boolean {
  if (!tipo) return false;
  const t = tipo.toLowerCase().trim();

  // Admin
  if (t === "admin" || t.includes("mrtrrt67") || t.includes(ADMIN_EMAIL)) {
    return true;
  }

  // Log di test o audit sintetici
  if (
    t.startsWith("audit_") ||
    t.startsWith("test_") ||
    t.includes("audit") ||
    t.includes("test")
  ) {
    return true;
  }

  // Prefissi di ID utente o username di test
  if (testPrefixes && testPrefixes.size > 0) {
    for (const prefix of testPrefixes) {
      if (prefix && t.includes(prefix)) {
        return true;
      }
    }
  }

  return false;
}
