/**
 * Script di allineamento automatico 1-click da STAGING a PRODUZIONE
 * Sincronizza:
 *   1. Films (titoli_i18n, trame_i18n, posters_i18n)
 *   2. Bloopers (descrizione_i18n)
 *   3. Curiosità (titolo_i18n, descrizione_i18n)
 *
 * Utilizzo:
 *   node scripts/sync_staging_to_prod.cjs
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  const env = {};
  for (const f of ['.env.staging', '.env.local', '.env']) {
    if (fs.existsSync(f)) {
      fs.readFileSync(f, 'utf8').split('\n').forEach(line => {
        const idx = line.indexOf('=');
        if (idx > 0 && !line.trim().startsWith('#')) {
          const k = line.substring(0, idx).trim();
          const v = line.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
          if (!env[k]) env[k] = v;
        }
      });
    }
  }
  return env;
}

const env = loadEnv();

// STAGING (Sorgente)
const stagingUrl = 'https://hktzscarmerpbgxgxliq.supabase.co';
const stagingAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrdHpzY2FybWVycGJneGd4bGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MzE2MTcsImV4cCI6MjEwODUwNzYxN30.ufFb1-mVRGD0RU03gaeCghzdnRtbucCaU4LuBvymFZs';

// PRODUZIONE (Destinazione)
const prodUrl = env.PROD_SUPABASE_URL || 'https://gmiwhscbqvadnlqruhjs.supabase.co';
const prodServiceKey = env.PROD_SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!prodServiceKey) {
  console.error('\n❌ ERRORE: Chiave di servizio di produzione non trovata.');
  console.error('Incolla la tua SUPABASE_SERVICE_ROLE_KEY in .env.local prima di lanciare lo script.\n');
  process.exit(1);
}

const staging = createClient(stagingUrl, stagingAnonKey, { auth: { persistSession: false } });
const prod = createClient(prodUrl, prodServiceKey, { auth: { persistSession: false } });

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function fetchAll(client, table, selectCols) {
  let all = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await client
      .from(table)
      .select(selectCols)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error || !data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < pageSize) hasMore = false;
    else page++;
  }
  return all;
}

async function syncFilms() {
  console.log('\n--- 1. SINCRONIZZAZIONE FILM ---');
  const films = await fetchAll(staging, 'films', 'id, titoli_i18n, trame_i18n, posters_i18n');
  const toUpdate = films.filter(f => f.titoli_i18n && Object.keys(f.titoli_i18n).length > 0);
  console.log(`Trovati ${toUpdate.length} film con traduzioni su Staging.`);

  let updated = 0;
  for (const f of toUpdate) {
    const { error } = await prod
      .from('films')
      .update({
        titoli_i18n: f.titoli_i18n,
        trame_i18n: f.trame_i18n || {},
        posters_i18n: f.posters_i18n || {},
      })
      .eq('id', f.id);

    if (!error) updated++;
    else console.warn(`Errore update film ${f.id}:`, error.message);

    if (updated % 50 === 0 || updated === toUpdate.length) {
      process.stdout.write(`\r  [Film aggiornati: ${updated}/${toUpdate.length}]`);
    }
  }
  console.log(`\n✅ Film completati: ${updated} aggiornati in Produzione.`);
}

async function syncBloopers() {
  console.log('\n--- 2. SINCRONIZZAZIONE BLOOPERS ---');
  const bloopers = await fetchAll(staging, 'errori', 'id, descrizione_i18n');
  const toUpdate = bloopers.filter(b => b.descrizione_i18n && b.descrizione_i18n.en);
  console.log(`Trovati ${toUpdate.length} bloopers con traduzioni su Staging.`);

  let updated = 0;
  const BATCH = 25;
  for (let i = 0; i < toUpdate.length; i += BATCH) {
    const chunk = toUpdate.slice(i, i + BATCH);
    await Promise.all(
      chunk.map(async b => {
        const { error } = await prod
          .from('errori')
          .update({ descrizione_i18n: b.descrizione_i18n })
          .eq('id', b.id);
        if (!error) updated++;
      })
    );
    process.stdout.write(`\r  [Bloopers aggiornati: ${updated}/${toUpdate.length}]`);
    await sleep(40);
  }
  console.log(`\n✅ Bloopers completati: ${updated} aggiornati in Produzione.`);
}

async function syncTrivia() {
  console.log('\n--- 3. SINCRONIZZAZIONE CURIOSITÀ ---');
  const trivia = await fetchAll(staging, 'movie_trivia', 'id, titolo_i18n, descrizione_i18n');
  const toUpdate = trivia.filter(t => t.descrizione_i18n && t.descrizione_i18n.en);
  console.log(`Trovate ${toUpdate.length} curiosità con traduzioni su Staging.`);

  let updated = 0;
  const BATCH = 25;
  for (let i = 0; i < toUpdate.length; i += BATCH) {
    const chunk = toUpdate.slice(i, i + BATCH);
    await Promise.all(
      chunk.map(async t => {
        const { error } = await prod
          .from('movie_trivia')
          .update({
            titolo_i18n: t.titolo_i18n || {},
            descrizione_i18n: t.descrizione_i18n,
          })
          .eq('id', t.id);
        if (!error) updated++;
      })
    );
    process.stdout.write(`\r  [Curiosità aggiornate: ${updated}/${toUpdate.length}]`);
    await sleep(40);
  }
  console.log(`\n✅ Curiosità completate: ${updated} aggiornate in Produzione.`);
}

async function run() {
  console.log('=======================================================');
  console.log('🚀 ALLINEAMENTO AUTOMATICO STAGING ➔ PRODUZIONE');
  console.log('Sorgente:      ' + stagingUrl);
  console.log('Destinazione:  ' + prodUrl);
  console.log('=======================================================');

  await syncFilms();
  await syncBloopers();
  await syncTrivia();

  console.log('\n=======================================================');
  console.log('🎉 ALLINEAMENTO COMPLETATO CON SUCCESSO!');
  console.log('=======================================================\n');
}

run().catch(console.error);

