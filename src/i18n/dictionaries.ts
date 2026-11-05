import it from "./locales/it.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import { Locale, DEFAULT_LOCALE, isSupportedLocale } from "./config";

export type Dictionary = typeof it;

export const DICTIONARIES: Record<Locale, Dictionary> = {
  it,
  en,
  es,
  fr,
  de,
};

export function getDictionary(locale?: Locale | string | null): Dictionary {
  if (locale && isSupportedLocale(locale)) {
    return DICTIONARIES[locale];
  }
  return DICTIONARIES[DEFAULT_LOCALE];
}

