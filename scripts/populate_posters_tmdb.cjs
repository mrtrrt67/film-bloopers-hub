const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const stagingUrl = process.env.STAGING_SUPABASE_URL || 'https://hktzscarmerpbgxgxliq.supabase.co';
const stagingKey = process.env.STAGING_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrdHpzY2FybWVycGJneGd4bGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MzE2MTcsImV4cCI6MjEwODUwNzYxN30.ufFb1-mVRGD0RU03gaeCghzdnRtbucCaU4LuBvymFZs';
const tmdbApiKey = process.env.TMDB_API_KEY || '8265bd1679663a7ea12ac168da84d2e8';

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
  if (val === null || val === undefined) return "'{}'::jsonb";
  return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
}

async function fetchPosters(tmdbId) {
  const posters = {};

  await Promise.all(
    languages.map(async ({ code, tmdb }) => {
      try {
        const url = `${TMDB_API_BASE}/movie/${tmdbId}?api_key=${tmdbApiKey}&language=${tmdb}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.poster_path) {
            posters[code] = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
          }
        }
      } catch (err) {}
    })
  );

  return posters;
}

async function run() {
  console.log(`=======================================================`);
  console.log(`ESTRAZIONE LOCANDINE MULTILINGUE TMDB (STAGING)`);
  console.log(`Target: ${stagingUrl}`);
  console.log(`=======================================================\n`);

  const { data: films, error } = await supabase
    .from('films')
    .select('id, titolo, tmdb_id, poster_url')
    .order('id', { ascending: true });

  if (error || !films) {
    console.error('Errore lettura films:', error);
    process.exit(1);
  }

  console.log(`Trovati ${films.length} film a catalogo.`);

  let sqlStatements = `-- =========================================================================\n`;
  sqlStatements += `-- AGGIORNAMENTO LOCANDINE (POSTERS) MULTILINGUE DA TMDB\n`;
  sqlStatements += `-- Esegui questo script nell'SQL Editor di Supabase Staging\n`;
  sqlStatements += `-- =========================================================================\n\n`;
  sqlStatements += `ALTER TABLE public.films ADD COLUMN IF NOT EXISTS posters_i18n JSONB DEFAULT '{}'::jsonb;\n\n`;

  let processed = 0;
  let withPostersCount = 0;

  for (const film of films) {
    processed++;
    const tmdbId = film.tmdb_id;

    if (!tmdbId) {
      // Se non ha tmdb_id, usa il poster originale per tutte le lingue
      if (film.poster_url) {
        const fallback = { it: film.poster_url, en: film.poster_url };
        sqlStatements += `UPDATE public.films SET posters_i18n = ${escapeSqlValue(fallback)} WHERE id = ${film.id};\n`;
      }
      continue;
    }

    try {
      const posters = await fetchPosters(tmdbId);
      
      // Fallback per l'italiano o se qualche lingua manca
      if (!posters.it && film.poster_url) posters.it = film.poster_url;
      if (!posters.en && (posters.it || film.poster_url)) posters.en = posters.it || film.poster_url;

      if (Object.keys(posters).length > 0) {
        withPostersCount++;
        sqlStatements += `UPDATE public.films SET posters_i18n = ${escapeSqlValue(posters)} WHERE id = ${film.id};\n`;
      }

      if (processed % 25 === 0 || processed === films.length) {
        console.log(`[${processed}/${films.length}] Elaborati ${withPostersCount} film con locandine...`);
      }

      // Piccolo throttle per non saturare rate limit TMDB
      await new Promise(r => setTimeout(r, 40));
    } catch (err) {
      console.warn(`Errore film ${film.id}:`, err.message);
    }
  }

  const outSqlPath = path.join(__dirname, '..', 'backups', 'populate_posters_tmdb.sql');
  fs.writeFileSync(outSqlPath, sqlStatements, 'utf8');

  console.log(`\n=======================================================`);
  console.log(`COMPLETATO CON SUCCESSO!`);
  console.log(`Film totali: ${processed}`);
  console.log(`Film con locandine localizzate: ${withPostersCount}`);
  console.log(`File SQL generato per Staging: ${outSqlPath}`);
  console.log(`=======================================================\n`);
}

run();

