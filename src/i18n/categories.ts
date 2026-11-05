import { Dictionary } from "./dictionaries";
import { getDictionary, Locale, isSupportedLocale, DEFAULT_LOCALE } from "./index";

function resolveDict(dictOrLocale: Dictionary | string): Dictionary {
  if (typeof dictOrLocale === "string") {
    const loc: Locale = isSupportedLocale(dictOrLocale) ? dictOrLocale : DEFAULT_LOCALE;
    return getDictionary(loc);
  }
  return dictOrLocale;
}

export function getLocalizedBlooperCategory(rawCategory: string, dictOrLocale: Dictionary | string): string {
  const dict = resolveDict(dictOrLocale);
  if (!rawCategory) return dict.categories.altro;
  const lower = rawCategory.toLowerCase();

  if (lower.includes("continuit") || lower.includes("continuity")) return dict.categories["continuità"];
  if (lower.includes("anacronism")) return dict.categories.anacronismo;
  if (lower.includes("microfon") || lower.includes("troupe")) return dict.categories.microfono;
  if (lower.includes("rifless")) return dict.categories.riflesso;
  if (lower.includes("attrezzatur") || lower.includes("equipment")) return dict.categories.attrezzatura;
  if (lower.includes("audio") || lower.includes("labiale") || lower.includes("doppiagg") || lower.includes("sync")) return dict.categories.audio;
  if (lower.includes("montaggio") || lower.includes("cut")) return dict.categories.montaggio;
  if (lower.includes("geografic")) return dict.categories.geografico;
  if (lower.includes("storic") || lower.includes("fattual")) return dict.categories.storico;
  if (lower.includes("scena") || lower.includes("props") || lower.includes("oggett") || lower.includes("abbigliamento") || lower.includes("costum")) return dict.categories.scena;
  if (lower.includes("effett") || lower.includes("vfx") || lower.includes("cavi")) return dict.categories.effetti;
  if (lower.includes("controfigur") || lower.includes("stunt")) return dict.categories.controfigura;

  return rawCategory;
}

export function getLocalizedTriviaCategory(rawCategory: string, dictOrLocale: Dictionary | string): string {
  const dict = resolveDict(dictOrLocale);
  if (!rawCategory) return dict.triviaCategories.curiosità;
  const lower = rawCategory.toLowerCase();

  if (lower === "tutte" || lower === "all" || lower === "todas" || lower === "toutes" || lower === "alle") {
    return dict.common?.all || "Tutte";
  }
  if (lower.includes("segret") || lower.includes("produzion")) return dict.triviaCategories.segreti;
  if (lower.includes("aneddoti")) return dict.triviaCategories.aneddoti;
  if (lower.includes("effett") || lower.includes("trucco") || lower.includes("vfx")) return dict.triviaCategories.effetti;
  if (lower.includes("casting") || lower.includes("scelte") || lower.includes("ruoli")) return dict.triviaCategories.casting;
  if (lower.includes("citazion") || lower.includes("easter") || lower.includes("egg")) return dict.triviaCategories.citazioni;
  if (lower.includes("retroscena")) return dict.triviaCategories.retroscena;

  return dict.triviaCategories.curiosità;
}
