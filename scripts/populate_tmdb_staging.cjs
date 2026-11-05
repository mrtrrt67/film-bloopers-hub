const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
let env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const k = trimmed.substring(0, idx).trim();
      const v = trimmed.substring(idx + 1).trim().replace(/^["'](.*)["']$/, '$1');
      env[k] = v;
    }
  });
}

const stagingUrl = process.env.STAGING_SUPABASE_URL || 'https://hktzscarmerpbgxgxliq.supabase.co';
const stagingKey = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || process.env.STAGING_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrdHpzY2FybWVycGJneGd4bGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MzE2MTcsImV4cCI6MjEwODUwNzYxN30.ufFb1-mVRGD0RU03gaeCghzdnRtbucCaU4LuBvymFZs';
const tmdbApiKey = process.env.TMDB_API_KEY || env.TMDB_API_KEY || '8265bd1679663a7ea12ac168da84d2e8';

const supabase = createClient(stagingUrl, stagingKey, {
  auth: { persistSession: false }
});

const TMDB_API_BASE = 'https://api.themoviedb.org/3';

const languages = [
  { code: 'it', tmdb: 'it-IT' },
  { code: 'en', tmdb: 'en-US' },
  { code: 'es', tmdb: 'es-ES' },
  { code: 'fr', tmdb: 'fr-FR' },
  { code: 'de', tmdb: 'de-DE' },
];

function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function resolveTmdbId(title, year) {
  try {
    const cleanTitle = title.replace(/\(.*?\)/g, '').trim();
    let url = `${TMDB_API_BASE}/search/multi?api_key=${tmdbApiKey}&query=${encodeURIComponent(cleanTitle)}&language=it-IT`;
    if (year) url += `&year=${year}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return { id: data.results[0].id, mediaType: data.results[0].media_type || 'movie' };
      }
    }
  } catch (e) {}
  return null;
}

async function fetchTMDBData(tmdbId, isTv = false) {
  const endpoint = isTv ? 'tv' : 'movie';
  const titoli = {};
  const trame = {};

  await Promise.all(
    languages.map(async ({ code, tmdb }) => {
      try {
        const url = `${TMDB_API_BASE}/${endpoint}/${tmdbId}?api_key=${tmdbApiKey}&language=${tmdb}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const title = data.title || data.name || data.original_title || '';
          const overview = data.overview || '';
          if (title) titoli[code] = title;
          if (overview) trame[code] = overview;
        }
      } catch (err) {}
    })
  );

  return { titoli, trame };
}

async function run() {
  console.log(`=======================================================`);
  console.log(`POPOLAMENTO TITOLI E TRAME TMDB (STAGING)`);
  console.log(`Target: ${stagingUrl}`);
  console.log(`=======================================================\n`);

  const { data: films, error } = await supabase
    .from('films')
    .select('id, titolo, anno, trama, tmdb_id')
    .order('id', { ascending: true });

  if (error || !films) {
    console.error('Errore lettura films:', error);
    process.exit(1);
  }

  console.log(`Trovati ${films.length} film a catalogo.`);

  let sqlStatements = `-- =========================================================================\n`;
  sqlStatements += `-- AGGIORNAMENTO TITOLI E TRAME MULTILINGUE DA TMDB\n`;
  sqlStatements += `-- Esegui questo script nell'SQL Editor di Supabase Staging\n`;
  sqlStatements += `-- =========================================================================\n\n`;

  let processed = 0;
  let matchedCount = 0;

  for (const film of films) {
    processed++;
    let tmdbId = film.tmdb_id;
    let isTv = false;

    if (!tmdbId) {
      const match = await resolveTmdbId(film.titolo, film.anno);
      if (match) {
        tmdbId = match.id;
        isTv = match.mediaType === 'tv';
      }
    }

    if (!tmdbId) {
      console.log(`[${processed}/${films.length}] "${film.titolo}": Non trovato su TMDB.`);
      continue;
    }

    try {
      const { titoli, trame } = await fetchTMDBData(tmdbId, isTv);
      if (!titoli.it && film.titolo) titoli.it = film.titolo;
      if (!trame.it && film.trama) trame.it = film.trama;

      matchedCount++;
      sqlStatements += `UPDATE public.films SET tmdb_id = ${tmdbId}, titoli_i18n = ${escapeSqlValue(titoli)}, trame_i18n = ${escapeSqlValue(trame)} WHERE id = ${film.id};\n`;

      if (matchedCount % 20 === 0 || processed === films.length) {
        console.log(`[${processed}/${films.length}] Trovati e tradotti ${matchedCount} film...`);
      }

      await new Promise(r => setTimeout(r, 60));
    } catch (err) {
      console.warn(`Errore film ${film.id}:`, err.message);
    }
  }

  const outSqlPath = path.join(__dirname, '..', 'backups', 'populate_films_tmdb_i18n.sql');
  fs.writeFileSync(outSqlPath, sqlStatements, 'utf8');

  console.log(`\n=======================================================`);
  console.log(`COMPLETATO CON SUCCESSO!`);
  console.log(`Film totali: ${processed}`);
  console.log(`Film con traduzioni TMDB trovate: ${matchedCount}`);
  console.log(`File SQL generato per Staging: ${outSqlPath}`);
  console.log(`=======================================================\n`);
}

run();
