/**
 * Script batch intelligente per la traduzione del catalogo storico (Bloopers & Curiosità).
 *
 * Utilizzo:
 *   node scripts/translate_catalog_i18n.cjs --limit=10
 *   node scripts/translate_catalog_i18n.cjs --filmId=77
 *   node scripts/translate_catalog_i18n.cjs --all
 *   node scripts/translate_catalog_i18n.cjs --only=bloopers --limit=50
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');

function getEnv() {
  const env = {};
  for (const file of ['.env.staging', '.env.local', '.env']) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      content.split('\n').forEach((line) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          let value = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
          if (!env[match[1]]) env[match[1]] = value;
        }
      });
    }
  }
  return env;
}

const env = getEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseKey = serviceKey || anonKey;
const geminiApiKey = env.GEMINI_API_KEY;

if (!supabaseUrl || !geminiApiKey) {
  console.error('❌ Errore: Variabili NEXT_PUBLIC_SUPABASE_URL o GEMINI_API_KEY mancanti.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

// Parsing argomenti CLI
const args = process.argv.slice(2);
let limit = 20;
let targetFilmId = null;
let onlyType = null; // 'bloopers' | 'trivia' | null
let processAll = false;

args.forEach((arg) => {
  if (arg.startsWith('--limit=')) limit = parseInt(arg.split('=')[1], 10);
  if (arg.startsWith('--filmId=')) targetFilmId = parseInt(arg.split('=')[1], 10);
  if (arg.startsWith('--only=')) onlyType = arg.split('=')[1];
  if (arg === '--all') processAll = true;
});

const SQL_BACKUP_PATH = path.join(__dirname, '..', 'backups', 'translated_i18n_data.sql');

function appendSql(sqlLine) {
  if (!fs.existsSync(path.dirname(SQL_BACKUP_PATH))) {
    fs.mkdirSync(path.dirname(SQL_BACKUP_PATH), { recursive: true });
  }
  fs.appendFileSync(SQL_BACKUP_PATH, sqlLine + '\n', 'utf8');
}

function escapeSql(str) {
  if (!str) return "''";
  return "'" + str.replace(/'/g, "''") + "'";
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function translateBatchWithGemini(items, type = 'blooper') {
  const payload = items.map((it) => ({
    id: String(it.id),
    text: it.text,
  }));

  const prompt = `You are a professional film translation engine.
Translate the following cinema ${type} items into Italian (it), English (en), Spanish (es), French (fr), and German (de).
Preserve natural cinema terminology (shot/cut/boom mic/props/stunt).

Input items:
${JSON.stringify(payload, null, 2)}

Return ONLY a valid JSON array of objects with the exact structure:
[
  {
    "id": "${payload[0] ? payload[0].id : '1'}",
    "it": "...",
    "en": "...",
    "es": "...",
    "fr": "...",
    "de": "..."
  }
]
Do NOT include markdown formatting or explanations.`;

  for (const model of ['gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-flash-latest']) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      const raw = res.text || '';
      const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const jsonMatch = clean.match(/\[[\s\S]*\]/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]);
      const map = new Map();
      if (Array.isArray(parsed)) {
        parsed.forEach((p) => {
          if (p.id) {
            const original = items.find((x) => String(x.id) === String(p.id))?.text || '';
            map.set(String(p.id), {
              it: (p.it || original).trim(),
              en: (p.en || original).trim(),
              es: (p.es || p.en || original).trim(),
              fr: (p.fr || p.en || original).trim(),
              de: (p.de || p.en || original).trim(),
            });
          }
        });
        return map;
      }
    } catch (err) {
      console.warn(`Tentativo modello ${model} fallito:`, err?.message || err);
    }
  }

  return null;
}

async function run() {
  console.log('====================================================');
  console.log('🎬 FilmBloopers Hub - Batch Localization Translator');
  console.log('====================================================');
  console.log(`Database URL:    ${supabaseUrl}`);
  console.log(`Modalità auth:   ${serviceKey ? 'Service Role Key (Bypass RLS)' : 'Anon Key (SQL backup)'}`);
  console.log(`Output SQL:      ${SQL_BACKUP_PATH}`);
  console.log(`Filtri:          Film ID: ${targetFilmId || 'Tutti'} | Limite: ${processAll ? 'Nessuno (--all)' : limit}`);
  console.log('====================================================\n');

  let totalBloopersDone = 0;
  let totalTriviaDone = 0;

  // 1. ELABORAZIONE BLOOPERS
  if (!onlyType || onlyType === 'bloopers') {
    console.log('--- 1. Traduzione Bloopers (Tabella errori) ---');
    let lastId = 0;
    let keepGoing = true;

    while (keepGoing) {
      let query = supabase
        .from('errori')
        .select('id, film_id, descrizione, descrizione_i18n')
        .gt('id', lastId)
        .order('id', { ascending: true })
        .limit(30);

      if (targetFilmId) {
        query = query.eq('film_id', targetFilmId);
      }

      const { data: rows, error } = await query;
      if (error) {
        console.error('Errore lettura errori:', error.message);
        break;
      }

      if (!rows || rows.length === 0) {
        console.log('Nessun altro blooper trovato nella scansione.');
        break;
      }

      lastId = rows[rows.length - 1].id;

      // Filtra quelli che non hanno ancora traduzione completa
      const needsTrans = rows.filter((r) => {
        const i18n = r.descrizione_i18n;
        return !i18n || typeof i18n !== 'object' || !i18n.en || !i18n.es;
      });

      if (needsTrans.length === 0) {
        continue;
      }

      // Traduciamo a gruppi di 6
      const chunk = needsTrans.slice(0, 6);
      const items = chunk.map((c) => ({ id: c.id, text: c.descrizione }));
      const transMap = await translateBatchWithGemini(items, 'blooper');

      if (transMap) {
        for (const item of items) {
          const trans = transMap.get(String(item.id));
          if (trans) {
            // Genera SQL per migrazione
            const sql = `UPDATE errori SET descrizione_i18n = ${escapeSql(JSON.stringify(trans))}::jsonb WHERE id = ${item.id};`;
            appendSql(sql);

            // Se abbiamo serviceKey proviamo update live
            if (serviceKey) {
              await supabase.from('errori').update({ descrizione_i18n: trans }).eq('id', item.id);
            }

            totalBloopersDone++;
            console.log(`  ✓ Blooper #${item.id} -> EN: "${trans.en.slice(0, 60)}..."`);
          }
        }
      } else {
        console.log('  ⚠️ Risposta vuota da Gemini, attesa 2s...');
        await sleep(2000);
      }

      if (!processAll && totalBloopersDone >= limit) {
        console.log(`Raggiunto limite configurato di ${limit} bloopers.`);
        break;
      }

      await sleep(500);
    }
  }

  // 2. ELABORAZIONE TRIVIA
  if (!onlyType || onlyType === 'trivia') {
    console.log('\n--- 2. Traduzione Curiosità (Tabella movie_trivia) ---');
    let lastCreatedAt = null;
    let keepGoing = true;

    while (keepGoing) {
      let query = supabase
        .from('movie_trivia')
        .select('id, film_id, titolo, descrizione, titolo_i18n, descrizione_i18n, created_at')
        .order('created_at', { ascending: true })
        .limit(30);

      if (targetFilmId) {
        query = query.eq('film_id', targetFilmId);
      }
      if (lastCreatedAt) {
        query = query.gt('created_at', lastCreatedAt);
      }

      const { data: rows, error } = await query;
      if (error) {
        console.error('Errore lettura movie_trivia:', error.message);
        break;
      }

      if (!rows || rows.length === 0) {
        console.log('Nessuna altra curiosità trovata nella scansione.');
        break;
      }

      lastCreatedAt = rows[rows.length - 1].created_at;

      const needsTrans = rows.filter((r) => {
        const i18n = r.descrizione_i18n;
        return !i18n || typeof i18n !== 'object' || !i18n.en || !i18n.es;
      });

      if (needsTrans.length === 0) {
        continue;
      }

      const chunk = needsTrans.slice(0, 6);
      const items = chunk.map((c) => ({
        id: c.id,
        text: `${c.titolo} ||| ${c.descrizione}`,
      }));

      const transMap = await translateBatchWithGemini(items, 'trivia');

      if (transMap) {
        for (const r of chunk) {
          const trans = transMap.get(String(r.id));
          if (trans) {
            const titleI18n = {};
            const descI18n = {};

            for (const lang of ['it', 'en', 'es', 'fr', 'de']) {
              const full = trans[lang] || '';
              const parts = full.split('|||');
              titleI18n[lang] = (parts[0] || r.titolo).trim();
              descI18n[lang] = (parts[1] || parts[0] || r.descrizione).trim();
            }

            const sql = `UPDATE movie_trivia SET titolo_i18n = ${escapeSql(JSON.stringify(titleI18n))}::jsonb, descrizione_i18n = ${escapeSql(JSON.stringify(descI18n))}::jsonb WHERE id = ${escapeSql(String(r.id))};`;
            appendSql(sql);

            if (serviceKey) {
              await supabase
                .from('movie_trivia')
                .update({ titolo_i18n: titleI18n, descrizione_i18n: descI18n })
                .eq('id', r.id);
            }

            totalTriviaDone++;
            console.log(`  ✓ Trivia #${r.id} -> EN Title: "${titleI18n.en}"`);
          }
        }
      } else {
        console.log('  ⚠️ Risposta vuota da Gemini, attesa 2s...');
        await sleep(2000);
      }

      if (!processAll && totalTriviaDone >= limit) {
        console.log(`Raggiunto limite configurato di ${limit} curiosità.`);
        break;
      }

      await sleep(500);
    }
  }

  console.log('\n====================================================');
  console.log('✅ OPERAZIONE COMPLETATA');
  console.log(`Bloopers tradotti: ${totalBloopersDone}`);
  console.log(`Curiosità tradotte: ${totalTriviaDone}`);
  console.log(`File SQL salvato in: ${SQL_BACKUP_PATH}`);
  console.log('====================================================\n');
}

run().catch(console.error);
