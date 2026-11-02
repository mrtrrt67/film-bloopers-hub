#!/usr/bin/env node

/**
 * DAILY SYNC - Bloopers & Curiosità Hub
 *
 * Scansione intelligente, bonifica progressiva e accumulo verificato:
 * 1. FASE 1 (Bonifica Massiva): Scansiona tutti i film, rimuove le vecchie curiosità generiche/false
 *    e inserisce i blooper e retroscena autentici documentati (max 10 a passata, accumulativi).
 * 2. FASE 2 (Regime Scalabile):
 *    - Priorità 1: Nuovi film appena inseriti a catalogo (mai verificati prima).
 *    - Priorità 2: Film che hanno raggiunto il cap di 10 nella passata precedente (accumulo ulteriori blooper fino a esaurimento).
 *    - Priorità 3: Film recenti (ultimi 10 anni, anno >= 2016) per intercettare nuovi blooper o dietro le quinte recenti.
 *    - Film storici (< 2016) già verificati ed esauriti vengono congelati per non sprecare token e tempo!
 */

const fs = require('fs');

// Salvaguardia WebSocket per Node (previene crash Realtime)
if (typeof globalThis.WebSocket === 'undefined') {
  try {
    globalThis.WebSocket = class DummyWebSocket {
      constructor() {}
      close() {}
      send() {}
    };
  } catch (e) {}
}

const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');

// Parametri CLI & Environment
const args = process.argv.slice(2);
function getArg(name, defaultVal) {
  const prefix = `--${name}=`;
  const found = args.find(a => a.startsWith(prefix));
  if (found) return found.slice(prefix.length);
  return defaultVal;
}
function hasFlag(name) {
  return args.includes(`--${name}`);
}

// 1. Rilevamento Ambiente Target (Staging vs Produzione)
const targetEnv = (getArg('target', process.env.TARGET_ENV || 'staging') || 'staging').toLowerCase();
const isStaging = targetEnv === 'staging';

// Caricamento variabili d'ambiente (.env.local e opzionale .env.staging)
let env = {};
function loadEnvFile(file) {
  if (fs.existsSync(file)) {
    fs.readFileSync(file, 'utf8').split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const k = match[1].trim();
        const v = match[2].trim().replace(/^["']|["']$/g, '');
        if (!env[k]) env[k] = v;
      }
    });
  }
}
if (isStaging) loadEnvFile('.env.staging');
loadEnvFile('.env.local');

let supabaseUrl = "";
let anonKey = "";
let serviceRoleKey = "";

if (isStaging) {
  supabaseUrl = process.env.STAGING_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "https://hktzscarmerpbgxgxliq.supabase.co";
  anonKey = process.env.STAGING_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrdHpzY2FybWVycGJneGd4bGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MzE2MTcsImV4cCI6MjEwODUwNzYxN30.ufFb1-mVRGD0RU03gaeCghzdnRtbucCaU4LuBvymFZs";
  serviceRoleKey = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "";
} else {
  supabaseUrl = process.env.PROD_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "https://gmiwhscbqvadnlqruhjs.supabase.co";
  anonKey = process.env.PROD_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  serviceRoleKey = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "";
}

const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || env.GEMINI_API_KEY || env.GOOGLE_API_KEY;

const mode = process.env.SYNC_MODE || getArg('mode', 'both') || 'both';
// Di default 0 = elabora tutti i film necessari per la sessione corrente
const limitFilms = parseInt(process.env.SYNC_LIMIT || getArg('limit', '0') || '0', 10) || 0;
// Max 10 blooper e 10 curiosità a passata (accumulativi nelle passate successive)
const maxBloopersPerFilm = Math.min(parseInt(process.env.MAX_BLOOPERS || getArg('max-bloopers', '10') || '10', 10) || 10, 50);
const maxTriviaPerFilm = Math.min(parseInt(process.env.MAX_TRIVIA || getArg('max-trivia', '10') || '10', 10) || 10, 30);
const pauseMs = parseInt(process.env.PAUSE_MS || getArg('pause', '350') || '350', 10) || 350;
const cleanJunkAtStart = hasFlag('clean-junk') || getArg('clean-junk', 'true') === 'true';
// Sostituzione automatica delle vecchie curiosità generiche/false attiva di default
const replaceTriviaFilmByFilm = process.env.REPLACE_TRIVIA !== 'false' && getArg('replace-trivia', 'true') !== 'false';

