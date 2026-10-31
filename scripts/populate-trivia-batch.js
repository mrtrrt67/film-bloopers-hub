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
  console.log("   node scripts/populate-trivia-batch.js <numero_film> <GEMINI_API_KEY>\n");
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

async function generateTrivia(film) {
  const prompt = `Sei un esperto enciclopedico di storia del cinema, retroscena e aneddoti di produzione cinematografica.

DATI UFFICIALI DEL FILM:
- Titolo: "${film.titolo}" (${film.anno || "N/D"})
- Regia: ${film.regista || "N/D"}
- Cast: ${film.attori || "N/D"}
- Sinossi: ${film.trama || "N/D"}

COMPITO:
Trova ESATTAMENTE 3 curiosità autentiche, aneddoti inediti dal set o dettagli di backstage affascinanti e documentati su questo film.

Le categorie ammesse sono ESCLUSIVAMENTE:
1. "Aneddoti dal set"
2. "Casting & Ruoli"
3. "Effetti Speciali & Trucco"
4. "Record & Curiosità"

REGOLE TASSATIVE:
- Restituisci ESCLUSIVAMENTE un array JSON valido, senza testo introduttivo né commenti markdown.
- Il campo "titolo" deve essere breve ed accattivante (max 8 parole).
- Il campo "descrizione" deve spiegare l'aneddoto in modo coinvolgente ed esaustivo in italiano (2-4 frasi).
- Il campo "fonte" deve citare l'origine dell'aneddoto (es. "Intervista al regista", "Making-of", "Commento audio DVD").

FORMATO OUTPUT:
[
  {
    "categoria": "Aneddoti dal set",
    "titolo": "L'improvvisazione memorabile durante la scena madre",
    "descrizione": "Durante le riprese della celebre sequenza, l'attore protagonista ha improvvisato la battuta iconica cogliendo di sorpresa l'intero cast. Il regista decise sul momento di tenere quel ciak nel montaggio finale.",
    "fonte": "Making-of ufficiale"
  }
]`;

  for (const model of DEFAULT_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const text = response.text?.trim() || "";
      if (!text) continue;

      const parsed = cleanAndParseJson(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { trivia: parsed, modelUsed: model };
      }
    } catch (err) {
      // Prova il prossimo modello
    }
  }

  return { trivia: [], error: "Nessun modello ha generato curiosità valide" };
}

async function main() {
  const maxToProcess = parseInt(process.argv[2], 10) || 5;

  console.log(`\n===============================================================`);
  console.log(`✨ AVVIO BATCH GENERAZIONE CURIOSITÀ FILM CON IA`);
  console.log(`===============================================================`);

  const { data: allFilms, error } = await supabase
    .from('films')
    .select('id, titolo, anno, regista, attori, trama, movie_trivia(count)')
    .order('id', { ascending: true });

  if (error) {
    console.error("❌ Errore recupero film:", error);
    return;
  }

  const candidateFilms = (allFilms || []).filter(f => (f.movie_trivia?.[0]?.count || 0) === 0);

  console.log(`📊 Film totali nel database: ${allFilms.length}`);
  console.log(`✨ Film ancora senza curiosità: ${candidateFilms.length}`);
  console.log(`⚡ Film da elaborare in questa sessione: ${Math.min(candidateFilms.length, maxToProcess)}\n`);

  if (candidateFilms.length === 0) {
    console.log(`✅ Tutti i film del catalogo hanno già almeno una curiosità!`);
    return;
  }

  const batch = candidateFilms.slice(0, maxToProcess);
  let totalAdded = 0;

  for (let i = 0; i < batch.length; i++) {
    const film = batch[i];
    console.log(`[${i + 1}/${batch.length}] 🎥 "${film.titolo}" (${film.anno || 'N/D'}) - Generazione curiosità in corso...`);

    const { trivia, modelUsed, error: genError } = await generateTrivia(film);

    if (genError || !trivia || trivia.length === 0) {
      console.log(`   ⚠️ Errore o nessuna curiosità generata: ${genError || 'vuoto'}`);
      continue;
    }

    const daInserire = trivia.map((g, idx) => ({
      film_id: film.id,
      categoria: g.categoria || "Aneddoti dal set",
      titolo: g.titolo || "Curiosità dal set",
      descrizione: g.descrizione || "",
      fonte: g.fonte || "Dietro le quinte",
      approvato: true,
      inserito_da: "IA (Batch Admin)",
      provenienza: "ia",
      likes: Math.floor(Math.random() * 8) + 1,
      ordine: idx + 1,
    }));

    const { error: insError } = await supabase.from('movie_trivia').insert(daInserire);

    if (insError) {
      console.log(`   ❌ Errore salvataggio DB: ${insError.message}`);
    } else {
      totalAdded += daInserire.length;
      console.log(`   ✅ Inserite ${daInserire.length} nuove curiosità (via ${modelUsed})`);
    }

    // Pausa di 3 secondi tra una chiamata e l'altra per rimanere sotto i 15 RPM
    if (i < batch.length - 1) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log(`\n===============================================================`);
  console.log(`🎉 BATCH COMPLETATO: Generate ${totalAdded} curiosità su ${batch.length} film!`);
  console.log(`===============================================================\n`);
}

main().catch(console.error);

