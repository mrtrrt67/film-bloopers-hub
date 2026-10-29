/**
 * Utility centralizzata per rilevare ed escludere account di amministrazione
 * e profili/visite di test da tutte le statistiche e metriche di produzione.
 */

export const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL ||
  process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
  "mrtrrt67@gmail.com"
).toLowerCase().trim();

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
    e.endsWith("@filmbloopers.online") || // es. test_diag... o free@filmbloopers.online
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
