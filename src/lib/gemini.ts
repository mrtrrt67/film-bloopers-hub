import { GoogleGenAI } from "@google/genai";
import { BlooperCategoria, TriviaCategoria } from "./types";

const DEFAULT_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite",
  "gemini-3.7-flash",
  "gemini-3.5-flash-lite",
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

export function getDynamicTemporalAnchor(): {
  year: number;
  monthName: string;
  anchorText: string;
} {
  const now = new Date();
  const year = Math.max(2026, now.getFullYear());
  const monthNames = [
    "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
    "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"
  ];
  const monthName = monthNames[now.getMonth()];
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return {
    year,
    monthName: capitalizedMonth,
    anchorText: `CONTESTO TEMPORALE DINAMICO:
- Data corrente di riferimento: ${capitalizedMonth} ${year}.
- Tutti i film presenti a catalogo (compresi i titoli usciti fino all'anno ${year}) sono già regolarmente usciti nelle sale cinematografiche e nelle piattaforme home video/streaming da tempo.
- Per tutti questi titoli esistono già bloopers, goofs, making-of ed errori documentati su IMDb, MovieMistakes, recensioni e video analisi. Non considerare mai i film usciti fino all'anno ${year} come inediti o futuri.`
  };
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

function buildBlooperPromptText(params: {
  titolo: string;
  anno?: string | number | null;
  regista?: string | null;
  attori?: string | null;
  trama?: string | null;
  esclusioni: string[];
  requested: number;
  isSecondPass?: boolean;
}): string {
  const { titolo, anno, regista, attori, trama, esclusioni, requested, isSecondPass } = params;

  const esclusioneText =
    esclusioni.length > 0
      ? `\nERRORI GIÀ REGISTRATI NEL NOSTRO ARCHIVIO (NON RIPETERE ASSOLUTAMENTE QUESTI ERRORI O VARIANTI DEGLI STESSI):\n${esclusioni
          .slice(0, 50)
          .map((e, idx) => `${idx + 1}. ${e.slice(0, 200)}`)
          .join("\n")}`
      : "\nNessun errore attualmente registrato in archivio.";

  return `Sei un archivista e verificatore cinematografico specializzato in bloopers, goofs ed errori di montaggio reali e documentati.

${getDynamicTemporalAnchor().anchorText}

DATI UFFICIALI DEL FILM:
- Titolo registrato: "${titolo}" (${anno || "N/D"})
- Regia: ${regista || "N/D"}
- Cast: ${attori || "N/D"}
- Sinossi: ${trama || "N/D"}
- RICONOSCIMENTO TITOLI INTERNAZIONALI: Se il film è straniero o noto internazionalmente con titolo differente da quello italiano (es. Psycho per Psyco, The Birds per Gli Uccelli, Despicable Me per Cattivissimo me, Home Alone per Mamma ho perso l'aereo, Gladiator per Il gladiatore, The Perfect Storm per La tempesta perfetta, ecc.), fai riferimento sia al titolo italiano che a quello originale/inglese per attingere all'intero catalogo globale di errori (IMDb Goofs, MovieMistakes, Bloopers.it per film italiani, commenti DVD, making-of).
${esclusioneText}

COMPITO E SCANSIONE ESAUSTIVA A 360 GRADI${isSecondPass ? " (SECONDA PASSATA APPROFONDITA)" : ""}:
Esegui una scansione di bloopers, goofs, errori di continuità e sviste tecniche riscontrabili nella pellicola o documentate da fonti cinematografiche (IMDb Goofs, MovieMistakes, recensioni tecniche, analisi visive, making-of e commenti di regia):
1. Errori di continuità di scena (oggetti, armi, bicchieri, vestiti, ferite, pettinature o tagli di luce che cambiano tra inquadrature consecutive).
2. Anacronismi ed errori scientifici o fattuali visibili (discrepanze tecnologiche, formule errate, comportamenti fisici anomali a schermo).
3. Attrezzature o troupe visibili (cavi di sicurezza o stunt, microfoni boom, riflessi di operatori o cineprese su caschi, vetri o carrozzerie).
4. Errori di montaggio, audio e sincronizzazione labiale.

REGOLE DI ACCURATEZZA:
1. Riporta errori e incongruenze oggettive e riscontrabili a schermo.
2. NESSUNA DUPLICAZIONE: Non ripetere né parafrasare bloopers già registrati sopra.
3. MINUTAGGIO: Se non noto al secondo esatto, usa il minutaggio approssimativo della scena oppure "00:00:00".
4. FATTI CONCRETI: Descrivi con precisione cosa si vede a schermo e qual è la discrepanza oggettiva.
5. RIGOROSA AUTENTICITÀ & GESTIONE ARCHIVIO:
   a) SE L'ARCHIVIO CONTIENE GIÀ BLOOPERS (esclusioni > 0): Se per questo film non esistono ulteriori sviste, goofs o errori reali documentati oltre a quelli già registrati, restituisci TASSATIVAMENTE un array vuoto []. DIVIETO ASSOLUTO DI INVENTARE O FORZARE BLOOPERS FIITTIZI O PRESUNTI per soddisfare la richiesta.
   b) SE IL FILM HA 0 BLOOPERS IN ARCHIVIO: Solo in questo caso di prima catalogazione, esamina accuratamente le sequenze chiave, i tagli di montaggio, i riflessi di produzione e le scene della pellicola per identificare le sviste tecniche e di continuità oggettive documentate.
6. Restituisci fino a un MASSIMO di ${requested} nuovi bloopers in formato JSON.

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
}

async function executeSingleCallBloopers(
  ai: GoogleGenAI,
  prompt: string,
  errorsLog: Array<{ model: string; error: string }>
): Promise<{ bloopers: GeneratedBlooper[]; modelUsed?: string; executionTimeSec?: number }> {
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

      const parsed = cleanAndParseJson<GeneratedBlooper[]>(text);
      if (Array.isArray(parsed)) {
        return {
          bloopers: parsed.map((item) => ({
            minuto: item.minuto || "00:00:00",
            categoria: (item.categoria as BlooperCategoria) || "Errori di scena / Posizione",
            descrizione: item.descrizione || "",
          })),
          modelUsed: model,
          executionTimeSec,
        };
      }
    } catch (err: any) {
      errorsLog.push({ model, error: err?.message || String(err) });
      continue;
    }
  }

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

      const parsed = cleanAndParseJson<GeneratedBlooper[]>(text);
      if (Array.isArray(parsed)) {
        return {
          bloopers: parsed.map((item) => ({
            minuto: item.minuto || "00:00:00",
            categoria: (item.categoria as BlooperCategoria) || "Errori di scena / Posizione",
            descrizione: item.descrizione || "",
          })),
          modelUsed: model,
          executionTimeSec,
        };
      }
    } catch (err: any) {
      errorsLog.push({ model, error: err?.message || String(err) });
      continue;
    }
  }

  return { bloopers: [] };
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
  allowDeepScan?: boolean;
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

  const requested = typeof params.maxNew === "number" && params.maxNew > 0
    ? Math.min(params.maxNew, 50)
    : (typeof params.countNeeded === "number" && params.countNeeded > 0 ? Math.min(params.countNeeded, 50) : 5);

  const errorsLog: Array<{ model: string; error: string }> = [];

  // PASSATA 1: Scansione a 360 gradi
  const promptPass1 = buildBlooperPromptText({
    titolo,
    anno,
    regista,
    attori,
    trama,
    esclusioni: erroriEsistenti,
    requested,
    isSecondPass: false,
  });

  const pass1 = await executeSingleCallBloopers(ai, promptPass1, errorsLog);
  let accumulatedBloopers = pass1.bloopers || [];
  let modelUsed = pass1.modelUsed;
  let totalExecTime = pass1.executionTimeSec || 0;

  // PASSATA 2 AUTOMATICA (Auto Deep-Scan):
  // Se la prima passata ha trovato pochi bloopers (< 4) su un film che ne richiedeva almeno 5,
  // effettua subito la seconda passata escludendo quanto appena trovato, così l'utente e il batch
  // ottengono tutti i bloopers autentici già al primo click/singolo passaggio!
  if (
    params.allowDeepScan !== false &&
    accumulatedBloopers.length > 0 &&
    accumulatedBloopers.length < 4 &&
    requested >= 5
  ) {
    try {
      const combinedExclusions = [
        ...erroriEsistenti,
        ...accumulatedBloopers.map((b) => b.descrizione),
      ];

      const promptPass2 = buildBlooperPromptText({
        titolo,
        anno,
        regista,
        attori,
        trama,
        esclusioni: combinedExclusions,
        requested: Math.min(requested, 8),
        isSecondPass: true,
      });

      const pass2 = await executeSingleCallBloopers(ai, promptPass2, errorsLog);
      if (pass2.bloopers && pass2.bloopers.length > 0) {
        for (const nb of pass2.bloopers) {
          const isDupe = accumulatedBloopers.some(
            (ex) => ex.descrizione.toLowerCase().slice(0, 50) === nb.descrizione.toLowerCase().slice(0, 50)
          );
          if (!isDupe && nb.descrizione.trim().length > 10) {
            accumulatedBloopers.push(nb);
          }
        }
        if (pass2.executionTimeSec) totalExecTime += pass2.executionTimeSec;
      }
    } catch (e) {
      console.warn("Passata 2 approfondita bloopers terminata con eccezione non bloccante:", e);
    }
  }

  if (accumulatedBloopers.length > 0) {
    return {
      bloopers: accumulatedBloopers,
      modelUsed,
      executionTimeSec: Number(totalExecTime.toFixed(2)),
      errorsLog,
    };
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

function buildTriviaPromptText(params: {
  titolo: string;
  anno?: string | number | null;
  regista?: string | null;
  attori?: string | null;
  trama?: string | null;
  esclusioni: string[];
  requested: number;
  isSecondPass?: boolean;
}): string {
  const { titolo, anno, regista, attori, trama, esclusioni, requested, isSecondPass } = params;

  const esclusioneText =
    esclusioni.length > 0
      ? `\nCURIOSITÀ GIÀ REGISTRATE NEL NOSTRO ARCHIVIO (NON RIPETERE ASSOLUTAMENTE QUESTE O FATTI IDENTICI):\n${esclusioni
          .slice(0, 50)
          .map((e, idx) => `${idx + 1}. ${e.slice(0, 180)}`)
          .join("\n")}`
      : "\nNessuna curiosità attualmente registrata in archivio.";

  return `Sei un rigoroso storico del cinema e documentarista specializzato in retroscena di produzione, aneddoti di casting e segreti dal set reali, comprovati e verificabili.

${getDynamicTemporalAnchor().anchorText}

DATI UFFICIALI DEL FILM:
- Titolo registrato: "${titolo}" (${anno || "N/D"})
- Regia: ${regista || "N/D"}
- Cast: ${attori || "N/D"}
- Sinossi: ${trama || "N/D"}
- NOTA TITOLI INTERNAZIONALI: Considera sia il titolo italiano che il titolo originale/internazionale (es. Gladiator per Il gladiatore, Pulp Fiction, The Shining, The Perfect Storm, ecc.) per attingere all'intero archivio globale di aneddoti, retroscena di produzione, casting e curiosità documentate.
${esclusioneText}

COMPITO E SCANSIONE ESAUSTIVA A 360 GRADI${isSecondPass ? " (SECONDA PASSATA APPROFONDITA)" : ""}:
Esegui una scansione approfondita di TUTTE le curiosità, aneddoti e retroscena storici REALI documentati per questo film.
NON fermarti a 1 o 2 curiosità generiche: esplora sistematicamente i diversi ambiti:
1. Casting & Scelte (attori provinati o scartati, rinunce celebri, cambi di sceneggiatura).
2. Retroscena dal set e aneddoti di lavorazione reali (difficoltà tecniche, incidenti non gravi, improvvisazioni storiche).
3. Segreti di produzione ed effetti speciali (tecniche artigianali, modelli in scala, trucchi di regia).
4. Citazioni, omaggi ed Easter Egg documentati.

REGOLE ANTI-ALLUCINAZIONE ASSOLUTE:
1. DIVIETO ASSOLUTO DI INVENTARE O GENERALIZZARE: Non inventare MAI aneddoti generici o verosimili (vietate frasi generiche come "il cast ha legato molto sul set", "le riprese sono state impegnative", "il regista ha voluto dare autenticità"). Ogni curiosità DEVE contenere fatti specifici, nomi propri, cifre concrete o eventi realmente accaduti e verificabili (es. interviste ufficiali, note di produzione, Making-of, commenti audio DVD).
2. RIGOROSA AUTENTICITÀ & GESTIONE ARCHIVIO:
   a) SE L'ARCHIVIO CONTIENE GIÀ CURIOSITÀ (esclusioni > 0): Se per questo film sono già stati registrati tutti gli aneddoti e retroscena storici noti e non esistono ulteriori fatti comprovati, restituisci TASSATIVAMENTE un array vuoto []. DIVIETO ASSOLUTO DI GENERALIZZARE O INVENTARE fatti non documentati.
   b) SE IL FILM HA 0 CURIOSITÀ IN ARCHIVIO: Solo in questo caso di prima catalogazione, riporta i fatti fondanti e comprovati della produzione (genesi del soggetto o adattamento, trattative di casting reali, location ufficiali, macchine da presa e tecnologie speciali impiegate).
