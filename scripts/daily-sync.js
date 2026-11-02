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

// 1. Caricamento variabili d'ambiente (process.env con fallback a .env.local)
let env = {};
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const k = match[1].trim();
      const v = match[2].trim().replace(/^["']|["']$/g, '');
      env[k] = v;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "https://gmiwhscbqvadnlqruhjs.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || env.GEMINI_API_KEY || env.GOOGLE_API_KEY;

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

const mode = process.env.SYNC_MODE || getArg('mode', 'both') || 'both';
// Di default 0 = elabora tutti i film necessari per la sessione corrente
const limitFilms = parseInt(process.env.SYNC_LIMIT || getArg('limit', '0') || '0', 10) || 0;
// Max 10 blooper e 10 curiosità a passata (accumulativi nelle passate successive)
const maxBloopersPerFilm = Math.min(parseInt(process.env.MAX_BLOOPERS || getArg('max-bloopers', '10') || '10', 10) || 10, 50);
const maxTriviaPerFilm = Math.min(parseInt(process.env.MAX_TRIVIA || getArg('max-trivia', '10') || '10', 10) || 10, 30);
const pauseMs = parseInt(process.env.PAUSE_MS || getArg('pause', '3000') || '3000', 10) || 3000;
const cleanJunkAtStart = hasFlag('clean-junk') || getArg('clean-junk', 'true') === 'true';
// Sostituzione automatica delle vecchie curiosità generiche/false attiva di default
const replaceTriviaFilmByFilm = process.env.REPLACE_TRIVIA !== 'false' && getArg('replace-trivia', 'true') !== 'false';

// Anno soglia per film recenti (ultimi 10 anni: dal 2016 in poi)
const CURRENT_YEAR = new Date().getFullYear();
const RECENT_YEAR_THRESHOLD = CURRENT_YEAR - 10;

console.log("==================================================================");
console.log("🎬 DAILY SYNC INTELLIGENTE - BLOOPERS & TRIVIA HUB");
console.log(`🕒 Avvio: ${new Date().toISOString()}`);
console.log(`⚙️  Modalità: ${mode} | Limite film: ${limitFilms === 0 ? "TUTTI I CANDIDATI" : limitFilms}`);
console.log(`🎯 Max Bloopers a passata: ${maxBloopersPerFilm} | Max Curiosità a passata: ${maxTriviaPerFilm}`);
console.log(`🧹 Bonifica & Sostituzione automatica falsi: ${replaceTriviaFilmByFilm ? "ATTIVA" : "DISATTIVA"}`);
console.log(`⏳ Soglia film recenti: ${RECENT_YEAR_THRESHOLD} (ultimi 10 anni monitorati a rotazione)`);
console.log("==================================================================");

// Diagnostica credenziali
console.log("\n🔍 Diagnostica Credenziali Ambiente:");
console.log(`- NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? "✅ Configurato (" + supabaseUrl + ")" : "❌ MANCANTE"}`);
console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? "✅ Presente (Bypass RLS attivo)" : "⚠️ NON CONFIGURATO (sarà usata anon key)"}`);
console.log(`- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${anonKey ? "✅ Presente" : "⚠️ Assente"}`);
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
  "gemini-flash-lite-latest",
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-3.6-flash",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-flash-latest"
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
          temperature: 0.0,
          topP: 0.1,
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
      if (status === 429) {
        console.log(`      ⏳ Quota temporanea raggiunta su ${model}, attesa 8s...`);
        await sleep(8000);
      }
    }
  }
  return { success: false, error: lastErr?.message || "Impossibile ottenere risposta valida dai modelli Gemini." };
}

// Scansione Bloopers mancanti (senza limite artificiale, fino al cap di passata)
async function scanBloopersForFilm(film, existingBloopers, maxNew) {
  const esclusioneText = existingBloopers.length > 0
    ? `\nERRORI GIÀ REGISTRATI NEL NOSTRO ARCHIVIO (NON RIPETERE ASSOLUTAMENTE QUESTI ERRORI O VARIANTI DEGLI STESSI):\n${existingBloopers
        .slice(0, 50)
        .map((e, idx) => `${idx + 1}. ${e.slice(0, 200)}`)
        .join("\n")}`
    : "\nNessun errore attualmente registrato in archivio.";

  const prompt = `Sei un archivista e verificatore cinematografico specializzato in bloopers, goofs ed errori di montaggio reali e documentati.

DATI UFFICIALI DEL FILM:
- Titolo: "${film.titolo}" (${film.anno || "N/D"})
- Regia: ${film.regista || "N/D"}
- Cast: ${film.attori || "N/D"}
- Sinossi: ${film.trama || "N/D"}
${esclusioneText}

COMPITO:
Analizza attentamente gli errori già registrati per questa pellicola.
Identifica e restituisci tutti gli ALTRI bloopers, goofs o errori di scena REALI, NOTI e DOCUMENTATI (fonti: MovieMistakes, IMDb Goofs, commenti audio DVD, interviste e making-of) che MANCANO ancora nell'archivio, fino a un MASSIMO di ${maxNew} nuovi bloopers per questa passata.

REGOLE ANTI-ALLUCINAZIONE ASSOLUTE:
1. DIVIETO ASSOLUTO DI INVENTARE: Non inventare mai errori. Se tutti gli errori noti della pellicola sono già presenti nell'archivio, oppure se non ne esistono altri documentati, restituisci ESCLUSIVAMENTE un array vuoto [].
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
    "descrizione": "Descrizione accurata e oggettiva del blooper...",
    "youtube_query": "${film.titolo} blooper scene"
  }
]`;

  return await callGeminiZeroTemp(prompt);
}

// Scansione Curiosità mancanti (senza limite artificiale, fino al cap di passata)
async function scanTriviaForFilm(film, existingTrivia, maxNew) {
  const esclusioneText = existingTrivia.length > 0
    ? `\nCURIOSITÀ GIÀ REGISTRATE NEL NOSTRO ARCHIVIO (NON RIPETERE ASSOLUTAMENTE QUESTE O FATTI IDENTICI):\n${existingTrivia
        .slice(0, 50)
        .map((e, idx) => `${idx + 1}. ${e.slice(0, 180)}`)
        .join("\n")}`
    : "\nNessun curiosità attualmente registrata in archivio.";

  const prompt = `Sei un rigoroso storico del cinema e documentarista specializzato in retroscena di produzione, aneddoti di casting e segreti dal set reali, comprovati e verificabili.

