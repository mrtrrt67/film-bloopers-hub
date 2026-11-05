import { GoogleGenAI } from "@google/genai";

const MODEL_CANDIDATES = [
  "gemini-flash-lite-latest",
  "gemini-2.5-flash-lite",
  "gemini-flash-latest",
  "gemini-2.5-flash",
];

function getGeminiClient(): GoogleGenAI | null {
  const rawKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;
  if (!rawKey) return null;
  const apiKey = rawKey.trim().replace(/^["']|["']$/g, "");
  return new GoogleGenAI({ apiKey });
}

function cleanAndParseJson<T>(raw: string): T | null {
  if (!raw) return null;
  const jsonMatch = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  const text = jsonMatch ? jsonMatch[0] : raw;
  try {
    return JSON.parse(text) as T;
  } catch {
    const sanitized = text
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/```json/g, "")
      .replace(/```/g, "");
    try {
      return JSON.parse(sanitized) as T;
    } catch {
      return null;
    }
  }
}

/**
 * Traduce un testo italiano nelle 4 lingue supportate (en, es, fr, de)
 * preservando la terminologia cinematografica accurata.
 */
export async function translateFilmText(
  text: string,
  context: "blooper" | "trivia" | "general" = "blooper"
): Promise<Record<string, string>> {
  if (!text || !text.trim()) {
    return { en: "", es: "", fr: "", de: "" };
  }

  const ai = getGeminiClient();
  if (!ai) {
    console.warn("GEMINI_API_KEY non configurata per la traduzione.");
    return { en: text, es: text, fr: text, de: text };
  }

  const prompt = `You are a professional film localization engine.
Translate the following Italian cinema ${context} into English (en), Spanish (es), French (fr), and German (de).
Preserve natural cinema jargon (e.g. shot/plano/plan/Einstellung, cuts, boom mic, props, stunts).

Original Italian:
"""${text.trim()}"""

Return ONLY a valid JSON object with EXACTLY keys "en", "es", "fr", "de".
Do NOT include markdown formatting or explanations.`;

  for (const model of MODEL_CANDIDATES) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      const parsed = cleanAndParseJson<Record<string, string>>(response.text || "");
      if (parsed && parsed.en && parsed.es && parsed.fr && parsed.de) {
        return {
          en: parsed.en.trim(),
          es: parsed.es.trim(),
          fr: parsed.fr.trim(),
          de: parsed.de.trim(),
        };
      }
    } catch (err: any) {
      console.warn(`Tentativo con modello ${model} fallito per traduzione:`, err?.message || err);
    }
  }

  // Fallback se tutte le chiamate falliscono
  return { en: text, es: text, fr: text, de: text };
}

/**
 * Traduce un blocco di testi (fino a 10 per chiamata) per minimizzare consumi e latenza.
 */
export async function batchTranslateFilmTexts(
  items: Array<{ id: string | number; text: string }>,
  context: "blooper" | "trivia" = "blooper"
): Promise<Map<string | number, Record<string, string>>> {
  const result = new Map<string | number, Record<string, string>>();
  if (!items || items.length === 0) return result;

  const ai = getGeminiClient();
  if (!ai) {
    items.forEach((item) => {
      result.set(item.id, { en: item.text, es: item.text, fr: item.text, de: item.text });
    });
    return result;
  }

  const payload = items.map((it, idx) => ({
    refId: String(it.id),
    text: it.text,
  }));

  const prompt = `You are a professional film localization engine.
Translate the following array of Italian cinema ${context} items into English (en), Spanish (es), French (fr), and German (de).
Preserve cinema terminology.

Input items:
${JSON.stringify(payload, null, 2)}

Return ONLY a valid JSON array of objects with the exact structure:
[
  {
    "refId": "string",
    "en": "...",
    "es": "...",
    "fr": "...",
    "de": "..."
  }
]
Do NOT include any text outside the JSON array.`;

  for (const model of MODEL_CANDIDATES) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      const parsed = cleanAndParseJson<Array<{ refId: string; en: string; es: string; fr: string; de: string }>>(
        response.text || ""
      );

      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach((entry) => {
          if (entry.refId && entry.en) {
            result.set(entry.refId, {
              en: entry.en.trim(),
              es: entry.es?.trim() || entry.en.trim(),
              fr: entry.fr?.trim() || entry.en.trim(),
              de: entry.de?.trim() || entry.en.trim(),
            });
          }
        });
        return result;
      }
    } catch (err: any) {
      console.warn(`Batch fallito con modello ${model}:`, err?.message || err);
    }
  }

  // Fallback se il batch fallisce: usa traduzioni singole
  for (const it of items) {
    const single = await translateFilmText(it.text, context);
    result.set(it.id, single);
  }

  return result;
}

