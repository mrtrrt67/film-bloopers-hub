"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useEffect } from "react";
import {
  Locale,
  LOCALES,
  DEFAULT_LOCALE,
  LOCALE_DETAILS,
  extractLocaleFromPathname,
  buildLocalizedPath,
  isSupportedLocale,
} from "./config";
import { DICTIONARIES } from "./dictionaries";

export function useTranslation() {
  const routerPathname = usePathname() || "/";
  const router = useRouter();

  const detectLocale = useCallback((): Locale => {
    if (typeof window !== "undefined") {
      const fromBrowser = extractLocaleFromPathname(window.location.pathname);
      if (fromBrowser !== DEFAULT_LOCALE) return fromBrowser;

      const fromQuery = new URLSearchParams(window.location.search).get("locale");
      if (isSupportedLocale(fromQuery)) return fromQuery;

      return DEFAULT_LOCALE;
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

  const switchLocale = useCallback(
    (newLocale: Locale) => {
      if (newLocale === locale) return;
      const currentPath = typeof window !== "undefined" ? window.location.pathname : routerPathname;
      const newPath = buildLocalizedPath(currentPath, newLocale);
      try {
        document.cookie = `fbh_locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
        localStorage.setItem("fbh_locale", newLocale);
      } catch {}
      if (typeof window !== "undefined") {
        window.location.href = newPath;
      }
    },
    [locale, routerPathname]
  );

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

export type { Locale, LocaleDetail } from "./config";
export {
  LOCALES,
  DEFAULT_LOCALE,
  LOCALE_DETAILS,
  extractLocaleFromPathname,
  buildLocalizedPath,
  isSupportedLocale,
  getLocalizedDbText,
} from "./config";
export { DICTIONARIES, getDictionary, type Dictionary } from "./dictionaries";