DATI UFFICIALI DEL FILM:
- Titolo: "${film.titolo}" (${film.anno || "N/D"})
- Regia: ${film.regista || "N/D"}
- Cast: ${film.attori || "N/D"}
- Sinossi: ${film.trama || "N/D"}
${esclusioneText}

COMPITO:
Analizza attentamente le curiosità già registrate per questa pellicola.
Identifica fino a un MASSIMO di ${maxNew} curiosità, retroscena o aneddoti storici REALI, NOTI e DOCUMENTATI che MANCANO ancora nell'archivio per questa passata.

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
    "titolo": "Titolo breve e accattivante della curiosità",
    "categoria": "Curiosità & Retroscena",
    "descrizione": "Descrizione ricca, precisa e fattuale del fatto realmente accaduto...",
    "fonte": "Intervista al regista / Making-of ufficiale"
  }
]`;

  return await callGeminiZeroTemp(prompt);
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
    .select('id, titolo, anno, regista, attori, trama')
    .order('id', { ascending: true });

  if (errFilms || !allFilms) {
    console.error("❌ Errore caricamento film:", errFilms);
    process.exit(1);
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

  // CLASSIFICAZIONE INTELLIGENTE:
  // Gruppo A: Film con curiosità fittizie residue da bonificare (FASE 1 - Massiva)
  // Gruppo B: Film nuovi mai verificati
  // Gruppo C: Film con verifiche parziali (che potrebbero avere altri bloopers mancanti)
  // Gruppo D: Film recenti (ultimi 10 anni, >= 2016)
  // Gruppo E: Film vecchi consolidati (< 2016 già completati al 100%) -> DA SALTARE!

  const needBonifica = [];
  const neverVerified = [];
  const mayHaveMore = [];
  const recentFilmsToRefresh = [];
  const consolidatedOldFilms = [];

  for (const film of allFilms) {
    const stats = triviaByFilm[film.id] || { verifiedCount: 0, oldGenericCount: 0 };
    const state = verifiedMap[film.id] || {};
    const filmYear = Number(film.anno) || 0;
    const isRecent = filmYear >= RECENT_YEAR_THRESHOLD;

    if (stats.oldGenericCount > 0) {
      needBonifica.push(film);
    } else if (!state.verifiedAt && stats.verifiedCount === 0) {
      neverVerified.push(film);
    } else if (!state.bloopersExhausted || !state.triviaExhausted) {
      mayHaveMore.push(film);
    } else if (isRecent) {
      recentFilmsToRefresh.push(film);
    } else {
      consolidatedOldFilms.push(film);
    }
  }

  const isPhase1Active = needBonifica.length > 0;
  console.log(`   Stato Attuale Catalogo (${allFilms.length} film complessivi):`);
  console.log(`   - 🔴 Da Bonificare (con curiosità generiche vecchie da sostituire): ${needBonifica.length}`);
  console.log(`   - 🆕 Nuovi film mai verificati: ${neverVerified.length}`);
  console.log(`   - 🔄 In accumulo (possibili bloopers/curiosità ulteriori): ${mayHaveMore.length}`);
  console.log(`   - 🌟 Recenti (ultimi 10 anni, rotazione periodica): ${recentFilmsToRefresh.length}`);
  console.log(`   - 🧊 Storici consolidati (< ${RECENT_YEAR_THRESHOLD}, completi al 100%): ${consolidatedOldFilms.length} (CONGELATI - zero sprechi)`);

  // CODA DI LAVORO ORDINATA PER PRIORITÀ:
  let candidateQueue = [];
  if (isPhase1Active) {
    console.log(`\n⚡ FASE 1 ATTIVA: Priorità assoluta alla bonifica massiva dei ${needBonifica.length} film rimanenti.`);
    candidateQueue = [...needBonifica, ...neverVerified];
  } else {
    console.log(`\n✨ FASE 2 A REGIME: Bonifica completata al 100%! Monitoraggio intelligente dei nuovi arrivi e film recenti.`);
    candidateQueue = [...neverVerified, ...mayHaveMore, ...recentFilmsToRefresh];
  }

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
    console.log(`\n${indexStr} 📽️ "${film.titolo}" (${filmYear}) - ID: ${film.id}`);

    const filmState = verifiedMap[film.id] || { year: filmYear };

    try {
      // --- BLOOPERS ---
      if (mode === 'both' || mode === 'bloopers') {
        const { data: existingErr } = await supabase
          .from('errori')
          .select('descrizione')
          .eq('film_id', film.id);
        const existingDescriptions = (existingErr || []).map(e => e.descrizione);

        const resBloopers = await scanBloopersForFilm(film, existingDescriptions, maxBloopersPerFilm);
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
              // Se ne ha aggiunti meno del cap, significa che non ce ne sono altri noti
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

      // --- TRIVIA / CURIOSITÀ ---
      if (mode === 'both' || mode === 'trivia') {
        const { data: existingTrivia } = await supabase
          .from('movie_trivia')
          .select('id, titolo, descrizione, provenienza')
          .eq('film_id', film.id);
        const existingTexts = (existingTrivia || []).map(t => `${t.titolo}: ${t.descrizione}`);

        const resTrivia = await scanTriviaForFilm(film, existingTrivia ? existingTexts : [], maxTriviaPerFilm);
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