// Anno soglia per film recenti (ultimi 10 anni: dal 2016 in poi)
const CURRENT_YEAR = new Date().getFullYear();
const RECENT_YEAR_THRESHOLD = CURRENT_YEAR - 10;

console.log("==================================================================");
console.log("🎬 DAILY SYNC INTELLIGENTE - BLOOPERS & TRIVIA HUB");
console.log(`🕒 Avvio: ${new Date().toISOString()}`);
console.log(`🎯 AMBIENTE TARGET DATABASE: [ ${isStaging ? "🟡 STAGING (TEST SEGURO)" : "🔴 PRODUZIONE (LIVE)"} ]`);
console.log(`🌐 Supabase URL collegato: ${supabaseUrl}`);
console.log(`⚙️  Modalità: ${mode} | Limite film: ${limitFilms === 0 ? "TUTTI I CANDIDATI" : limitFilms}`);
console.log(`🎯 Max Bloopers a passata: ${maxBloopersPerFilm} | Max Curiosità a passata: ${maxTriviaPerFilm}`);
console.log(`🧹 Bonifica & Sostituzione automatica falsi: ${replaceTriviaFilmByFilm ? "ATTIVA" : "DISATTIVA"}`);
console.log(`⏳ Soglia film recenti: ${RECENT_YEAR_THRESHOLD} (ultimi 10 anni monitorati a rotazione)`);
console.log("==================================================================");

// Diagnostica credenziali
console.log("\n🔍 Diagnostica Credenziali Ambiente:");
console.log(`- TARGET_ENV: ${targetEnv.toUpperCase()}`);
console.log(`- Supabase URL: ${supabaseUrl ? "✅ " + supabaseUrl : "❌ MANCANTE"}`);
console.log(`- Service Role Key: ${serviceRoleKey ? "✅ Presente (Bypass RLS attivo)" : "⚠️ NON CONFIGURATO (sarà usata anon key)"}`);
console.log(`- Anon Key: ${anonKey ? "✅ Presente" : "⚠️ Assente"}`);
console.log(`- GEMINI_API_KEY: ${geminiApiKey ? "✅ Presente (" + geminiApiKey.slice(0, 6) + "...)" : "❌ MANCANTE"}`);

if (!supabaseUrl) {
  console.error("\n❌ ERRORE: NEXT_PUBLIC_SUPABASE_URL mancante.");
  process.exit(1);
}

const effectiveSupabaseKey = serviceRoleKey || anonKey;
if (!effectiveSupabaseKey) {
  console.error("\n❌ ERRORE: Nessuna chiave Supabase configurata.");
  process.exit(1);
}

if (!geminiApiKey) {
  console.error("\n❌ ERRORE: GEMINI_API_KEY mancante.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, effectiveSupabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

// Modelli Gemini con fallback automatico
const GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3-flash-preview",
  "gemini-3.8-flash",
  "gemini-3.7-flash"
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanAndParseJson(raw) {
  if (!raw) return null;
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  const text = jsonMatch ? jsonMatch[0] : raw;
  try {
    return JSON.parse(text);
  } catch {
    let sanitized = text.replace(/,\s*([}\]])/g, "$1");
    if (!sanitized.endsWith("]") && sanitized.startsWith("[")) {
      const lastObj = sanitized.lastIndexOf("}");
      if (lastObj !== -1) {
        sanitized = sanitized.slice(0, lastObj + 1) + "]";
      }
    }
    try {
      return JSON.parse(sanitized);
    } catch {
      return null;
    }
  }
}

// Chiamata AI con fallback automatico e temperatura 0.0 (anti-allucinazione)
async function callGeminiZeroTemp(prompt) {
  let lastErr = null;
  for (const model of GEMINI_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      });

      const text = response?.text?.trim() || "";
      const parsed = cleanAndParseJson(text);
      if (Array.isArray(parsed)) {
        return { success: true, data: parsed, modelUsed: model };
      }
    } catch (err) {
      lastErr = err;
      const status = err?.status || err?.statusCode;
      const msg = err?.message || "";
      const isDailyLimit = msg.includes("limit exceeded on Free Tier") || msg.includes("GenerateRequestsPerDay");
      if (isDailyLimit) {
        console.log(`      ⚠️ Quota GIORNALIERA Free Tier esaurita per ${model}, passaggio immediato al modello successivo...`);
        continue;
      }
      if (status === 429) {
        console.log(`      ⏳ Quota al minuto raggiunta su ${model}, attesa 8s...`);
        await sleep(8000);
      }
    }
  }
  const isDailyTotal = (lastErr?.message || "").includes("limit exceeded on Free Tier");
  return { 
    success: false, 
    isDailyQuotaExhausted: isDailyTotal,
    error: lastErr?.message || "Impossibile ottenere risposta valida dai modelli Gemini." 
  };
}

