import { GoogleGenAI } from "@google/genai";
import { BlooperCategoria, TriviaCategoria } from "./types";

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

export interface GenerateBloopersResult {
  bloopers: GeneratedBlooper[];
  modelUsed?: string;
  executionTimeSec?: number;
  errorsLog: Array<{ model: string; error: string }>;
  error?: string;
}

export async function generateBloopersForMovie(params: {
  titolo: string;
  anno?: string | number | null;
  regista?: string | null;
  attori?: string | null;
  trama?: string | null;
  erroriEsistenti?: string[];
}): Promise<GenerateBloopersResult> {
  const ai = getGeminiClient();
  if (!ai) {
    console.warn("GEMINI_API_KEY non configurata nelle variabili d'ambiente");
    return {
      bloopers: [],
      errorsLog: [],
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

  const errorsLog: Array<{ model: string; error: string }> = [];

  // 1. Prova prima con i modelli prioritari
  for (const model of DEFAULT_MODELS) {
    try {
      const t0 = performance.now();
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });
      const t1 = performance.now();
      const executionTimeSec = Number(((t1 - t0) / 1000).toFixed(2));

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
          modelUsed: model,
          executionTimeSec,
          errorsLog,
        };
      }
    } catch (err: any) {
      console.error(`Errore Gemini con modello ${model}:`, err);
      errorsLog.push({ model, error: err?.message || String(err) });
      continue;
    }
  }

  // 2. Se tutti i modelli di default hanno fallito, interroga dinamicamente i modelli abilitati sulla chiave
  const discoveredModels = await getAvailableModels(ai);
  const remainingModels = discoveredModels.filter((m) => !DEFAULT_MODELS.includes(m));

  for (const model of remainingModels) {
    try {
      const t0 = performance.now();
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });
      const t1 = performance.now();
      const executionTimeSec = Number(((t1 - t0) / 1000).toFixed(2));

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
          modelUsed: model,
          executionTimeSec,
          errorsLog,
        };
      }
    } catch (err: any) {
      console.error(`Errore Gemini con modello dinamico ${model}:`, err);
      errorsLog.push({ model, error: err?.message || String(err) });
      continue;
    }
  }

  return {
    bloopers: [],
    errorsLog,
    error: errorsLog.length > 0
      ? `Errore durante la chiamata Gemini: ${errorsLog[0].error}`
      : "Nessun nuovo blooper trovato per questa pellicola.",
  };
}

export interface GeneratedTrivia {
  categoria: TriviaCategoria;
  titolo: string;
  descrizione: string;
  fonte?: string;
}

export interface GenerateTriviaResult {
  trivia: GeneratedTrivia[];
  modelUsed?: string;
  executionTimeSec?: number;
  errorsLog: Array<{ model: string; error: string }>;
  error?: string;
}