3. NESSUNA DUPLICAZIONE: Non ripetere né parafrasare curiosità già elencate sopra.
4. DESCRIZIONI COMPATTE E COMPLETE: 2-3 frasi chiare ed esaustive in italiano corretto. Non lasciare MAI campi vuoti né testi fittizi.
5. Restituisci fino a un MASSIMO di ${requested} nuove curiosità reali documentate.

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
}

async function executeSingleCallTrivia(
  ai: GoogleGenAI,
  prompt: string,
  errorsLog: Array<{ model: string; error: string }>
): Promise<{ trivia: GeneratedTrivia[]; modelUsed?: string; executionTimeSec?: number }> {
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

      const parsed = cleanAndParseJson<GeneratedTrivia[]>(text);
      if (Array.isArray(parsed)) {
        return {
          trivia: parsed.map((item) => ({
            categoria: (item.categoria as TriviaCategoria) || "Curiosità & Retroscena",
            titolo: item.titolo || "Curiosità dal set",
            descrizione: item.descrizione || "",
            fonte: item.fonte || "Dietro le quinte",
          })),
          modelUsed: model,
          executionTimeSec,
        };
      }
    } catch (err: any) {
      errorsLog.push({ model, error: err?.message || String(err) });
      continue;
    }
  }

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

      const parsed = cleanAndParseJson<GeneratedTrivia[]>(text);
      if (Array.isArray(parsed)) {
        return {
          trivia: parsed.map((item) => ({
            categoria: (item.categoria as TriviaCategoria) || "Curiosità & Retroscena",
            titolo: item.titolo || "Curiosità dal set",
            descrizione: item.descrizione || "",
            fonte: item.fonte || "Dietro le quinte",
          })),
          modelUsed: model,
          executionTimeSec,
        };
      }
    } catch (err: any) {
      errorsLog.push({ model, error: err?.message || String(err) });
      continue;
    }
  }

  return { trivia: [] };
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
  allowDeepScan?: boolean;
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

  const requested = typeof maxNew === "number" && maxNew > 0
    ? Math.min(maxNew, 30)
    : (typeof countNeeded === "number" && countNeeded > 0 ? Math.min(countNeeded, 30) : 5);

  const errorsLog: Array<{ model: string; error: string }> = [];

  // PASSATA 1: Scansione a 360 gradi
  const promptPass1 = buildTriviaPromptText({
    titolo,
    anno,
    regista,
    attori,
    trama,
    esclusioni: triviaEsistenti,
    requested,
    isSecondPass: false,
  });

  const pass1 = await executeSingleCallTrivia(ai, promptPass1, errorsLog);
  let accumulatedTrivia = pass1.trivia || [];
  let modelUsed = pass1.modelUsed;
  let totalExecTime = pass1.executionTimeSec || 0;

  // PASSATA 2 AUTOMATICA (Auto Deep-Scan):
  // Se la prima passata ha trovato poche curiosità (< 4) su un film che ne richiedeva almeno 5,
  // effettua subito la seconda passata escludendo quanto appena trovato!
  if (
    params.allowDeepScan !== false &&
    accumulatedTrivia.length > 0 &&
    accumulatedTrivia.length < 4 &&
    requested >= 5
  ) {
    try {
      const combinedExclusions = [
        ...triviaEsistenti,
        ...accumulatedTrivia.map((t) => `${t.titolo}: ${t.descrizione}`),
      ];

      const promptPass2 = buildTriviaPromptText({
        titolo,
        anno,
        regista,
        attori,
        trama,
        esclusioni: combinedExclusions,
        requested: Math.min(requested, 8),
        isSecondPass: true,
      });

      const pass2 = await executeSingleCallTrivia(ai, promptPass2, errorsLog);
      if (pass2.trivia && pass2.trivia.length > 0) {
        for (const nt of pass2.trivia) {
          const isDupe = accumulatedTrivia.some(
            (ex) => ex.titolo.toLowerCase().slice(0, 30) === nt.titolo.toLowerCase().slice(0, 30)
          );
          if (!isDupe && nt.titolo.trim().length > 3 && nt.descrizione.trim().length > 10) {
            accumulatedTrivia.push(nt);
          }
        }
        if (pass2.executionTimeSec) totalExecTime += pass2.executionTimeSec;
      }
    } catch (e) {
      console.warn("Passata 2 approfondita curiosità terminata con eccezione non bloccante:", e);
    }
  }

  if (accumulatedTrivia.length > 0) {
    return {
      trivia: accumulatedTrivia,
      modelUsed,
      executionTimeSec: Number(totalExecTime.toFixed(2)),
      errorsLog,
    };
  }

  return {
    trivia: [],
    errorsLog,
    error: errorsLog.length > 0
      ? `Errore durante la chiamata Gemini: ${errorsLog[0].error}`
      : "Nessuna curiosità trovata per questa pellicola.",
  };
}
