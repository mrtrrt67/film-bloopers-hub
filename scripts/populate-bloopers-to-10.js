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
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || env.GEMINI_API_KEY || env.GOOGLE_API_KEY || env.GOOGLE_GENAI_API_KEY || process.argv[3];

if (!geminiApiKey) {
  console.log("\nℹ️  GEMINI_API_KEY non rilevata in .env.local");
  console.log("👉 Puoi avviare il batch direttamente dall'interfaccia Admin (/admin) dove le chiavi Vercel sono attive,");
  console.log("   oppure da terminale passando la chiave come parametro:");
  console.log("   node scripts/populate-bloopers-to-10.js <numero_film> <GEMINI_API_KEY>\n");
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

async function generateBloopers(film, existingBloopers, countNeeded) {
  const esclusioneText = existingBloopers.length > 0
    ? `\nERRORI GIÀ REGISTRATI (NON RIPETERE QUESTI O ERRORI SIMILI):\n${existingBloopers.slice(0, 15).map(e => `- ${e.slice(0, 120)}`).join('\n')}`
    : '';

  const prompt = `Sei un esperto enciclopedico di bloopers, errori di montaggio, sviste storiche e ciak falsi nella storia del cinema.

DATI UFFICIALI DEL FILM:
- Titolo: "${film.titolo}" (${film.anno || "N/D"})
- Regia: ${film.regista || "N/D"}
- Cast: ${film.attori || "N/D"}
- Sinossi: ${film.trama || "N/D"}
${esclusioneText}

COMPITO:
Trova tra ${Math.max(2, countNeeded)} e ${Math.min(10, countNeeded + 1)} nuovi ed esclusivi errori/bloopers concreti, celebri o documentati per questo film.
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

      const parsed = cleanAndParseJson(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { bloopers: parsed, modelUsed: model };
      }
    } catch (err) {
      // Prova il prossimo modello
    }
  }

  return { bloopers: [], error: "Nessun modello ha generato bloopers validi" };
}

async function main() {
  const maxToProcess = parseInt(process.argv[2], 10) || 5; // default 5 o tutti se specificato
  const targetCount = 10;

  console.log(`\n===============================================================`);
  console.log(`🎬 AVVIO BATCH INCREMENTO BLOOPERS A QUOTA ${targetCount}`);
  console.log(`===============================================================`);

  // 1. Recupera film con meno di targetCount bloopers
  const { data: allFilms, error } = await supabase
    .from('films')
    .select('id, titolo, anno, regista, attori, trama, errori(count)')
    .order('id', { ascending: true });

  if (error) {
    console.error("❌ Errore recupero film:", error);
    return;
  }

  const candidateFilms = (allFilms || [])
    .map(f => ({
      ...f,
      currentCount: f.errori?.[0]?.count || 0
    }))
    .filter(f => f.currentCount < targetCount)
    .sort((a, b) => a.currentCount - b.currentCount); // Prima quelli con meno errori

  console.log(`📊 Film totali nel database: ${allFilms.length}`);
  console.log(`🎯 Film con meno di ${targetCount} bloopers: ${candidateFilms.length}`);
  console.log(`⚡ Film da elaborare in questa sessione: ${Math.min(candidateFilms.length, maxToProcess)}\n`);

  if (candidateFilms.length === 0) {
    console.log(`✅ Tutti i film hanno già almeno ${targetCount} bloopers!`);
    return;
  }

  const batch = candidateFilms.slice(0, maxToProcess);
  let totalAdded = 0;

  for (let i = 0; i < batch.length; i++) {
    const film = batch[i];
    const countNeeded = targetCount - film.currentCount;

    console.log(`[${i + 1}/${batch.length}] 🎥 "${film.titolo}" (${film.anno || 'N/D'}) - Attuali: ${film.currentCount} bloopers | Mancanti: ${countNeeded}`);

    // Recupera descrizioni esistenti per non duplicare
    const { data: existing } = await supabase
      .from('errori')
      .select('descrizione')
      .eq('film_id', film.id);

    const descrizioni = (existing || []).map(e => e.descrizione);

    const { bloopers, modelUsed, error: genError } = await generateBloopers(film, descrizioni, countNeeded);

    if (genError || !bloopers || bloopers.length === 0) {
      console.log(`   ⚠️ Errore o nessun blooper generato: ${genError || 'vuoto'}`);
      continue;
    }

    const daInserire = bloopers.map(g => ({
      film_id: film.id,
      minuto: g.minuto || "00:00",
      categoria: g.categoria || "Errori di scena / Posizione",
      descrizione: g.descrizione,
      approvato: true,
      conferme: 0,
      contestazioni: 0,
      inserito_da: "IA (Batch Admin)",
      provenienza: "ia"
    }));

    const { error: insError } = await supabase.from('errori').insert(daInserire);

    if (insError) {
      console.log(`   ❌ Errore salvataggio DB: ${insError.message}`);
    } else {
      totalAdded += daInserire.length;
      const newTotal = film.currentCount + daInserire.length;
      console.log(`   ✅ Inseriti ${daInserire.length} nuovi bloopers (via ${modelUsed}) -> Totale film: ${newTotal} bloopers`);
    }

    // Pausa cortese per rate-limit
    if (i < batch.length - 1) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log(`\n===============================================================`);
  console.log(`🎉 BATCH COMPLETATO: Aggiunti ${totalAdded} bloopers su ${batch.length} film!`);
  console.log(`===============================================================\n`);
}

main().catch(console.error);
