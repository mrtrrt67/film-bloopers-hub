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
 * Traduce un testo cinematografico (in qualsiasi lingua di partenza: italiano, inglese, spagnolo, francese, tedesco, ecc.)
 * in TUTTE le 5 lingue supportate (it, en, es, fr, de).
 * Preserva accuratamente la terminologia tecnica cinematografica.
 */
export async function translateFilmText(
  text: string,
  context: "blooper" | "trivia" | "general" = "blooper"
): Promise<Record<string, string>> {
  if (!text || !text.trim()) {
    return { it: "", en: "", es: "", fr: "", de: "" };
  }

  const ai = getGeminiClient();
  if (!ai) {
    console.warn("GEMINI_API_KEY non configurata per la traduzione.");
    return { it: text, en: text, es: text, fr: text, de: text };
  }

  const prompt = `You are a professional film localization engine.
The input text below is a cinema ${context} written in an unknown language (it could be Italian, English, Spanish, French, German, or any other).
Detect the language, and provide high-quality natural translations into ALL five languages:
- "it": Italian
- "en": English
- "es": Spanish
- "fr": French
- "de": German

Preserve natural cinema jargon (e.g. shot/plano/plan/Einstellung, continuity, cuts, boom mic, props, stunts, timestamps).
If the text is already in one of these languages, preserve it faithfully in that language and translate to the other four.

Original Input:
"""${text.trim()}"""

Return ONLY a valid JSON object with EXACTLY keys "it", "en", "es", "fr", "de".
Do NOT include markdown formatting or explanations.`;

  for (const model of MODEL_CANDIDATES) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      const parsed = cleanAndParseJson<Record<string, string>>(response.text || "");
      if (parsed && (parsed.en || parsed.it)) {
        return {
          it: (parsed.it || text).trim(),
          en: (parsed.en || text).trim(),
          es: (parsed.es || parsed.en || text).trim(),
          fr: (parsed.fr || parsed.en || text).trim(),
          de: (parsed.de || parsed.en || text).trim(),
        };
      }
    } catch (err: any) {
      console.warn(`Tentativo con modello ${model} fallito per traduzione:`, err?.message || err);
    }
  }

  // Fallback se tutte le chiamate falliscono
  return { it: text, en: text, es: text, fr: text, de: text };
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
Translate the following array of cinema ${context} items (each in any input language) into ALL five languages:
- "it": Italian
- "en": English
- "es": Spanish
- "fr": French
- "de": German

Preserve cinema terminology.

Input items:
${JSON.stringify(payload, null, 2)}

Return ONLY a valid JSON array of objects with the exact structure:
[
  {
    "refId": "string",
    "it": "...",
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

      const parsed = cleanAndParseJson<Array<{ refId: string; it?: string; en: string; es?: string; fr?: string; de?: string }>>(
        response.text || ""
      );

      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach((entry) => {
          if (entry.refId) {
            const original = items.find(x => String(x.id) === String(entry.refId))?.text || "";
            result.set(entry.refId, {
              it: entry.it?.trim() || original,
              en: entry.en ? entry.en.trim() : original,
              es: entry.es?.trim() || entry.en?.trim() || original,
              fr: entry.fr?.trim() || entry.en?.trim() || original,
              de: entry.de?.trim() || entry.en?.trim() || original,
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