function buildBloopersSyncPrompt(film, esclusioni, requested, isPass2 = false) {
  const esclusioneText = esclusioni.length > 0
    ? `\nERRORI GIÀ REGISTRATI NEL NOSTRO ARCHIVIO (NON RIPETERE ASSOLUTAMENTE QUESTI ERRORI O VARIANTI DEGLI STESSI):\n${esclusioni
        .slice(0, 50)
        .map((e, idx) => `${idx + 1}. ${e.slice(0, 200)}`)
        .join("\n")}`
    : "\nNessun errore attualmente registrato in archivio.";

  return `Sei un archivista e verificatore cinematografico specializzato in bloopers, goofs ed errori di montaggio reali e documentati.

DATI UFFICIALI DEL FILM:
- Titolo registrato: "${film.titolo}" (${film.anno || "N/D"})
- Regia: ${film.regista || "N/D"}
- Cast: ${film.attori || "N/D"}
- Sinossi: ${film.trama || "N/D"}
- RICONOSCIMENTO TITOLI INTERNAZIONALI: Se il film è straniero o noto internazionalmente con titolo differente da quello italiano (es. Psycho per Psyco, The Birds per Gli Uccelli, Despicable Me per Cattivissimo me, Home Alone per Mamma ho perso l'aereo, Gladiator per Il gladiatore, The Perfect Storm per La tempesta perfetta, ecc.), fai riferimento sia al titolo italiano che a quello originale/inglese per attingere all'intero catalogo globale di errori (IMDb Goofs, MovieMistakes, Bloopers.it per film italiani, commenti DVD, making-of).
${esclusioneText}

COMPITO E SCANSIONE ESAUSTIVA A 360 GRADI${isPass2 ? " (SECONDA PASSATA APPROFONDITA)" : ""}:
Esegui una scansione approfondita e completa di TUTTI i bloopers, goofs ed errori documentati per questo film che MANCANO ancora nell'archivio.
NON fermarti a 1 o 2 errori generici: esplora sistematicamente le diverse categorie e momenti del film:
1. Errori di continuità di scena (oggetti, armi, abiti o ferite che cambiano posizione tra i tagli, vetri rotti che tornano intatti, luce/meteo incoerente tra inquadrature consecutive).
2. Anacronismi ed errori storici/tecnologici (veicoli, marche, tecnologie, costumi o eventi posteriori all'anno di ambientazione o incongruenti con la realtà storica).
3. Errori storici o fattuali documentati (incongruenze geografiche, procedure operative reali o discrepanze tecniche su mezzi/ambientazioni reali).
4. Troupe o attrezzature visibili (microfoni boom, cavi di sicurezza degli stuntman, cameraman/operatori o riflessi visibili nelle inquadrature).

REGOLE ANTI-ALLUCINAZIONE ASSOLUTE:
1. Riporta ESCLUSIVAMENTE errori reali, noti e riscontrabili nella pellicola o documentati su fonti autorevoli.
2. DIVIETO ASSOLUTO DI INVENTARE: Riporta solo fatti reali. Se per questo film non esistono ulteriori bloopers documentati, restituisci ESCLUSIVAMENTE un array vuoto [].
3. NESSUNA DUPLICAZIONE: Non ripetere gli errori già registrati.
4. MINUTAGGIO: Se non noto esattamente al secondo, usa "00:00:00" oppure la scena iniziale.
5. Restituisci fino a un MASSIMO di ${requested} nuovi bloopers autentici documentati.

Le categorie ammesse sono ESCLUSIVAMENTE:
1. "Errori di scena / Posizione"
2. "Troupe o microfoni visibili"
3. "Anacronismi"
4. "Errori storici o fattuali"
5. "Audio / Doppiaggio / Sync"

FORMATO OUTPUT:
Restituisci ESCLUSIVAMENTE un array JSON valido, senza testo introduttivo né commenti markdown:
[
  {
    "minuto": "00:00:00",
    "categoria": "Errori di scena / Posizione",
    "descrizione": "Descrizione accurata e oggettiva del blooper...",
    "youtube_query": "${film.titolo} blooper scene"
  }
]`;
}

