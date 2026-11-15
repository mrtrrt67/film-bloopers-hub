#!/usr/bin/env node

/**
 * SYNC MISSING I18N
 * 
 * Scansiona bloopers e curiosità nel database che non hanno ancora
 * le traduzioni multilingua (it, en, es, fr, de) e le genera con Gemini.
 * 
 * Utilizzo:
 *   node scripts/sync-missing-i18n.cjs --recent=5     (Aggiorna gli ultimi 5 film inseriti)
 *   node scripts/sync-missing-i18n.cjs --film=382    (Aggiorna un film specifico per ID)
 *   node scripts/sync-missing-i18n.cjs --all         (Scansiona tutto il catalogo)
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');

// Lettura parametri CLI
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

const targetFilmId = getArg('film', null);
const recentCount = parseInt(getArg('recent', targetFilmId || hasFlag('all') ? '0' : '10'), 10);
const doAll = hasFlag('all');

// Caricamento ambiente
const envPath = path.join(__dirname, '..', '.env.local');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const k = parts[0].trim();
      const v = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      env[k] = v;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Errore: Credenziali Supabase mancanti in .env.local');
  process.exit(1);
}

if (!geminiApiKey) {
  console.error('❌ Errore: GEMINI_API_KEY mancante in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

const MODEL_CANDIDATES = [
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest'
];

function cleanAndParseJson(raw) {
  if (!raw) return null;
  const jsonMatch = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  const text = jsonMatch ? jsonMatch[0] : raw;
  try {
    return JSON.parse(text);
  } catch {
    const sanitized = text
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/```json/g, '')
      .replace(/```/g, '');
    try {
      return JSON.parse(sanitized);
    } catch {
      return null;
    }
  }
}

async function batchTranslate(items, type = 'blooper') {
  if (!items || items.length === 0) return new Map();

  const payload = items.map(it => ({
    id: String(it.id),
    text: it.text
  }));

  const prompt = `You are a professional film localization engine.
Translate the following cinema ${type} texts into Italian (it), English (en), Spanish (es), French (fr), and German (de).
Preserve cinema terminology (shot, cut, boom mic, props, continuity).

Input items:
${JSON.stringify(payload, null, 2)}

Return ONLY a valid JSON array of objects with structure:
[
  {
    "id": "item_id",
    "it": "...",
    "en": "...",
    "es": "...",
    "fr": "...",
    "de": "..."
  }
]
Do NOT output any markdown ticks or explanations.`;

  for (const model of MODEL_CANDIDATES) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      const parsed = cleanAndParseJson(response.text || '');
      if (Array.isArray(parsed) && parsed.length > 0) {
        const resMap = new Map();
        parsed.forEach(entry => {
          if (entry.id) {
            const original = items.find(x => String(x.id) === String(entry.id))?.text || '';
            resMap.set(entry.id, {
              it: entry.it?.trim() || original,
              en: entry.en ? entry.en.trim() : original,
              es: entry.es?.trim() || entry.en?.trim() || original,
              fr: entry.fr?.trim() || entry.en?.trim() || original,
              de: entry.de?.trim() || entry.en?.trim() || original,
            });
          }
        });
        return resMap;
      }
    } catch (err) {
      console.warn(`  ⚠️ Tentativo con modello ${model} non riuscito:`, err.message || err);
    }
  }

  // Fallback se falliscono tutti i modelli
  const fallbackMap = new Map();
  items.forEach(it => {
    fallbackMap.set(String(it.id), {
      it: it.text,
      en: it.text,
      es: it.text,
      fr: it.text,
      de: it.text
    });
  });
  return fallbackMap;
}

async function run() {
  console.log('================================================================');
  console.log('🌐 SINCRONIZZAZIONE TRADUZIONI MULTILINGUA (i18n)');
  console.log('================================================================');

  let filmsQuery = supabase.from('films').select('id, titolo, anno').order('id', { ascending: false });

  if (targetFilmId) {
    filmsQuery = filmsQuery.eq('id', parseInt(targetFilmId, 10));
    console.log(`🎯 Target: Film specifico con ID ${targetFilmId}`);
  } else if (recentCount > 0 && !doAll) {
    filmsQuery = filmsQuery.limit(recentCount);
    console.log(`🎯 Target: Ultimi ${recentCount} film inseriti a catalogo`);
  } else {
    console.log(`🎯 Target: TUTTI i film a catalogo`);
  }

  const { data: films, error: fErr } = await filmsQuery;
  if (fErr || !films || films.length === 0) {
    console.error('❌ Nessun film trovato:', fErr);
    return;
  }

  console.log(`📋 Trovati ${films.length} film da esaminare.\n`);

  let totalBloopersUpdated = 0;
  let totalTriviaUpdated = 0;

  for (const film of films) {
    console.log(`🎬 [${film.id}] "${film.titolo}" (${film.anno || 'N/D'}):`);

    // 1. Recupero Bloopers del film
    const { data: bloopers } = await supabase
      .from('errori')
      .select('id, descrizione, descrizione_i18n')
      .eq('film_id', film.id);

    const bloopersToTranslate = (bloopers || []).filter(
      b => !b.descrizione_i18n || !b.descrizione_i18n.en || Object.keys(b.descrizione_i18n).length < 2
    );

    if (bloopersToTranslate.length > 0) {
      console.log(`   🔸 ${bloopersToTranslate.length} bloopers senza traduzione. Traduzione in corso con Gemini...`);
      const payload = bloopersToTranslate.map(b => ({ id: b.id, text: b.descrizione }));
      const translations = await batchTranslate(payload, 'blooper');

      for (const b of bloopersToTranslate) {
        const transObj = translations.get(String(b.id));
        if (transObj) {
          const { error: updErr } = await supabase
            .from('errori')
            .update({ descrizione_i18n: transObj })
            .eq('id', b.id);
          if (!updErr) {
            totalBloopersUpdated++;
          } else {
            console.error(`      ❌ Errore salvataggio blooper ${b.id}:`, updErr.message);
          }
        }
      }
      console.log(`   ✅ Bloopers aggiornati con successo.`);
    } else {
      console.log(`   ✓ Bloopers già tradotti (${(bloopers || []).length} presenti).`);
    }

    // 2. Recupero Curiosità del film
    const { data: trivia } = await supabase
      .from('movie_trivia')
      .select('id, titolo, descrizione, titolo_i18n, descrizione_i18n')
      .eq('film_id', film.id);

    const triviaToTranslate = (trivia || []).filter(
      t => !t.descrizione_i18n || !t.descrizione_i18n.en || Object.keys(t.descrizione_i18n).length < 2
    );

    if (triviaToTranslate.length > 0) {
      console.log(`   🔸 ${triviaToTranslate.length} curiosità senza traduzione. Traduzione in corso con Gemini...`);
      
      // Traduciamo sia titolo che descrizione
      const descPayload = triviaToTranslate.map(t => ({ id: t.id, text: t.descrizione }));
      const titlePayload = triviaToTranslate.map(t => ({ id: t.id, text: t.titolo }));

      const [descTrans, titleTrans] = await Promise.all([
        batchTranslate(descPayload, 'trivia description'),
        batchTranslate(titlePayload, 'trivia title')
      ]);

      for (const t of triviaToTranslate) {
        const dObj = descTrans.get(String(t.id));
        const tObj = titleTrans.get(String(t.id));
        if (dObj) {
          const updateData = { descrizione_i18n: dObj };
          if (tObj) updateData.titolo_i18n = tObj;

          const { error: updErr } = await supabase
            .from('movie_trivia')
            .update(updateData)
            .eq('id', t.id);
          if (!updErr) {
            totalTriviaUpdated++;
          } else {
            console.error(`      ❌ Errore salvataggio curiosità ${t.id}:`, updErr.message);
          }
        }
      }
      console.log(`   ✅ Curiosità aggiornate con successo.`);
    } else {
      console.log(`   ✓ Curiosità già tradotte (${(trivia || []).length} presenti).`);
    }

    // Breve pausa anti-rate limit
    await new Promise(r => setTimeout(r, 400));
  }

  console.log('\n================================================================');
  console.log('🎉 COMPLETATO!');
  console.log(`✨ Totale Bloopers tradotti e aggiornati: ${totalBloopersUpdated}`);
  console.log(`✨ Totale Curiosità tradotte e aggiornate: ${totalTriviaUpdated}`);
  console.log('================================================================');
}

run().catch(err => {
  console.error('❌ Errore imprevisto:', err);
  process.exit(1);
});
