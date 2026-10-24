import { GoogleGenAI } from "@google/genai";
import { BlooperCategoria } from "./types";

const DEFAULT_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
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

export interface GeneratedBlooper {
  minuto: string;
  categoria: BlooperCategoria;
  descrizione: string;
}

async function getAvailableModels(ai: GoogleGenAI): Promise<string[]> {
  const discovered: string[] = [];
  try {
    const pager = await ai.models.list();
    for await (const m of pager) {
      const name = m.name?.replace(/^models\//, "") || "";
      const methods = (m as any).supportedGenerationMethods || [];
      if (methods.length === 0 || methods.includes("generateContent")) {
        if (name && name.toLowerCase().includes("gemini") && !name.includes("embedding") && !name.includes("aqa")) {
          discovered.push(name);
        }
      }
    }
  } catch (err) {
    console.warn("Impossibile elencare i modelli Gemini:", err);
  }
  return discovered;
}

export async function generateBloopersForMovie(params: {
  titolo: string;
  anno?: string | number | null;
  regista?: string | null;
  attori?: string | null;
  trama?: string | null;
  erroriEsistenti?: string[];
}): Promise<{ bloopers: GeneratedBlooper[]; error?: string }> {
  const ai = getGeminiClient();
  if (!ai) {
    console.warn("GEMINI_API_KEY non configurata nelle variabili d'ambiente");
    return {
      bloopers: [],
      error:
        "Chiave GEMINI_API_KEY non trovata nelle Environment Variables di Vercel. Aggiungi GEMINI_API_KEY nella dashboard di Vercel per abilitare la generazione.",
    };
  }

  const { titolo, anno, regista, attori, trama, erroriEsistenti = [] } = params;

  const esclusioneText =
    erroriEsistenti.length > 0
      ? `\nERRORI GIÀ REGISTRATI (NON RIPETERE QUESTI O ERRORI SIMILI):\n${erroriEsistenti
          .slice(0, 15)
          .map((e) => `- ${e.slice(0, 120)}`)
          .join("\n")}`
      : "";

  const prompt = `Sei un esperto enciclopedico di bloopers, errori di montaggio, sviste storiche e ciak falsi nella storia del cinema.

DATI UFFICIALI DEL FILM:
- Titolo: "${titolo}" (${anno || "N/D"})
- Regia: ${regista || "N/D"}
- Cast: ${attori || "N/D"}
- Sinossi: ${trama || "N/D"}
${esclusioneText}

COMPITO:
Trova tra 5 e 8 errori/bloopers concreti, celebri o documentati per questo film.
Le categorie ammesse sono ESCLUSIVAMENTE:
1. "Errori di scena / Posizione"
2. "Troupe o microfoni visibili"
3. "Anacronismi"
4. "Errori storici o fattuali"

REGOLE TASSATIVE:
- Restituisci ESCLUSIVAMENTE un array JSON valido, senza testo introduttivo né commenti markdown.
- Formato minuto: indicare una stima plausibile del minutaggio (es. "00:42:15" o "01:15:30").
- La descrizione deve essere dettagliata in italiano, spiegando esattamente cosa guardare a schermo.

FORMATO OUTPUT:
[
  {
    "minuto": "01:05:20",
    "categoria": "Errori di scena / Posizione",
    "descrizione": "Durante il dialogo a tavola, il livello del bicchiere di vino si alza e si abbassa magicamente tra un cambio di inquadratura e l'altro."
  }
]`;

  const errorsLog: string[] = [];

  // 1. Prova prima con i modelli prioritari
  for (const model of DEFAULT_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const text = response.text?.trim() || "";
      if (!text) continue;

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const cleanJson = jsonMatch ? jsonMatch[0] : text;

      const parsed = JSON.parse(cleanJson) as GeneratedBlooper[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return {
          bloopers: parsed.map((item) => ({
            minuto: item.minuto || "00:00:00",
            categoria: (item.categoria as BlooperCategoria) || "Errori di scena / Posizione",
            descrizione: item.descrizione || "",
          })),
        };
      }
    } catch (err: any) {
      console.error(`Errore Gemini con modello ${model}:`, err);
      errorsLog.push(`[${model}]: ${err?.message || err}`);
      continue;
    }
  }

  // 2. Se tutti i modelli di default hanno fallito, interroga dinamicamente i modelli abilitati sulla chiave
  const discoveredModels = await getAvailableModels(ai);
  const remainingModels = discoveredModels.filter((m) => !DEFAULT_MODELS.includes(m));

  for (const model of remainingModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const text = response.text?.trim() || "";
      if (!text) continue;

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const cleanJson = jsonMatch ? jsonMatch[0] : text;

      const parsed = JSON.parse(cleanJson) as GeneratedBlooper[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return {
          bloopers: parsed.map((item) => ({
            minuto: item.minuto || "00:00:00",
            categoria: (item.categoria as BlooperCategoria) || "Errori di scena / Posizione",
            descrizione: item.descrizione || "",
          })),
        };
      }
    } catch (err: any) {
      console.error(`Errore Gemini con modello dinamico ${model}:`, err);
      errorsLog.push(`[${model}]: ${err?.message || err}`);
      continue;
    }
  }

  return {
    bloopers: [],
    error: errorsLog.length > 0
      ? `Errore durante la chiamata Gemini: ${errorsLog[0]}`
      : "Nessun nuovo blooper trovato per questa pellicola.",
  };
}