export async function generateTriviaForMovie(params: {
  titolo: string;
  anno?: string | number | null;
  regista?: string | null;
  attori?: string | null;
  trama?: string | null;
  triviaEsistenti?: string[];
}): Promise<GenerateTriviaResult> {
  const ai = getGeminiClient();
  if (!ai) {
    console.warn("GEMINI_API_KEY non configurata nelle variabili d'ambiente");
    return {
      trivia: [],
      errorsLog: [],
      error:
        "Chiave GEMINI_API_KEY non trovata nelle Environment Variables di Vercel. Aggiungi GEMINI_API_KEY nella dashboard di Vercel per abilitare la generazione.",
    };
  }

  const { titolo, anno, regista, attori, trama, triviaEsistenti = [] } = params;

  const esclusioneText =
    triviaEsistenti.length > 0
      ? `\nCURIOSITÀ GIÀ REGISTRATE (NON RIPETERE QUESTE O FATTI IDENTICI):\n${triviaEsistenti
          .slice(0, 15)
          .map((e) => `- ${e.slice(0, 120)}`)
          .join("\n")}`
      : "";

  const prompt = `Sei un enciclopedico e appassionato storico del cinema, specializzato in aneddoti di backstage, retroscena di produzione, curiosità sul casting, easter egg e segreti dal set cinematografico.

DATI UFFICIALI DEL FILM:
- Titolo: "${titolo}" (${anno || "N/D"})
- Regia: ${regista || "N/D"}
- Cast: ${attori || "N/D"}
- Sinossi: ${trama || "N/D"}
${esclusioneText}

COMPITO:
Trova tra 5 e 8 curiosità, retroscena, aneddoti memorabili o segreti di produzione concreti e verificati su questo film.

Le categorie ammesse sono ESCLUSIVAMENTE:
1. "Curiosità & Retroscena"
2. "Aneddoti dal set"
3. "Casting & Scelte"
4. "Segreti di produzione"
5. "Effetti speciali & Trucco"
6. "Citazioni & Easter Egg"

REGOLE TASSATIVE:
- Restituisci ESCLUSIVAMENTE un array JSON valido, senza testo introduttivo né blocchi o commenti aggiuntivi al di fuori del JSON.
- "titolo": un titolo breve, incisivo e accattivante (4-10 parole).
- "descrizione": spiegazione dettagliata, coinvolgente e in italiano corretto (2-4 frasi appassionanti che raccontano il retroscena reale).
- "fonte": fonte indicativa o contesto (es. "Intervista al regista", "Making-of ufficiale", "Commento audio DVD", "Autobiografia dell'attore").

FORMATO OUTPUT:
[
  {
    "categoria": "Aneddoti dal set",
    "titolo": "L'improvvisazione memorabile durante la scena madre",
    "descrizione": "Durante le riprese della celebre sequenza, l'attore protagonista ha improvvisato la battuta iconica cogliendo di sorpresa l'intero cast. Il regista decise sul momento di tenere quel ciak nel montaggio finale.",
    "fonte": "Making-of ufficiale"
  }
]`;

  const errorsLog: Array<{ model: string; error: string }> = [];

  // 1. Prova prima con i modelli prioritari
  for (const model of DEFAULT_MODELS) {
    try {
      const t0 = performance.now();
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });
      const t1 = performance.now();
      const executionTimeSec = Number(((t1 - t0) / 1000).toFixed(2));

      const text = response.text?.trim() || "";
      if (!text) continue;

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const cleanJson = jsonMatch ? jsonMatch[0] : text;

      const parsed = JSON.parse(cleanJson) as GeneratedTrivia[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return {
          trivia: parsed.map((item) => ({
            categoria: (item.categoria as TriviaCategoria) || "Curiosità & Retroscena",
            titolo: item.titolo || "Curiosità dal set",
            descrizione: item.descrizione || "",
            fonte: item.fonte || "Dietro le quinte",
          })),
          modelUsed: model,
          executionTimeSec,
          errorsLog,
        };
      }
    } catch (err: any) {
      console.error(`Errore Gemini trivia con modello ${model}:`, err);
      errorsLog.push({ model, error: err?.message || String(err) });
      continue;
    }
  }

  // 2. Se tutti i modelli di default hanno fallito, interroga dinamicamente i modelli abilitati sulla chiave
  const discoveredModels = await getAvailableModels(ai);
  const remainingModels = discoveredModels.filter((m) => !DEFAULT_MODELS.includes(m));

  for (const model of remainingModels) {
    try {
      const t0 = performance.now();
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });
      const t1 = performance.now();
      const executionTimeSec = Number(((t1 - t0) / 1000).toFixed(2));

      const text = response.text?.trim() || "";
      if (!text) continue;

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const cleanJson = jsonMatch ? jsonMatch[0] : text;

      const parsed = JSON.parse(cleanJson) as GeneratedTrivia[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return {
          trivia: parsed.map((item) => ({
            categoria: (item.categoria as TriviaCategoria) || "Curiosità & Retroscena",
            titolo: item.titolo || "Curiosità dal set",
            descrizione: item.descrizione || "",
            fonte: item.fonte || "Dietro le quinte",
          })),
          modelUsed: model,
          executionTimeSec,
          errorsLog,
        };
      }
    } catch (err: any) {
      console.error(`Errore Gemini trivia con modello dinamico ${model}:`, err);
      errorsLog.push({ model, error: err?.message || String(err) });
      continue;
    }
  }

  return {
    trivia: [],
    errorsLog,
    error: errorsLog.length > 0
      ? `Errore durante la chiamata Gemini: ${errorsLog[0].error}`
      : "Nessuna curiosità trovata per questa pellicola.",
  };
}

