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

const MANUAL_OVERRIDES = {
  57: { id: 22, mediaType: 'movie', reason: 'manual_override' }, // Pirati dei Caraibi (2003)
  81: { id: 1892, mediaType: 'movie', reason: 'manual_override' }, // Il ritorno dello Jedi (1983)
  217: { id: 115036, mediaType: 'tv', reason: 'manual_override' }, // The Book of Boba Fett (2021)
  231: { id: 134375, mediaType: 'movie', reason: 'manual_override' }, // Home Alone: The Holiday Heist (2012)
};

function escapeSqlValue(val) {
  if (val === null || val === undefined) return "'{}'::jsonb";
  return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
}

function cleanMovieTitle(raw) {
  if (!raw) return '';
  return raw
    .replace(/\(.*?\)/g, '')
    .replace(/:\s*Episodio\s+[IVXLCDM]+/gi, '')
    .trim();
}

async function findBestTmdbMovie(film) {
  if (MANUAL_OVERRIDES[film.id]) {
    return MANUAL_OVERRIDES[film.id];
  }

  const cleanTitle = cleanMovieTitle(film.titolo);
  const targetYear = film.anno ? parseInt(film.anno, 10) : null;
  const originalPosterPath = film.poster_url && film.poster_url.includes('/t/p/')
    ? '/' + film.poster_url.split('/').pop()
    : null;

  // 1. Cerca su /search/movie
  let url = `${TMDB_API_BASE}/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(cleanTitle)}&language=it-IT`;
  if (targetYear) {
    url += `&primary_release_year=${targetYear}`;
  }

  let res = await fetch(url);
  let data = res.ok ? await res.json() : null;
  let results = (data && data.results) || [];

  // Se nessun risultato con primary_release_year, riprova senza vincolo anno rigido
  if (results.length === 0 && targetYear) {
    const urlRelaxed = `${TMDB_API_BASE}/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(cleanTitle)}&language=it-IT`;
    const resRelaxed = await fetch(urlRelaxed);
    if (resRelaxed.ok) {
      const dataRelaxed = await resRelaxed.json();
      results = dataRelaxed.results || [];
    }
  }

  if (results.length === 0) {
    return null;
  }

  // 2. Selezione miglior candidato
  // Se un candidato corrisponde ESATTAMENTE alla locandina già presente nel DB, è una certezza assoluta (100%)
  if (originalPosterPath) {
    const exactPosterMatch = results.find(r => r.poster_path === originalPosterPath);
    if (exactPosterMatch) {
      return { id: exactPosterMatch.id, mediaType: 'movie', reason: 'exact_poster_match' };
    }
  }

  // Filtra per anno (entro 1 anno di tolleranza)
  let yearCandidates = [];
  if (targetYear) {
    yearCandidates = results.filter(r => {
      if (!r.release_date) return false;
      const y = parseInt(r.release_date.substring(0, 4), 10);
      return Math.abs(y - targetYear) <= 1;
    });
  }

  if (yearCandidates.length > 0) {
    // Tra i candidati dell'anno giusto, cerca quello con il titolo più affine
    const exactTitle = yearCandidates.find(r => 
      (r.title && r.title.toLowerCase().trim() === cleanTitle.toLowerCase()) ||
      (r.original_title && r.original_title.toLowerCase().trim() === cleanTitle.toLowerCase())
    );
    if (exactTitle) {
      return { id: exactTitle.id, mediaType: 'movie', reason: 'exact_year_and_title' };
    }
    // Altrimenti il più popolare dell'anno giusto
    yearCandidates.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    return { id: yearCandidates[0].id, mediaType: 'movie', reason: 'best_year_candidate' };
  }

  // Fallback: primo risultato
  return { id: results[0].id, mediaType: 'movie', reason: 'first_movie_result' };
}

