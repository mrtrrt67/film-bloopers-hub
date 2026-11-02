import { GoogleGenAI } from "@google/genai";
import { BlooperCategoria, TriviaCategoria } from "./types";

const DEFAULT_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.6-flash",
  "gemini-3-flash-preview",
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-3.7-flash",
  "gemini-flash-latest",
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

function cleanAndParseJson<T>(raw: string): T | null {
  if (!raw) return null;
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  const text = jsonMatch ? jsonMatch[0] : raw;
  try {
    return JSON.parse(text) as T;
  } catch {
    let sanitized = text.replace(/,\s*([}\]])/g, "$1");
    if (!sanitized.endsWith("]") && sanitized.startsWith("[")) {
      const lastObj = sanitized.lastIndexOf("}");
      if (lastObj !== -1) {
        sanitized = sanitized.slice(0, lastObj + 1) + "]";
      }
    }
    try {
      return JSON.parse(sanitized) as T;
    } catch {
      return null;
    }
  }
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
  countNeeded?: number;
  maxNew?: number;
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
      ? `\nERRORI GIÀ REGISTRATI NEL NOSTRO ARCHIVIO (NON RIPETERE ASSOLUTAMENTE QUESTI ERRORI O VARIANTI DEGLI STESSI):\n${erroriEsistenti
          .slice(0, 40)
          .map((e, idx) => `${idx + 1}. ${e.slice(0, 200)}`)
          .join("\n")}`
      : "\nNessun errore attualmente registrato in archivio.";

  const requested = typeof params.maxNew === "number" && params.maxNew > 0
    ? Math.min(params.maxNew, 50)
    : (typeof params.countNeeded === "number" && params.countNeeded > 0 ? Math.min(params.countNeeded, 50) : 5);

  const prompt = `Sei un archivista e verificatore cinematografico specializzato in bloopers, goofs ed errori di montaggio reali e documentati.

DATI UFFICIALI DEL FILM:
- Titolo registrato: "${titolo}" (${anno || "N/D"})
- Regia: ${regista || "N/D"}
- Cast: ${attori || "N/D"}
- Sinossi: ${trama || "N/D"}
- RICONOSCIMENTO TITOLI INTERNAZIONALI: Se il film è straniero o noto internazionalmente con titolo differente da quello italiano (es. Psycho per Psyco, The Birds per Gli Uccelli, Despicable Me per Cattivissimo me, Home Alone per Mamma ho perso l'aereo, Gladiator per Il gladiatore, ecc.), fai riferimento sia al titolo italiano che a quello originale/inglese per attingere all'intero catalogo globale di errori (IMDb Goofs, MovieMistakes, Bloopers.it per film italiani, commenti DVD, making-of).
${esclusioneText}

COMPITO:
Analizza attentamente gli errori già registrati per questa pellicola.
Identifica e restituisci tutti gli ALTRI bloopers, goofs, errori di continuità visiva (bicchieri/oggetti che si spostano, ferite o vestiti incoerenti tra tagli), microfoni o operatori visibili, anacronismi ed errori storici REALI, NOTI e DOCUMENTATI che MANCANO ancora nell'archivio, fino a un MASSIMO di ${requested} nuovi bloopers.

REGOLE ANTI-ALLUCINAZIONE ASSOLUTE:
1. DIVIETO ASSOLUTO DI INVENTARE: Non inventare mai errori. Riporta solo sviste di continuità, errori tecnici o fattuali realmente documentati. Se tutti gli errori noti della pellicola sono già presenti nell'archivio, oppure se non ne esistono altri documentati, restituisci ESCLUSIVAMENTE un array vuoto [].
2. NESSUNA DUPLICAZIONE: Non ripetere, riassumere o riformulare gli errori già registrati nell'elenco sopra.
3. NIENTE MINUTAGGI INVENTATI: Se non conosci con certezza il minuto esatto al secondo, usa "00:00:00" oppure approssima solo all'inizio della scena specifica.
4. FATTI CONCRETI: Descrivi solo l'errore oggettivo documentato riscontrabile nella pellicola.

Le categorie ammesse sono ESCLUSIVAMENTE:
1. "Errori di scena / Posizione"
2. "Troupe o microfoni visibili"
3. "Anacronismi"
4. "Errori storici o fattuali"

FORMATO OUTPUT:
Restituisci ESCLUSIVAMENTE un array JSON valido, senza testo introduttivo né commenti markdown:
[
  {
    "minuto": "00:00:00",
    "categoria": "Errori di scena / Posizione",
    "descrizione": "Descrizione accurata dell'errore oggettivo riscontrabile a schermo."
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

      const parsed = cleanAndParseJson<GeneratedBlooper[]>(text);
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
          temperature: 0.2,
        },
      });
      const t1 = performance.now();
      const executionTimeSec = Number(((t1 - t0) / 1000).toFixed(2));

      const text = response.text?.trim() || "";
      if (!text) continue;

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const cleanJson = jsonMatch ? jsonMatch[0] : text;

      const parsed = cleanAndParseJson<GeneratedBlooper[]>(text);
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
  countNeeded?: number;
  maxNew?: number;
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

  const { titolo, anno, regista, attori, trama, triviaEsistenti = [], countNeeded, maxNew } = params;

  const esclusioneText =
    triviaEsistenti.length > 0
      ? `\nCURIOSITÀ GIÀ REGISTRATE NEL NOSTRO ARCHIVIO (NON RIPETERE ASSOLUTAMENTE QUESTE O FATTI IDENTICI):\n${triviaEsistenti
          .slice(0, 40)
          .map((e, idx) => `${idx + 1}. ${e.slice(0, 180)}`)
          .join("\n")}`
      : "\nNessuna curiosità attualmente registrata in archivio.";

  const requested = typeof maxNew === "number" && maxNew > 0
    ? Math.min(maxNew, 30)
    : (typeof countNeeded === "number" && countNeeded > 0 ? Math.min(countNeeded, 30) : 5);

  const prompt = `Sei un rigoroso storico del cinema e documentarista specializzato in retroscena di produzione, aneddoti di casting e segreti dal set reali, comprovati e verificabili.