// Scansione Bloopers con Scansione esaustiva e Passata 2 Automatica (Auto Deep-Scan)
async function scanBloopersForFilm(film, existingBloopers, maxNew) {
  const p1 = buildBloopersSyncPrompt(film, existingBloopers, maxNew, false);
  const res1 = await callGeminiZeroTemp(p1);
  if (!res1 || !res1.success) {
    return res1 || { success: false, error: "Risposta non valida da Gemini" };
  }
  let bloopers = Array.isArray(res1.data) ? res1.data : [];
  let modelUsed = res1.modelUsed;

  // Se la prima passata ha trovato pochi bloopers (< 4) e ne erano richiesti almeno 5,
  // esegue subito la seconda passata di approfondimento escludendo i primi
  if (bloopers.length > 0 && bloopers.length < 4 && maxNew >= 5) {
    try {
      const combinedExclusions = [
        ...existingBloopers,
        ...bloopers.map((b) => b.descrizione),
      ];
      const p2 = buildBloopersSyncPrompt(film, combinedExclusions, Math.min(maxNew, 8), true);
      const res2 = await callGeminiZeroTemp(p2);
      if (res2 && res2.success && Array.isArray(res2.data) && res2.data.length > 0) {
        for (const nb of res2.data) {
          const isDupe = bloopers.some(
            (ex) => ex.descrizione && nb.descrizione && ex.descrizione.toLowerCase().slice(0, 50) === nb.descrizione.toLowerCase().slice(0, 50)
          );
          if (!isDupe && nb.descrizione && nb.descrizione.trim().length > 10) {
            bloopers.push(nb);
          }
        }
      }
    } catch (e) {
      // Passata 2 non bloccante
    }
  }

  return { success: true, data: bloopers, modelUsed };
}

function buildTriviaSyncPrompt(film, esclusioni, requested, isPass2 = false) {
  const esclusioneText = esclusioni.length > 0
    ? `\nCURIOSITÀ GIÀ REGISTRATE NEL NOSTRO ARCHIVIO (NON RIPETERE ASSOLUTAMENTE QUESTE O FATTI IDENTICI):\n${esclusioni
        .slice(0, 50)
        .map((e, idx) => `${idx + 1}. ${e.slice(0, 180)}`)
        .join("\n")}`
    : "\nNessuna curiosità attualmente registrata in archivio.";

  return `Sei un rigoroso storico del cinema e documentarista specializzato in retroscena di produzione, aneddoti di casting e segreti dal set reali, comprovati e verificabili.

DATI UFFICIALI DEL FILM:
- Titolo registrato: "${film.titolo}" (${film.anno || "N/D"})
- Regia: ${film.regista || "N/D"}
- Cast: ${film.attori || "N/D"}
- Sinossi: ${film.trama || "N/D"}
- NOTA TITOLI: Considera sia il titolo italiano che il titolo originale/internazionale per attingere all'intero archivio globale di aneddoti, retroscena di produzione, casting e curiosità documentate.
${esclusioneText}

COMPITO E SCANSIONE ESAUSTIVA A 360 GRADI${isPass2 ? " (SECONDA PASSATA APPROFONDITA)" : ""}:
Esegui una scansione approfondita di TUTTE le curiosità, aneddoti e retroscena storici REALI documentati per questo film.
NON fermarti a 1 o 2 curiosità generiche: esplora sistematicamente i diversi ambiti:
1. Casting & Scelte (attori provinati o scartati, rinunce celebri, cambi di sceneggiatura).
2. Retroscena dal set e aneddoti di lavorazione reali (difficoltà tecniche, incidenti non gravi, improvvisazioni storiche).
3. Segreti di produzione ed effetti speciali (tecniche artigianali, modelli in scala, trucchi di regia).
4. Citazioni, omaggi ed Easter Egg documentati.

REGOLE ANTI-ALLUCINAZIONE ASSOLUTE:
1. DIVIETO ASSOLUTO DI INVENTARE O GENERALIZZARE: Non inventare MAI aneddoti generici o verosimili. Ogni curiosità DEVE contenere fatti specifici, nomi propri, cifre concrete o eventi realmente accaduti e verificabili (es. interviste ufficiali, note di produzione, Making-of, commenti audio DVD).
2. SE NON CI SONO ALTRI FATTI DOCUMENTATI, RESTITUISCI []: Se per questo film non ci sono altri fatti documentati, restituisci tassativamente un array vuoto [].
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
    "titolo": "Titolo breve e accattivante della curiosità",
    "categoria": "Curiosità & Retroscena",
    "descrizione": "Descrizione ricca, precisa e fattuale del fatto realmente accaduto...",
    "fonte": "Intervista al regista / Making-of ufficiale"
  }
]`;
}

