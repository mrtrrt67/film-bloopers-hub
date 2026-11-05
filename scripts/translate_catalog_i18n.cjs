/**
 * Script batch per la traduzione completa dell'archivio (Bloopers & Curiosità)
 * Genera il file SQL complessivo `backups/translated_i18n_data.sql`
 * e suddivide automaticamente in parti leggere (max 500-600 query) per Supabase.
 *
 * Utilizzo:
 *   node scripts/translate_catalog_i18n.cjs
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
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const geminiApiKey = env.GEMINI_API_KEY;

if (!supabaseUrl || !geminiApiKey) {
  console.error('❌ Errore: Variabili NEXT_PUBLIC_SUPABASE_URL o GEMINI_API_KEY mancanti.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

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

function loadAlreadyTranslatedIds() {
  const blooperIds = new Set();
  const triviaIds = new Set();

  if (fs.existsSync(SQL_BACKUP_PATH)) {
    const lines = fs.readFileSync(SQL_BACKUP_PATH, 'utf8').split('\n');
    for (const line of lines) {
      const bMatch = line.match(/UPDATE errori SET .* WHERE id = (\d+);/);
      if (bMatch) blooperIds.add(parseInt(bMatch[1], 10));

      const tMatch = line.match(/UPDATE movie_trivia SET .* WHERE id = '([^']+)';/);
      if (tMatch) triviaIds.add(tMatch[1]);
    }
  }

  return { blooperIds, triviaIds };
}

function splitIntoParts() {
  console.log('\n--- Generazione parti SQL suddivise (max 500 query ciascuna) ---');
  if (!fs.existsSync(SQL_BACKUP_PATH)) return;

  const content = fs.readFileSync(SQL_BACKUP_PATH, 'utf8');
  const lines = content.split('\n').filter((l) => l.trim().startsWith('UPDATE'));

  const bloopers = lines.filter((l) => l.includes('UPDATE errori'));
  const trivia = lines.filter((l) => l.includes('UPDATE movie_trivia'));

  const CHUNK_SIZE = 500;

  // Bloopers: dividiamo a blocchi
  let bPart = 1;
  for (let i = 0; i < bloopers.length; i += CHUNK_SIZE) {
    const chunk = bloopers.slice(i, i + CHUNK_SIZE);
    const fileName = `part_bloopers_${bPart}_(${i + 1}-${i + chunk.length}).sql`;
    const filePath = path.join(__dirname, '..', 'backups', fileName);
    fs.writeFileSync(
      filePath,
      `-- Bloopers Parte ${bPart}: Record da ${i + 1} a ${i + chunk.length}\n\n` + chunk.join('\n') + '\n',
      'utf8'
    );
    console.log(`  ✓ Creato: backups/${fileName} (${chunk.length} query)`);
    bPart++;
  }

  // Trivia: dividiamo a blocchi
  let tPart = 1;
  for (let i = 0; i < trivia.length; i += CHUNK_SIZE) {
    const chunk = trivia.slice(i, i + CHUNK_SIZE);
    const fileName = `part_trivia_${tPart}_(${i + 1}-${i + chunk.length}).sql`;
    const filePath = path.join(__dirname, '..', 'backups', fileName);
    fs.writeFileSync(
      filePath,
      `-- Curiosità Parte ${tPart}: Record da ${i + 1} a ${i + chunk.length}\n\n` + chunk.join('\n') + '\n',
      'utf8'
    );
    console.log(`  ✓ Creato: backups/${fileName} (${chunk.length} query)`);
    tPart++;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function translateBatchWithGemini(items, type = 'blooper', retryCount = 0) {
  const payload = items.map((it) => ({
    id: String(it.id),
    text: it.text,
  }));

  const prompt = `You are a professional film localization engine.
Translate the following cinema ${type} descriptions into Italian (it), English (en), Spanish (es), French (fr), and German (de).
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
      if (err?.status === 429 && retryCount < 4) {
        console.warn(`[Quota 429] Attesa 6s prima di riprovare...`);
        await sleep(6000);
        return translateBatchWithGemini(items, type, retryCount + 1);
      }
      console.warn(`Tentativo modello ${model} fallito:`, err?.message || err);
    }
  }

  return null;
}

async function run() {
  console.log('====================================================');
  console.log('🎬 FilmBloopers Hub - Generazione File SQL Multilingua');
  console.log('====================================================');
  console.log(`Database:     ${supabaseUrl}`);
  console.log(`Output SQL:   ${SQL_BACKUP_PATH}`);
  console.log('====================================================\n');

  const { blooperIds, triviaIds } = loadAlreadyTranslatedIds();
  console.log(`ℹ️ Record già memorizzati: ${blooperIds.size} bloopers, ${triviaIds.size} curiosità.\n`);

  const { count: totalBloopers } = await supabase.from('errori').select('id', { count: 'exact', head: true });
  const { count: totalTrivia } = await supabase.from('movie_trivia').select('id', { count: 'exact', head: true });

  console.log(`Totale bloopers a database:  ${totalBloopers} (Mancanti da tradurre: ${totalBloopers - blooperIds.size})`);
  console.log(`Totale curiosità a database: ${totalTrivia} (Mancanti da tradurre: ${totalTrivia - triviaIds.size})\n`);

  let bloopersAdded = 0;
  let triviaAdded = 0;

  // 1. TRADUZIONE BLOOPERS
  console.log('--- Inizio Traduzione Bloopers Mancanti ---');
  let lastId = 0;
  let keepGoingBloopers = true;

  while (keepGoingBloopers) {
    const { data: rows, error } = await supabase
      .from('errori')
      .select('id, film_id, descrizione')
      .gt('id', lastId)
      .order('id', { ascending: true })
      .limit(60);

    if (error || !rows || rows.length === 0) {
      console.log('\nScansione bloopers completata.');
      break;
    }

    lastId = rows[rows.length - 1].id;

    // Filtra quelli già presenti nel file SQL
    const toTranslate = rows.filter((r) => !blooperIds.has(r.id) && r.descrizione && r.descrizione.trim());

    if (toTranslate.length === 0) continue;

    // Lotti da 8 per Gemini
    for (let i = 0; i < toTranslate.length; i += 8) {
      const chunk = toTranslate.slice(i, i + 8);
      const items = chunk.map((c) => ({ id: c.id, text: c.descrizione }));
      const transMap = await translateBatchWithGemini(items, 'blooper');

      if (transMap) {
        for (const item of items) {
          const trans = transMap.get(String(item.id));
          if (trans) {
            const sql = `UPDATE errori SET descrizione_i18n = ${escapeSql(JSON.stringify(trans))}::jsonb WHERE id = ${item.id};`;
            appendSql(sql);
            blooperIds.add(item.id);
            bloopersAdded++;
          }
        }
        process.stdout.write(`\r[Bloopers: ${blooperIds.size}/${totalBloopers} - ${Math.round((blooperIds.size / totalBloopers) * 100)}%]`);
      } else {
        await sleep(2000);
      }
      await sleep(250);
    }
  }

  console.log(`\n✅ Bloopers completati. Nuove traduzioni aggiunte: ${bloopersAdded}\n`);

  // 2. TRADUZIONE CURIOSITÀ
  console.log('--- Inizio Traduzione Curiosità Mancanti ---');
  let triviaOffset = 0;
  let keepGoingTrivia = true;

  while (keepGoingTrivia) {
    const { data: rows, error } = await supabase
      .from('movie_trivia')
      .select('id, film_id, titolo, descrizione')
      .order('id', { ascending: true })
      .range(triviaOffset, triviaOffset + 59);

    if (error || !rows || rows.length === 0) {
      console.log('\nScansione curiosità completata.');
      break;
    }

    triviaOffset += rows.length;

    const toTranslate = rows.filter(
      (r) => !triviaIds.has(r.id) && r.titolo && r.titolo.trim() && r.descrizione && r.descrizione.trim()
    );

    if (toTranslate.length === 0) continue;

    for (let i = 0; i < toTranslate.length; i += 8) {
      const chunk = toTranslate.slice(i, i + 8);
      const items = chunk.map((c) => ({
        id: c.id,
        text: `${c.titolo.trim()} ||| ${c.descrizione.trim()}`,
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
            triviaIds.add(r.id);
            triviaAdded++;
          }
        }
        process.stdout.write(`\r[Curiosità: ${triviaIds.size}/${totalTrivia} - ${Math.round((triviaIds.size / totalTrivia) * 100)}%]`);
      } else {
        await sleep(2000);
      }
      await sleep(250);
    }
  }

  console.log(`\n✅ Curiosità completate. Nuove traduzioni aggiunte: ${triviaAdded}\n`);

  // Esegue suddivisione in parti
  splitIntoParts();

  console.log('\n====================================================');
  console.log('🎉 TUTTO IL CATALOGO È STATO COMPLETAMENTE TRADOTTO!');
  console.log(`Totale bloopers:   ${blooperIds.size} / ${totalBloopers}`);
  console.log(`Totale curiosità:  ${triviaIds.size} / ${totalTrivia}`);
  console.log('Tutti i file suddivisi sono disponibili nella cartella backups/');
  console.log('====================================================\n');
}

run().catch(console.error);
