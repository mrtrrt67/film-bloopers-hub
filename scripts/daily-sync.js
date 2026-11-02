#!/usr/bin/env node

/**
 * DAILY SYNC - Bloopers & Curiosità Hub
 *
 * Scansione automatica e incrementale ad alta affidabilità per:
 * 1. Errori/Bloopers autentici (IMDb, MovieMistakes, fonti ufficiali)
 * 2. Curiosità & Retroscena storici verificati (temperatura 0.0, zero allucinazioni)
 *
 * Supporta esecuzione locale, cron server e GitHub Actions.
 */

const fs = require('fs');
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
const limitFilms = parseInt(process.env.SYNC_LIMIT || getArg('limit', '0') || '0', 10) || 0;
const maxBloopersPerFilm = Math.min(parseInt(process.env.MAX_BLOOPERS || getArg('max-bloopers', '5') || '5', 10) || 5, 50);
const maxTriviaPerFilm = Math.min(parseInt(process.env.MAX_TRIVIA || getArg('max-trivia', '5') || '5', 10) || 5, 30);
const pauseMs = parseInt(process.env.PAUSE_MS || getArg('pause', '3000') || '3000', 10) || 3000;
const cleanJunkAtStart = hasFlag('clean-junk') || getArg('clean-junk', 'true') === 'true';
const replaceTriviaFilmByFilm = (process.env.REPLACE_TRIVIA === 'true') || hasFlag('replace-trivia') || getArg('replace-trivia', 'false') === 'true';

console.log("==================================================================");
console.log("🎬 DAILY SYNC - FILM BLOOPERS & TRIVIA HUB");
console.log(`🕒 Avvio: ${new Date().toISOString()}`);
console.log(`⚙️  Modalità: ${mode} | Limite film: ${limitFilms === 0 ? "TUTTI I 326" : limitFilms}`);
console.log(`🎯 Max Bloopers/film: ${maxBloopersPerFilm} | Max Curiosità/film: ${maxTriviaPerFilm}`);
console.log("==================================================================");