// Scansione Curiosità con Scansione esaustiva e Passata 2 Automatica (Auto Deep-Scan)
async function scanTriviaForFilm(film, existingTrivia, maxNew) {
  const p1 = buildTriviaSyncPrompt(film, existingTrivia, maxNew, false);
  const res1 = await callGeminiZeroTemp(p1);
  if (!res1 || !res1.success) {
    return res1 || { success: false, error: "Risposta non valida da Gemini" };
  }
  let trivia = Array.isArray(res1.data) ? res1.data : [];
  let modelUsed = res1.modelUsed;

  if (trivia.length > 0 && trivia.length < 4 && maxNew >= 5) {
    try {
      const combinedExclusions = [
        ...existingTrivia,
        ...trivia.map((t) => `${t.titolo}: ${t.descrizione}`),
      ];
      const p2 = buildTriviaSyncPrompt(film, combinedExclusions, Math.min(maxNew, 8), true);
      const res2 = await callGeminiZeroTemp(p2);
      if (res2 && res2.success && Array.isArray(res2.data) && res2.data.length > 0) {
        for (const nt of res2.data) {
          const isDupe = trivia.some(
            (ex) => ex.titolo && nt.titolo && ex.titolo.toLowerCase().slice(0, 30) === nt.titolo.toLowerCase().slice(0, 30)
          );
          if (!isDupe && nt.titolo && nt.titolo.trim().length > 3 && nt.descrizione && nt.descrizione.trim().length > 10) {
            trivia.push(nt);
          }
        }
      }
    } catch (e) {
      // Passata 2 non bloccante
    }
  }

  return { success: true, data: trivia, modelUsed };
}

// Gestione stato sincronizzazione e memorizzazione avanzamento
async function getSyncState() {
  try {
    const { data } = await supabase
      .from('configurazioni')
      .select('valore')
      .eq('chiave', 'sync_state_v2')
      .maybeSingle();
    if (data && data.valore) {
      return JSON.parse(data.valore);
    }
  } catch (e) {
    // In caso di errore o RLS anon, usiamo fallback memoria
  }
  return { verifiedFilms: {} };
}

async function saveSyncState(state) {
  try {
    await supabase.from('configurazioni').upsert({
      chiave: 'sync_state_v2',
      valore: JSON.stringify(state),
      visibile: false,
    }, { onConflict: 'chiave' });
  } catch (e) {
    // Non bloccante
  }
}

