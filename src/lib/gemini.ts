import { GoogleGenAI } from "@google/genai";
import { BlooperCategoria } from "./types";

const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

function getGeminiClient(): GoogleGenAI | null {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

export interface GeneratedBlooper {
  minuto: string;
  categoria: BlooperCategoria;
  descrizione: string;
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
        "Chiave GEMINI_API_KEY non trovata nelle Environment Variables di Vercel. Aggiungi GEMINI_API_KEY (o GOOGLE_API_KEY) nella dashboard di Vercel per abilitare la generazione.",
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

  let lastErrorMsg = "";

  for (const model of GEMINI_MODELS) {
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

      // Estrazione array JSON
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
      lastErrorMsg = err?.message || String(err);
      continue;
    }
  }

  return {
    bloopers: [],
    error: lastErrorMsg
      ? `Errore durante la chiamata Gemini: ${lastErrorMsg}`
      : "Nessun nuovo blooper trovato per questa pellicola.",
  };
}
