/**
 * Configurazione Internazionalizzazione (i18n) per Film Bloopers Hub
 * Lingue supportate: Italiano (IT - Default), Inglese (EN), Spagnolo (ES), Francese (FR), Tedesco (DE)
 */

export type Locale = "it" | "en" | "es" | "fr" | "de";

export const LOCALES: Locale[] = ["it", "en", "es", "fr", "de"];

export const DEFAULT_LOCALE: Locale = "it";

export interface LocaleDetail {
  code: string;
  name: string;
  label: string;
  flag: string;
  langTag: string; // Per tag html e SEO (es. it-IT, en-US)
}

export const LOCALE_DETAILS: Record<Locale, LocaleDetail> = {
  it: {
    code: "IT",
    name: "Italiano",
    label: "Italiano",
    flag: "🇮🇹",
    langTag: "it-IT",
  },
  en: {
    code: "EN",
    name: "English",
    label: "English",
    flag: "🇬🇧",
    langTag: "en-US",
  },
  es: {
    code: "ES",
    name: "Español",
    label: "Español",
    flag: "🇪🇸",
    langTag: "es-ES",
  },
  fr: {
    code: "FR",
    name: "Français",
    label: "Français",
    flag: "🇫🇷",
    langTag: "fr-FR",
  },
  de: {
    code: "DE",
    name: "Deutsch",
    label: "Deutsch",
    flag: "🇩🇪",
    langTag: "de-DE",
  },
};

/**
 * Verifica se una stringa è un locale valido
 */
export function isSupportedLocale(locale?: string | null): locale is Locale {
  return typeof locale === "string" && (LOCALES as string[]).includes(locale.toLowerCase());
}

/**
 * Estrae il locale dal pathname corrente del browser o della richiesta.
 * Esempi:
 * - "/en/film/titanic" -> "en"
 * - "/es/esplora" -> "es"
 * - "/film/titanic" -> "it" (default)
 */
export function extractLocaleFromPathname(pathname: string): Locale {
  if (!pathname) return DEFAULT_LOCALE;
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0]?.toLowerCase();
  if (isSupportedLocale(first) && first !== DEFAULT_LOCALE) {
    return first;
  }
  return DEFAULT_LOCALE;
}

/**
 * Trasforma qualsiasi percorso verso il locale di destinazione
 * Esempi:
 * - ("/film/titanic", "en") -> "/en/film/titanic"
 * - ("/en/film/titanic", "es") -> "/es/film/titanic"
 * - ("/es/film/titanic", "it") -> "/film/titanic" (default senza prefisso!)
 * - ("/", "en") -> "/en"
 * - ("/en", "it") -> "/"
 */
export function buildLocalizedPath(pathname: string, targetLocale: Locale): string {
  if (!pathname) return targetLocale === DEFAULT_LOCALE ? "/" : `/${targetLocale}`;

  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0]?.toLowerCase();

  // Rimuovi eventuale prefisso locale esistente se presente
  let cleanSegments = segments;
  if (isSupportedLocale(first) && first !== DEFAULT_LOCALE) {
    cleanSegments = segments.slice(1);
  }

  const cleanPath = cleanSegments.length > 0 ? `/${cleanSegments.join("/")}` : "";

  // Se la lingua di destinazione è l'italiano (default), non aggiungiamo prefisso
  if (targetLocale === DEFAULT_LOCALE) {
    return cleanPath || "/";
  }

  // Per le lingue estere, aggiungiamo il prefisso esplicito
  return `/${targetLocale}${cleanPath}`;
}

export const getLocalizedPath = buildLocalizedPath;

/**
 * Helper per estrarre il testo corretto da una colonna JSONB di Supabase (o fallback sul testo originale).
 * Gestisce automaticamente la gerarchia:
 * 1. Testo nella lingua richiesta (es. jsonbObj["en"])
 * 2. Fallback su Inglese se lingua non ancora tradotta (es. jsonbObj["en"])
 * 3. Fallback finale sul testo originale in italiano presente nella colonna classica
 */
export function getLocalizedDbText(
  jsonbObj: Record<string, any> | null | undefined,
  locale: Locale,
  fallbackOriginal: string | null | undefined
): string {
  const original = fallbackOriginal || "";
  if (!jsonbObj || typeof jsonbObj !== "object") {
    return original;
  }

  // 1. Lingua richiesta
  const direct = jsonbObj[locale];
  if (typeof direct === "string" && direct.trim() !== "") {
    return direct;
  }

  // 2. Se l'italiano è stato richiesto ma non c'è nel JSONB, usa il campo originale classico
  if (locale === "it" && original.trim() !== "") {
    return original;
  }

  // 3. Fallback su inglese (lingua universale) se presente
  const enFallback = jsonbObj["en"];
  if (typeof enFallback === "string" && enFallback.trim() !== "") {
    return enFallback;
  }

  // 4. Fallback finale sul campo originale presente a DB
  return original;
}

/**
 * Risolve la lingua attiva da tutte le fonti possibili (searchParams, headers, URL system headers, cookies)
 */
export function resolveLocale({
  searchParams,
  headerList,
  cookieStore,
  pathname,
}: {
  searchParams?: Record<string, any> | null;
  headerList?: { get(name: string): string | null } | null;
  cookieStore?: { get(name: string): { value: string } | undefined } | null;
  pathname?: string | null;
} = {}): Locale {
  // 1. Dalla query string (passata deterministicamente dal rewrite di proxy.ts)
  const q = searchParams?.locale || searchParams?.__locale;
  if (typeof q === "string" && isSupportedLocale(q)) {
    return q;
  }

  // 2. Dagli header di richiesta
  if (headerList) {
    const h = headerList.get("x-locale");
    if (isSupportedLocale(h)) {
      return h;
    }

    const pathsToCheck = [
      headerList.get("x-pathname"),
      headerList.get("x-forwarded-uri"),
      headerList.get("x-invoke-path"),
      headerList.get("x-matched-path"),
      headerList.get("next-url"),
    ];

    for (const p of pathsToCheck) {
      if (p) {
        const loc = extractLocaleFromPathname(p);
        if (loc && loc !== DEFAULT_LOCALE) {
          return loc;
        }
      }
    }
  }

  // 3. Dal pathname fornito
  if (pathname) {
    const loc = extractLocaleFromPathname(pathname);
    if (loc && loc !== DEFAULT_LOCALE) {
      return loc;
    }
  }

  // 4. Dal cookie del browser
  if (cookieStore) {
    const c = cookieStore.get("fbh_locale")?.value;
    if (isSupportedLocale(c)) {
      return c;
    }
  }

  return DEFAULT_LOCALE;
}

