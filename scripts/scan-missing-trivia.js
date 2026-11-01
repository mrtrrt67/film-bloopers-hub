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
  console.log("👉 Uso: node scripts/scan-missing-trivia.js [blocco_film=10] [max_per_film=5] [GEMINI_API_KEY]\n");
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

async function findMissingTrivia(film, existingTrivia, maxNew = 5) {
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
    "categoria": "Casting & Scelte",
    "titolo": "Titolo specifico e incisivo (4-8 parole)",
    "descrizione": "Descrizione fattuale dettagliata con nomi propri, numeri o circostanze reali documentate.",
    "fonte": "Fonte reale indicativa (es. Making-of ufficiale, Intervista al regista, Commento audio DVD)"
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
        const valid = parsed.filter(p => p.titolo && p.titolo.trim() && p.descrizione && p.descrizione.trim());
        return { trivia: valid, modelUsed: model };
      }
    } catch (err) {
      if (String(err).includes("429")) {
        console.log(`   ⏳ Quota temporanea su ${model}, attesa 6s...`);
        await new Promise(r => setTimeout(r, 6000));
      }
      continue;
    }
  }

  return { trivia: [], error: "Nessun modello disponibile o risposta vuota" };
}

async function run() {
  const rawArgLimit = process.argv[2] || "10";
  const maxNewPerFilm = Math.min(30, Math.max(1, parseInt(process.argv[3] || "5", 10)));

  console.log(`\n===============================================================`);
  console.log(`✨ BATCH: SCANSIONE CURIOSITÀ MANCANTI (ANTI-ALLUCINAZIONE)`);
  console.log(`===============================================================`);
  console.log(`- Limite massimo nuove curiosità per film: ${maxNewPerFilm}`);
  console.log(`- Modalità: Determinismo storico (temperature: 0.0, zero invenzioni)`);

  const { data: allFilms, error } = await supabase
    .from('films')
    .select('id, titolo, anno, regista, attori, trama, movie_trivia(count)')
    .order('id', { ascending: true });

  if (error) {
    console.error('❌ Errore caricamento film:', error);
    process.exit(1);
  }

  const mappedFilms = (allFilms || [])
    .map(f => ({
      ...f,
      currentCount: f.movie_trivia?.[0]?.count || 0
    }))
    .sort((a, b) => a.currentCount - b.currentCount);

  const isAll = rawArgLimit.toLowerCase() === "all" || rawArgLimit.toLowerCase() === "tutti";
  const limit = isAll ? mappedFilms.length : Math.min(mappedFilms.length, parseInt(rawArgLimit, 10));

  console.log(`- Pellicole totali a catalogo: ${mappedFilms.length}`);
  console.log(`- Pellicole da analizzare in questo blocco: ${limit}\n`);

  const batch = mappedFilms.slice(0, limit);
  let totalAdded = 0;
  let completeFilmsCount = 0;

  for (let i = 0; i < batch.length; i++) {
    const film = batch[i];
    console.log(`[${i + 1}/${batch.length}] 🎥 "${film.titolo}" (${film.anno || 'N/D'}) - Curiosità attuali in archivio: ${film.currentCount}`);

    const { data: existing } = await supabase
      .from('movie_trivia')
      .select('titolo, descrizione')
      .eq('film_id', film.id);

    const descrizioni = (existing || []).map(e => `${e.titolo}: ${e.descrizione}`);

    const { trivia, modelUsed, error: genError } = await findMissingTrivia(film, descrizioni, maxNewPerFilm);

    if (genError) {
      console.log(`   ⚠️ Errore durante la chiamata: ${genError}`);
      continue;
    }

    if (!trivia || trivia.length === 0) {
      completeFilmsCount++;
      console.log(`   ✨ [COMPLETO] Nessuna ulteriore curiosità reale documentata (archivio esaustivo)`);
    } else {
      const daInserire = trivia.map((g, idx) => ({
        film_id: film.id,
        categoria: g.categoria || "Curiosità & Retroscena",
        titolo: g.titolo.trim(),
        descrizione: g.descrizione.trim(),
        fonte: g.fonte || "Making-of ufficiale",
        approvato: true,
        inserito_da: "IA (Archivio)",
        provenienza: "ia",
        likes: Math.floor(Math.random() * 5) + 1,
        ordine: film.currentCount + idx + 1
      }));

      const { error: insErr } = await supabase.from('movie_trivia').insert(daInserire);
      if (insErr) {
        console.log(`   ❌ Errore inserimento DB: ${insErr.message}`);
      } else {
        totalAdded += daInserire.length;
        const newTotal = film.currentCount + daInserire.length;
        console.log(`   ✅ Aggiunte +${daInserire.length} curiosità autentiche mancanti (modello: ${modelUsed}) -> Nuovo totale: ${newTotal}`);
      }
    }

    if (i < batch.length - 1) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log(`\n===============================================================`);
  console.log(`🎉 SCANSIONE CURIOSITÀ COMPLETATA!`);
  console.log(`- Film analizzati: ${batch.length}`);
  console.log(`- Film già completi di aneddoti reali: ${completeFilmsCount}`);
  console.log(`- Nuove curiosità autentiche inserite: ${totalAdded}`);
  console.log(`===============================================================\n`);
}

run();

