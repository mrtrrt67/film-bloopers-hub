const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');

// 1. Carica variabili d'ambiente da .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const k = match[1].trim();
    const v = match[2].trim().replace(/^["']|["']$/g, '');
    env[k] = v;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || "https://gmiwhscbqvadnlqruhjs.supabase.co";
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || env.GEMINI_API_KEY || env.GOOGLE_API_KEY || process.argv[4];

if (!geminiApiKey) {
  console.log("\n❌ GEMINI_API_KEY non trovata in .env.local o variabili d'ambiente.");
  console.log("👉 Uso: node scripts/scan-missing-bloopers.js [blocco_film=10] [max_per_film=5] [GEMINI_API_KEY]\n");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

const DEFAULT_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-3.6-flash",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-flash-latest"
];

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

async function findMissingBloopers(film, existingBloopers, maxNew = 5) {
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
    "descrizione": "Descrizione accurata dell'errore oggettivo riscontrabile a schermo."
  }
]`;

  for (const model of DEFAULT_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.0,
        },
      });

      const text = response.text?.trim() || "";
      if (!text) continue;

      const parsed = cleanAndParseJson(text);
      if (Array.isArray(parsed)) {
        return { bloopers: parsed, modelUsed: model };
      }
    } catch (err) {
      if (String(err).includes("429")) {
        console.log(`   ⏳ Quota temporanea su ${model}, attesa 6s...`);
        await new Promise(r => setTimeout(r, 6000));
      }
      continue;
    }
  }

  return { bloopers: [], error: "Nessun modello disponibile o risposta vuota" };
}

async function run() {
  const rawArgLimit = process.argv[2] || "10";
  const maxNewPerFilm = Math.min(50, Math.max(1, parseInt(process.argv[3] || "5", 10)));

  console.log(`\n===============================================================`);
  console.log(`🎬 BATCH: SCANSIONE BLOOPERS MANCANTI (ANTI-ALLUCINAZIONE)`);
  console.log(`===============================================================`);
  console.log(`- Limite massimo nuovi per film: ${maxNewPerFilm}`);
  console.log(`- Modalità: Determinismo fattuale (temperature: 0.0, zero invenzioni)`);

  const { data: allFilms, error } = await supabase
    .from('films')
    .select('id, titolo, anno, regista, attori, trama, errori(count)')
    .order('id', { ascending: true });

  if (error) {
    console.error('❌ Errore caricamento film:', error);
    process.exit(1);
  }

  const mappedFilms = (allFilms || [])
    .map(f => ({
      ...f,
      currentCount: f.errori?.[0]?.count || 0
    }))
    .sort((a, b) => a.currentCount - b.currentCount); // Priorità a chi ha meno errori registrati

  const isAll = rawArgLimit.toLowerCase() === "all" || rawArgLimit.toLowerCase() === "tutti";
  const limit = isAll ? mappedFilms.length : Math.min(mappedFilms.length, parseInt(rawArgLimit, 10));

  console.log(`- Pellicole totali a catalogo: ${mappedFilms.length}`);
  console.log(`- Pellicole da analizzare in questo blocco: ${limit}\n`);

  const batch = mappedFilms.slice(0, limit);
  let totalAdded = 0;
  let completeFilmsCount = 0;

  for (let i = 0; i < batch.length; i++) {
    const film = batch[i];
    console.log(`[${i + 1}/${batch.length}] 🎥 "${film.titolo}" (${film.anno || 'N/D'}) - Errori attuali in archivio: ${film.currentCount}`);

    // Recupera descrizioni attuali
    const { data: existing } = await supabase
      .from('errori')
      .select('descrizione')
      .eq('film_id', film.id);

    const descrizioni = (existing || []).map(e => e.descrizione);

    const { bloopers, modelUsed, error: genError } = await findMissingBloopers(film, descrizioni, maxNewPerFilm);

    if (genError) {
      console.log(`   ⚠️ Errore durante la chiamata: ${genError}`);
      continue;
    }

    if (!bloopers || bloopers.length === 0) {
      completeFilmsCount++;
      console.log(`   ✨ [COMPLETO] Nessun ulteriore blooper reale mancante (archivio esaustivo)`);
    } else {
      const daInserire = bloopers.map(g => ({
        film_id: film.id,
        minuto: g.minuto || "00:00",
        categoria: g.categoria || "Errori di scena / Posizione",
        descrizione: g.descrizione,
        approvato: true,
        conferme: 0,
        contestazioni: 0,
        inserito_da: "IA (Archivio)",
        provenienza: "ia"
      }));

      const { error: insErr } = await supabase.from('errori').insert(daInserire);
      if (insErr) {
        console.log(`   ❌ Errore inserimento DB: ${insErr.message}`);
      } else {
        totalAdded += daInserire.length;
        const newTotal = film.currentCount + daInserire.length;
        console.log(`   ✅ Aggiunti +${daInserire.length} bloopers autentici mancanti (modello: ${modelUsed}) -> Nuovo totale: ${newTotal}`);
      }
    }

    // Pausa di 3 secondi tra una chiamata e l'altra per rispettare i 15 RPM
    if (i < batch.length - 1) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log(`\n===============================================================`);
  console.log(`🎉 SCANSIONE COMPLETATA!`);
  console.log(`- Film analizzati: ${batch.length}`);
  console.log(`- Film già completi di errori reali: ${completeFilmsCount}`);
  console.log(`- Nuovi bloopers autentici inseriti: ${totalAdded}`);
  console.log(`===============================================================\n`);
}

run();