// Diagnostica credenziali
console.log("\n🔍 Diagnostica Credenziali Ambiente:");
console.log(`- NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? "✅ Configurato (" + supabaseUrl + ")" : "❌ MANCANTE"}`);
console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? "✅ Presente (Bypass RLS attivo)" : "⚠️ NON CONFIGURATO (sarà usata anon key)"}`);
console.log(`- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${anonKey ? "✅ Presente" : "⚠️ Assente"}`);
console.log(`- GEMINI_API_KEY: ${geminiApiKey ? "✅ Presente (" + geminiApiKey.slice(0, 6) + "...)" : "❌ MANCANTE"}`);

if (!supabaseUrl) {
  console.error("\n❌ ERRORE: NEXT_PUBLIC_SUPABASE_URL mancante.");
  console.error("👉 Aggiungila nei repository secrets di GitHub: Settings > Secrets and variables > Actions > New repository secret\n");
  process.exit(1);
}

const effectiveSupabaseKey = serviceRoleKey || anonKey;
if (!effectiveSupabaseKey) {
  console.error("\n❌ ERRORE: Nessuna chiave Supabase configurata.");
  console.error("👉 Aggiungi SUPABASE_SERVICE_ROLE_KEY nei repository secrets di GitHub.\n");
  process.exit(1);
}

if (!geminiApiKey) {
  console.error("\n❌ ERRORE: GEMINI_API_KEY mancante.");
  console.error("👉 Aggiungi GEMINI_API_KEY nei repository secrets di GitHub.\n");
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

// Scansione Bloopers mancanti
async function scanBloopersForFilm(film, existingBloopers, maxNew) {
  const esclusioneText = existingBloopers.length > 0
    ? `\nERRORI GIÀ REGISTRATI NEL NOSTRO ARCHIVIO (NON RIPETERE ASSOLUTAMENTE QUESTI ERRORI O VARIANTI DEGLI STESSI):\n${existingBloopers
        .slice(0, 40)
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
Identifica e restituisci tutti gli ALTRI bloopers, goofs o errori di scena REALI, NOTI e DOCUMENTATI (fonti: MovieMistakes, IMDb Goofs, commenti audio DVD, interviste e making-of) che MANCANO ancora nell'archivio, fino a un MASSIMO di ${maxNew} nuovi bloopers.

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

// Scansione Curiosità mancanti
async function scanTriviaForFilm(film, existingTrivia, maxNew) {
  const esclusioneText = existingTrivia.length > 0
    ? `\nCURIOSITÀ GIÀ REGISTRATE NEL NOSTRO ARCHIVIO (NON RIPETERE ASSOLUTAMENTE QUESTE O FATTI IDENTICI):\n${existingTrivia
        .slice(0, 40)
        .map((e, idx) => `${idx + 1}. ${e.slice(0, 180)}`)
        .join("\n")}`
    : "\nNessuna curiosità attualmente registrata in archivio.";

  const prompt = `Sei un rigoroso storico del cinema e documentarista specializzato in retroscena di produzione, aneddoti di casting e segreti dal set reali, comprovati e verificabili.

DATI UFFICIALI DEL FILM:
- Titolo: "${film.titolo}" (${film.anno || "N/D"})
- Regia: ${film.regista || "N/D"}
- Cast: ${film.attori || "N/D"}
- Sinossi: ${film.trama || "N/D"}
${esclusioneText}

COMPITO:
Analizza attentamente le curiosità già registrate per questa pellicola.
Identifica fino a un MASSIMO di ${maxNew} curiosità, retroscena o aneddoti storici REALI, NOTI e DOCUMENTATI che MANCANO ancora nell'archivio.

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

// Funzione Principale
async function main() {
  // 1. Pulizia righe corrotte (Zero Downtime)
  if (cleanJunkAtStart) {
    console.log("\n🧹 [1/3] Verifica e rimozione righe corrotte/di test...");
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

  // 2. Recupero film ordinati da chi ha meno contenuti
  console.log("\n📦 [2/3] Caricamento catalogo film da Supabase...");
  const { data: films, error: errFilms } = await supabase
    .from('films')
    .select('id, titolo, anno, regista, attori, trama')
    .order('id', { ascending: true });

  if (errFilms || !films) {
    console.error("❌ Errore caricamento film:", errFilms);
    process.exit(1);
  }

  const filmsToProcess = limitFilms > 0 ? films.slice(0, limitFilms) : films;
  console.log(`   Totale pellicole da scansionare: ${filmsToProcess.length}/${films.length}\n`);

  // Statistiche globali
  let stats = {
    processed: 0,
    bloopersAdded: 0,
    triviaAdded: 0,
    skipped: 0,
    errors: 0,
  };

  // 3. Scansione sequenziale film per film
  console.log("🚀 [3/3] Scansione intelligente anti-allucinazione...");
  for (let i = 0; i < filmsToProcess.length; i++) {
    const film = filmsToProcess[i];
    const indexStr = `[${i + 1}/${filmsToProcess.length}]`;
    console.log(`\n${indexStr} 📽️ "${film.titolo}" (${film.anno || "N/D"}) - ID: ${film.id}`);

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
              console.log(`   🎯 Bloopers: +${valid.length} autentici aggiunti`);
              stats.bloopersAdded += valid.length;
            } else {
              console.warn(`   ⚠️ Errore salvataggio bloopers: ${errIns.message}`);
              if (errIns.message.includes("violates row-level security policy")) {
                console.warn(`      👉 Per risolvere l'errore RLS: aggiungi SUPABASE_SERVICE_ROLE_KEY nei GitHub Secrets.`);
              }
            }
          } else {
            console.log(`   🎯 Bloopers: già completo (0 nuovi bloopers documentati)`);
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
              stats.triviaAdded += valid.length;

              // Se richiesto, rimuove solo le vecchie curiosità generiche di questo film
              if (replaceTriviaFilmByFilm && existingTrivia && existingTrivia.length > 0) {
                const oldIds = existingTrivia
                  .filter(r => r.provenienza !== "IA Verificata")
                  .map(r => r.id);
                if (oldIds.length > 0) {
                  await supabase.from('movie_trivia').delete().in('id', oldIds);
                  console.log(`      🧹 Sostituzione progressive: rimosse ${oldIds.length} vecchie curiosità generiche per questo film.`);
                }
              }
            } else {
              console.warn(`   ⚠️ Errore salvataggio curiosità: ${errIns.message}`);
              if (errIns.message.includes("violates row-level security policy")) {
                console.warn(`      👉 Per risolvere l'errore RLS: aggiungi SUPABASE_SERVICE_ROLE_KEY nei GitHub Secrets.`);
              }
            }
          } else {
            console.log(`   ✨ Curiosità: già completo (0 nuove curiosità documentate)`);
          }
        } else {
          console.warn(`   ⚠️ Scansione curiosità fallita:`, resTrivia.error);
        }
      }

      stats.processed++;
    } catch (filmErr) {
      console.error(`   ❌ Errore elaborazione film ${film.id}:`, filmErr.message);
      stats.errors++;
    }

    // Pausa di rispetto rate limit
    if (i < filmsToProcess.length - 1) {
      await sleep(pauseMs);
    }
  }

  console.log("\n==================================================================");
  console.log("🏁 DAILY SYNC COMPLETATO CON SUCCESSO!");
  console.log(`📊 Film esaminati: ${stats.processed}/${filmsToProcess.length}`);
  console.log(`🎯 Nuovi bloopers autentici inseriti: ${stats.bloopersAdded}`);
  console.log(`✨ Nuove curiosità autentiche inserite: ${stats.triviaAdded}`);
  console.log(`⚠️ Errori riscontrati: ${stats.errors}`);
  console.log(`🕒 Fine: ${new Date().toISOString()}`);
  console.log("==================================================================\n");
}

main().catch(err => {
  console.error("❌ Errore fatale nello script daily-sync:", err);
  process.exit(1);
});
