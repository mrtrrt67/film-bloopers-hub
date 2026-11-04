import it from "./locales/it.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import {
  Locale,
  LOCALES,
  DEFAULT_LOCALE,
  LOCALE_DETAILS,
  extractLocaleFromPathname,
  buildLocalizedPath,
  getLocalizedDbText,
  isSupportedLocale,
  resolveLocale,
} from "./config";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useEffect } from "react";

export type Dictionary = typeof it;

export const DICTIONARIES: Record<Locale, Dictionary> = {
  it,
  en,
  es,
  fr,
  de,
};

/**
 * Ottiene il dizionario per il locale specificato (per Server Components o funzioni helper)
 */
export function getDictionary(locale?: Locale | string | null): Dictionary {
  if (locale && isSupportedLocale(locale)) {
    return DICTIONARIES[locale];
  }
  return DICTIONARIES[DEFAULT_LOCALE];
}

/**
 * Hook client-side reattivo per accedere al dizionario e cambiare lingua
 */
export function useTranslation() {
  const routerPathname = usePathname() || "/";
  const router = useRouter();

  // Risolve la lingua tenendo conto del fatto che Next.js rewrite maschera il prefisso in usePathname()
  const detectLocale = useCallback((): Locale => {
    if (typeof window !== "undefined") {
      // 1. Pathname reale visibile nella barra degli indirizzi del browser (es. /en/film/...)
      const fromBrowser = extractLocaleFromPathname(window.location.pathname);
      if (fromBrowser !== DEFAULT_LOCALE) return fromBrowser;

      // 2. Query parameter ?locale=...
      const fromQuery = new URLSearchParams(window.location.search).get("locale");
      if (isSupportedLocale(fromQuery)) return fromQuery;

      // 3. Cookie salvato dal selettore di lingua
      const match = document.cookie.match(/fbh_locale=([a-z]{2})/i);
      if (match && isSupportedLocale(match[1])) return match[1];
    }
    return extractLocaleFromPathname(routerPathname);
  }, [routerPathname]);

  const [locale, setLocale] = useState<Locale>(detectLocale);

  useEffect(() => {
    setLocale(detectLocale());
  }, [detectLocale, routerPathname]);

  const dict = useMemo(() => {
    return DICTIONARIES[locale] || DICTIONARIES[DEFAULT_LOCALE];
  }, [locale]);

  const currentDetail = LOCALE_DETAILS[locale];

  /**
   * Cambia la lingua corrente reindirizzando al path localizzato equivalente
   * (preservando query string e hash se presenti)
   */
  const switchLocale = useCallback(
    (newLocale: Locale) => {
      if (newLocale === locale) return;
      const currentPath = typeof window !== "undefined" ? window.location.pathname : routerPathname;
      const newPath = buildLocalizedPath(currentPath, newLocale);
      // Salva preferenza nei cookie / localStorage
      try {
        document.cookie = `fbh_locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
        localStorage.setItem("fbh_locale", newLocale);
      } catch {}
      // Navigazione completa per attivare il proxy server-side e aggiornare tutti i componenti
      if (typeof window !== "undefined") {
        window.location.href = newPath;
      }
    },
    [locale, routerPathname]
  );

  /**
   * Genera l'URL localizzato per un link interno
   */
  const localizeHref = useCallback(
    (href: string): string => {
      if (!href.startsWith("/") || href.startsWith("//") || href.startsWith("/api")) {
        return href;
      }
      return buildLocalizedPath(href, locale);
    },
    [locale]
  );

  return {
    locale,
    dict,
    currentDetail,
    switchLocale,
    localizeHref,
    locales: LOCALES,
    localeDetails: LOCALE_DETAILS,
  };
}

export * from "./config";