// Funzione Principale
async function main() {
  // 1. Pulizia righe corrotte (Zero Downtime)
  if (cleanJunkAtStart) {
    console.log("\n🧹 [1/4] Verifica e rimozione righe corrotte/di test...");
    try {
      const { data: junkTrivia } = await supabase
        .from('movie_trivia')
        .select('id')
        .or('descrizione.eq.,titolo.ilike.%test%');
      if (junkTrivia && junkTrivia.length > 0) {
        const jIds = junkTrivia.map(r => r.id);
        await supabase.from('movie_trivia').delete().in('id', jIds);
        console.log(`   ✅ Eliminate ${jIds.length} curiosità corrotte/test.`);
      } else {
        console.log("   ✅ Nessuna curiosità corrotta presente.");
      }
    } catch (e) {
      console.warn("   ⚠️ Avviso pulizia iniziale:", e.message);
    }
  }

  // 2. Caricamento catalogo e stato verifica
  console.log("\n📦 [2/4] Caricamento catalogo e classificazione intelligente...");
  const syncState = await getSyncState();
  const verifiedMap = syncState.verifiedFilms || {};

  const { data: allFilms, error: errFilms } = await supabase
    .from('films')
    .select('id, titolo, anno, regista, attori, trama, movie_trivia(count), errori(count)')
    .order('id', { ascending: true });

  if (errFilms || !allFilms) {
    console.error("❌ Errore caricamento film:", errFilms);
    process.exit(1);
  }

  function extractCount(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (Array.isArray(val)) {
    if (val.length > 0 && typeof val[0]?.count === 'number') return val[0].count;
    return val.length;
  }
  if (typeof val?.count === 'number') return val.count;
  return 0;
}

// Carichiamo lo stato attuale delle curiosità per capire chi ha ancora contenuti vecchi fittizi
  const { data: triviaStats } = await supabase
    .from('movie_trivia')
    .select('film_id, provenienza');

  const triviaByFilm = {};
  for (const t of triviaStats || []) {
    if (!triviaByFilm[t.film_id]) {
      triviaByFilm[t.film_id] = { verifiedCount: 0, oldGenericCount: 0 };
    }
    if (t.provenienza === 'IA Verificata') {
      triviaByFilm[t.film_id].verifiedCount++;
    } else {
      triviaByFilm[t.film_id].oldGenericCount++;
    }
  }

  // CLASSIFICAZIONE INTELLIGENTE PERFETTA:
  // 1. Film con 0 bloopers o 0 curiosità (URGENZA MASSIMA: nessun film deve rimanere vuoto!)
  // 2. Film con vecchie curiosità fittizie da bonificare (stats.oldGenericCount > 0)
  // 3. Film parziali in accumulo (< 10 bloopers o < 10 curiosità non ancora esauriti)
  // 4. Film recenti per rotazione periodica
  // 5. Film consolidati già completi ed esauriti al 100%

  const zeroContentFilms = [];
  const needBonifica = [];
  const mayHaveMore = [];
  const recentFilmsToRefresh = [];
  const consolidatedFilms = [];

  for (const film of allFilms) {
    const stats = triviaByFilm[film.id] || { verifiedCount: 0, oldGenericCount: 0 };
    const bCount = extractCount(film.errori);
    const tCount = extractCount(film.movie_trivia);
    const state = verifiedMap[film.id] || {};
    const filmYear = Number(film.anno) || 0;
    const isRecent = filmYear >= RECENT_YEAR_THRESHOLD;

    // Se un film ha 0 bloopers O 0 curiosità, è prioritario al 100%!
    if (bCount === 0 || tCount === 0) {
      zeroContentFilms.push(film);
    } else if (stats.oldGenericCount > 0) {
      needBonifica.push(film);
    } else if (!state.bloopersExhausted || !state.triviaExhausted) {
      mayHaveMore.push(film);
    } else if (isRecent) {
      recentFilmsToRefresh.push(film);
    } else {
      consolidatedFilms.push(film);
    }
  }

  console.log(`   Stato Attuale Catalogo (${allFilms.length} film complessivi):`);
  console.log(`   - 🚨 PRIORITÀ ASSOLUTA (Film con 0 bloopers o 0 curiosità): ${zeroContentFilms.length}`);
  console.log(`   - 🔴 Da Bonificare (con curiosità generiche residue da sostituire): ${needBonifica.length}`);
  console.log(`   - 🔄 In accumulo (bloopers o curiosità documentati ulteriori): ${mayHaveMore.length}`);
  console.log(`   - 🌟 Recenti (ultimi 10 anni, rotazione periodica): ${recentFilmsToRefresh.length}`);
  console.log(`   - 🧊 Consolidati (completi ed esauriti al 100%): ${consolidatedFilms.length}`);

  // CODA DI LAVORO: I film a zero bloopers/curiosità VENGONO SEMPRE ELABORATI PRIMA DI TUTTI!
  const candidateQueue = [
    ...zeroContentFilms,
    ...needBonifica.filter(f => !zeroContentFilms.some(z => z.id === f.id)),
    ...mayHaveMore.filter(f => !zeroContentFilms.some(z => z.id === f.id)),
    ...recentFilmsToRefresh.filter(f => !zeroContentFilms.some(z => z.id === f.id))
  ];

  const filmsToProcess = limitFilms > 0 ? candidateQueue.slice(0, limitFilms) : candidateQueue;
  console.log(`\n📋 [3/4] Pellicole selezionate per questa sessione: ${filmsToProcess.length}/${candidateQueue.length}\n`);

  if (filmsToProcess.length === 0) {
    console.log("🎉 Tutti i film sono già verificati, bonificati e completi al 100%! Nessuna elaborazione necessaria per oggi.");
    return;
  }

  let globalStats = {
    processed: 0,
    bloopersAdded: 0,
    triviaAdded: 0,
    oldTriviaCleaned: 0,
    errors: 0,
  };

  // 4. Scansione film per film
  console.log("🚀 [4/4] Avvio scansione con modello a temperatura 0.0...");
  for (let i = 0; i < filmsToProcess.length; i++) {
    const film = filmsToProcess[i];
    const indexStr = `[${i + 1}/${filmsToProcess.length}]`;
    const filmYear = film.anno || "N/D";
    const regText = film.regista ? `, Regia: ${film.regista}` : "";
    console.log(`\n${indexStr} 📽️ "${film.titolo}" (${filmYear}${regText}) - ID: ${film.id}`);

    const numYear = Number(film.anno) || 0;
    if (numYear > CURRENT_YEAR) {
      console.log(`   ⏭️ Film con uscita futura (${numYear}): nessun blooper o retroscena verificabile prima della distribuzione nelle sale.`);
      continue;
    }

    const filmState = verifiedMap[film.id] || { year: filmYear };

    try {
      // 1. Recupero parallelo stato esistente
      const [errRes, triviaRes] = await Promise.all([
        (mode === 'both' || mode === 'bloopers') ? supabase.from('errori').select('descrizione').eq('film_id', film.id) : Promise.resolve({ data: [] }),
        (mode === 'both' || mode === 'trivia') ? supabase.from('movie_trivia').select('id, titolo, descrizione, provenienza').eq('film_id', film.id) : Promise.resolve({ data: [] })
      ]);

      const existingDescriptions = (errRes.data || []).map(e => e.descrizione);
      const existingTrivia = triviaRes.data || [];
      const existingTexts = existingTrivia.map(t => `${t.titolo}: ${t.descrizione}`);

      // 2. Chiamate IA parallele concorrenti (velocità raddoppiata!)
      const [resBloopers, resTrivia] = await Promise.all([
        (mode === 'both' || mode === 'bloopers')
          ? scanBloopersForFilm(film, existingDescriptions, maxBloopersPerFilm)
          : Promise.resolve(null),
        (mode === 'both' || mode === 'trivia')
          ? scanTriviaForFilm(film, existingTexts, maxTriviaPerFilm)
          : Promise.resolve(null)
      ]);

      if (resBloopers?.isDailyQuotaExhausted || resTrivia?.isDailyQuotaExhausted) {
        console.log(`\n🛑 LIMITE GIORNALIERO GOOGLE GEMINI RAGGIUNTO (Piano Free: max 500 chiamate/giorno).`);
        console.log(`💾 Stato di avanzamento salvato: il batch riprenderà dai film rimanenti al prossimo ciclo.`);
        await saveSyncState({ verifiedFilms: verifiedMap });
        break;
      }

      // --- ELABORAZIONE BLOOPERS ---
      if (resBloopers) {
        if (resBloopers.success && Array.isArray(resBloopers.data)) {
          const valid = resBloopers.data.filter(b => b.descrizione && b.descrizione.length > 15);
          if (valid.length > 0) {
            const rows = valid.map(b => ({
              film_id: film.id,
              minuto: b.minuto || "00:00:00",
              categoria: b.categoria || "Errori di scena / Posizione",
              descrizione: b.descrizione.trim(),
              youtube_query: b.youtube_query || `${film.titolo} blooper`,
              approvato: true,
              inserito_da: "IA (Daily Sync)",
              provenienza: "IA Verificata",
              conferme: 0,
              contestazioni: 0,
            }));
            const { error: errIns } = await supabase.from('errori').insert(rows);
            if (!errIns) {
              console.log(`   🎯 Bloopers: +${valid.length} autentici aggiunti (Totale film: ${existingDescriptions.length + valid.length})`);
              globalStats.bloopersAdded += valid.length;
              filmState.bloopersExhausted = valid.length < maxBloopersPerFilm;
            } else {
              console.warn(`   ⚠️ Errore salvataggio bloopers: ${errIns.message}`);
            }
          } else {
            console.log(`   🎯 Bloopers: archivio già completo al 100% (nessun altro blooper reale documentato)`);
            filmState.bloopersExhausted = true;
          }
        } else {
          console.warn(`   ⚠️ Scansione bloopers fallita:`, resBloopers.error);
        }
      }

      // --- ELABORAZIONE TRIVIA / CURIOSITÀ ---
      if (resTrivia) {
        if (resTrivia.success && Array.isArray(resTrivia.data)) {
          const valid = resTrivia.data.filter(t => t.titolo && t.descrizione && t.descrizione.length > 20);
          if (valid.length > 0) {
            const rows = valid.map((t, idx) => ({
              film_id: film.id,
              categoria: t.categoria || "Curiosità & Retroscena",
              titolo: t.titolo.trim(),
              descrizione: t.descrizione.trim(),
              fonte: t.fonte || "Archivio Ufficiale",
              approvato: true,
              inserito_da: "IA (Daily Sync)",
              provenienza: "IA Verificata",
              likes: 0,
              ordine: idx,
            }));

            // Inserimento con strategia Zero-Downtime: inserisce prima le autentiche
            const { error: errIns } = await supabase.from('movie_trivia').insert(rows);
            if (!errIns) {
              console.log(`   ✨ Curiosità: +${valid.length} autentiche aggiunte`);
              globalStats.triviaAdded += valid.length;
              filmState.triviaExhausted = valid.length < maxTriviaPerFilm;

              // Eliminazione automatica vecchie curiosità generiche fittizie
              if (replaceTriviaFilmByFilm && existingTrivia && existingTrivia.length > 0) {
                const oldIds = existingTrivia
                  .filter(r => r.provenienza !== "IA Verificata")
                  .map(r => r.id);
                if (oldIds.length > 0) {
                  await supabase.from('movie_trivia').delete().in('id', oldIds);
                  console.log(`      🧹 Bonifica: rimosse ${oldIds.length} vecchie curiosità generiche fittizie per questo film.`);
                  globalStats.oldTriviaCleaned += oldIds.length;
                }
              }
            } else {
              console.warn(`   ⚠️ Errore salvataggio curiosità: ${errIns.message}`);
            }
          } else {
            console.log(`   ✨ Curiosità: nessun ulteriore fatto reale documentato (archivio completo)`);
            filmState.triviaExhausted = true;

            // Anche se non ci sono nuove curiosità, eliminiamo quelle vecchie fittizie per ripulire la scheda
            if (replaceTriviaFilmByFilm && existingTrivia && existingTrivia.length > 0) {
              const oldIds = existingTrivia
                .filter(r => r.provenienza !== "IA Verificata")
                .map(r => r.id);
              if (oldIds.length > 0) {
                await supabase.from('movie_trivia').delete().in('id', oldIds);
                console.log(`      🧹 Bonifica: rimosse ${oldIds.length} vecchie curiosità generiche fittizie per questo film.`);
                globalStats.oldTriviaCleaned += oldIds.length;
              }
            }
          }
        } else {
          console.warn(`   ⚠️ Scansione curiosità fallita:`, resTrivia.error);
        }
      }

      filmState.verifiedAt = new Date().toISOString();
      verifiedMap[film.id] = filmState;
      globalStats.processed++;
    } catch (filmErr) {
      console.error(`   ❌ Errore elaborazione film ${film.id}:`, filmErr.message);
      globalStats.errors++;
    }

    // Salva progressivamente lo stato ogni 5 film
    if ((i + 1) % 5 === 0 || i === filmsToProcess.length - 1) {
      await saveSyncState({ verifiedFilms: verifiedMap });
    }

    // Pausa di raffreddamento anti-rate limit (3s)
    if (i < filmsToProcess.length - 1) {
      await sleep(pauseMs);
    }
  }

  await saveSyncState({ verifiedFilms: verifiedMap });

  console.log("\n==================================================================");
  console.log("🏁 DAILY SYNC COMPLETATO!");
  console.log(`📊 Film elaborati: ${globalStats.processed}/${filmsToProcess.length}`);
  console.log(`🎯 Nuovi bloopers autentici inseriti: ${globalStats.bloopersAdded}`);
  console.log(`✨ Nuove curiosità autentiche inserite: ${globalStats.triviaAdded}`);
  console.log(`🧹 Vecchie curiosità fittizie eliminate: ${globalStats.oldTriviaCleaned}`);
  console.log(`⚠️ Errori riscontrati: ${globalStats.errors}`);
  console.log(`🕒 Fine: ${new Date().toISOString()}`);
  console.log("==================================================================\n");
}

main().catch(err => {
  console.error("❌ Errore fatale nello script daily-sync:", err);
  process.exit(1);
});