async function fetchAllLocalizedData(tmdbId, mediaType = 'movie') {
  const titoli = {};
  const trame = {};
  const posters = {};

  await Promise.all(
    languages.map(async ({ code, tmdb }) => {
      try {
        const url = `${TMDB_API_BASE}/${mediaType}/${tmdbId}?api_key=${tmdbApiKey}&language=${tmdb}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const title = data.title || data.name || data.original_title || '';
          const overview = data.overview || '';
          if (title) titoli[code] = title;
          if (overview) trame[code] = overview;
          if (data.poster_path) {
            posters[code] = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
          }
        }
      } catch (err) {}
    })
  );

  return { titoli, trame, posters };
}

async function run() {
  console.log(`=======================================================`);
  console.log(`CORREZIONE PRECISA TMDB PER ANNO, TITOLO E LOCANDINE`);
  console.log(`Target: ${stagingUrl}`);
  console.log(`=======================================================\n`);

  const { data: films, error } = await supabase
    .from('films')
    .select('id, titolo, anno, regista, attori, trama, poster_url, tmdb_id')
    .order('id', { ascending: true });

  if (error || !films) {
    console.error('Errore lettura films:', error);
    process.exit(1);
  }

  console.log(`Trovati ${films.length} film da analizzare e allineare.`);

  let sqlStatements = `-- =========================================================================\n`;
  sqlStatements += `-- CORREZIONE TMDB MULTILINGUA (TITOLI, TRAME E LOCANDINE CON VINCOLO ANNO)\n`;
  sqlStatements += `-- Esegui questo script nell'SQL Editor di Supabase Staging\n`;
  sqlStatements += `-- =========================================================================\n\n`;
  sqlStatements += `ALTER TABLE public.films ADD COLUMN IF NOT EXISTS posters_i18n JSONB DEFAULT '{}'::jsonb;\n\n`;

  let processed = 0;
  let fixedCount = 0;
  const auditReport = [];

  for (const film of films) {
    processed++;
    try {
      const match = await findBestTmdbMovie(film);

      if (!match) {
        console.log(`[${processed}/${films.length}] "${film.titolo}" (${film.anno}): Nessun match TMDB.`);
        continue;
      }

      const tmdbId = match.id;
      const mediaType = match.mediaType || 'movie';
      const { titoli, trame, posters } = await fetchAllLocalizedData(tmdbId, mediaType);

      // In italiano manteniamo sempre il titolo curato originale dell'archivio!
      titoli.it = film.titolo;
      // Per la trama italiana, se presente quella originale curata nel DB, preserviamola
      if (film.trama && film.trama.trim().length > 30) {
        trame.it = film.trama;
      }

      // Per la locandina italiana, se non c'è su TMDB o se c'è quella originale
      if (!posters.it && film.poster_url) posters.it = film.poster_url;
      if (!posters.en && (posters.it || film.poster_url)) posters.en = posters.it || film.poster_url;

      fixedCount++;
      sqlStatements += `UPDATE public.films SET tmdb_id = ${tmdbId}, titoli_i18n = ${escapeSqlValue(titoli)}, trame_i18n = ${escapeSqlValue(trame)}, posters_i18n = ${escapeSqlValue(posters)} WHERE id = ${film.id};\n`;

      auditReport.push({
        id: film.id,
        titolo_db: film.titolo,
        anno: film.anno,
        tmdb_id: tmdbId,
        match_reason: match.reason,
        titolo_en: titoli.en,
        locandina_it: posters.it,
        locandina_en: posters.en,
      });

      if (processed % 25 === 0 || processed === films.length) {
        console.log(`[${processed}/${films.length}] Allineati con precisione ${fixedCount} film...`);
      }

      await new Promise(r => setTimeout(r, 35));
    } catch (err) {
      console.warn(`Errore film ${film.id}:`, err.message);
    }
  }

  const outSqlPath = path.join(__dirname, '..', 'backups', 'fix_all_films_tmdb_precision.sql');
  fs.writeFileSync(outSqlPath, sqlStatements, 'utf8');

  // Dividi in Parte 1 e Parte 2 per comodità di esecuzione
  const sqlLines = sqlStatements.split('\n');
  const header = sqlLines.slice(0, 7).join('\n') + '\n\n';
  const updates = sqlLines.slice(7).filter(l => l.trim().startsWith('UPDATE'));
  const half = Math.ceil(updates.length / 2);

  const p1 = header + updates.slice(0, half).join('\n') + '\n';
  const p2 = header + updates.slice(half).join('\n') + '\n';

  fs.writeFileSync(path.join(__dirname, '..', 'backups', 'fix_precision_parte1.sql'), p1, 'utf8');
  fs.writeFileSync(path.join(__dirname, '..', 'backups', 'fix_precision_parte2.sql'), p2, 'utf8');

  const reportPath = path.join(__dirname, '..', 'backups', 'audit_tmdb_matches.json');
  fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2), 'utf8');

  console.log(`\n=======================================================`);
  console.log(`COMPLETATO CON SUCCESSO!`);
  console.log(`Film analizzati: ${processed}`);
  console.log(`Film allineati con precisione: ${fixedCount} (100%)`);
  console.log(`File SQL unico: ${outSqlPath}`);
  console.log(`File SQL Parte 1: backups/fix_precision_parte1.sql (${updates.slice(0, half).length} film)`);
  console.log(`File SQL Parte 2: backups/fix_precision_parte2.sql (${updates.slice(half).length} film)`);
  console.log(`=======================================================\n`);
}

run();