DATI UFFICIALI DEL FILM:
- Titolo registrato: "${titolo}" (${anno || "N/D"})
- Regia: ${regista || "N/D"}
- Cast: ${attori || "N/D"}
- Sinossi: ${trama || "N/D"}
- NOTA TITOLI INTERNAZIONALI: Considera sia il titolo italiano che il titolo originale/internazionale (es. Gladiator per Il gladiatore, Pulp Fiction, The Shining, ecc.) per attingere all'intero archivio globale di aneddoti, retroscena di produzione, casting e curiosità documentate.
${esclusioneText}

COMPITO:
Analizza attentamente le curiosità già registrate per questa pellicola.
Identifica fino a un MASSIMO di ${requested} curiosità, retroscena o aneddoti storici REALI, NOTI e DOCUMENTATI che MANCANO ancora nell'archivio.

REGOLE ANTI-ALLUCINAZIONE ASSOLUTE:
1. DIVIETO ASSOLUTO DI INVENTARE O GENERALIZZARE: Non inventare MAI aneddoti generici o verosimili (vietate frasi generiche come "il cast ha legato molto sul set", "le riprese sono state impegnative", "il regista ha voluto dare autenticità"). Ogni curiosità DEVE contenere fatti specifici, nomi propri, cifre concrete o eventi realmente accaduti e verificabili (es. interviste ufficiali, note di produzione, Making-of, commenti audio DVD).
2. SE NON CI SONO ALTRI FATTI DOCUMENTATI, RESTITUISCI []: Non forzare mai il numero. Se per questo film sono noti solo 1 o 2 fatti reali, restituisci solo quelli. Se non ce ne sono di documentati, restituisci tassativamente un array vuoto [].
3. NESSUNA DUPLICAZIONE: Non ripetere né parafrasare curiosità già elencate sopra.
4. DESCRIZIONI COMPATTE E COMPLETE: 2-3 frasi chiare ed esaustive in italiano corretto. Non lasciare MAI campi vuoti né testi fittizi.

Le categorie ammesse sono ESCLUSIVAMENTE:
1. "Curiosità & Retroscena"
2. "Aneddoti dal set"
3. "Casting & Scelte"
4. "Segreti di produzione"
5. "Effetti speciali & Trucco"
6. "Citazioni & Easter Egg"

FORMATO OUTPUT:
Restituisci ESCLUSIVAMENTE un array JSON valido, senza testo introduttivo né commenti:
[
  {
    "categoria": "Casting & Scelte",
    "titolo": "Titolo specifico e incisivo (4-8 parole)",
    "descrizione": "Descrizione fattuale dettagliata con nomi propri, numeri o circostanze reali documentate.",
    "fonte": "Fonte reale indicativa (es. Making-of ufficiale, Intervista al regista, Commento audio DVD)"
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

      const parsed = cleanAndParseJson<GeneratedTrivia[]>(text);
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

      const parsed = cleanAndParseJson<GeneratedTrivia[]>(text);
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

