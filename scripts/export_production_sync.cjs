const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Carica configurazione da .env.local
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

const prodUrl = process.env.PROD_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || 'https://gmiwhscbqvadnlqruhjs.supabase.co';
const prodKey = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!prodUrl || !prodKey) {
  console.error('URL o Chiave Supabase mancante.');
  process.exit(1);
}

const supabase = createClient(prodUrl, prodKey, {
  auth: { persistSession: false }
});

function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return isNaN(val) ? 'NULL' : String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'object') {
    if (val instanceof Date) return `'${val.toISOString()}'`;
    const jsonStr = JSON.stringify(val);
    return `'${jsonStr.replace(/'/g, "''")}'`;
  }
  const s = String(val).replace(/'/g, "''");
  return `'${s}'`;
}

function generateInserts(tableName, rows, batchSize = 100) {
  if (!rows || rows.length === 0) return `-- Nessun dato trovato per ${tableName}\n`;

  let sql = `-- =========================================================================\n`;
  sql += `-- DATI: ${tableName} (${rows.length} righe)\n`;
  sql += `-- =========================================================================\n`;

  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const colsSet = new Set();
    chunk.forEach(r => Object.keys(r).forEach(k => colsSet.add(k)));
    const cols = Array.from(colsSet);

    const colsHeader = cols.map(c => `"${c}"`).join(', ');
    sql += `INSERT INTO public.${tableName} (${colsHeader}) VALUES\n`;

    const valueLines = chunk.map((r, rowIdx) => {
      const vals = cols.map(c => escapeSqlValue(r[c]));
      const isLast = (rowIdx === chunk.length - 1);
      return `(${vals.join(', ')})${isLast ? '' : ','}`;
    });

    sql += valueLines.join('\n') + ';\n\n';
  }

  return sql;
}

async function fetchAllRows(tableName) {
  console.log(`Scaricamento tabella: ${tableName}...`);
  let allRows = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(from, to);

    if (error) {
      console.warn(`Avviso durante la lettura di ${tableName} (range ${from}-${to}):`, error.message);
      break;
    }

    if (data && data.length > 0) {
      allRows = allRows.concat(data);
      console.log(`  -> Scaricate ${allRows.length} righe da ${tableName}...`);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }

  return allRows;
}

async function main() {
  console.log(`\n=======================================================`);
  console.log(`ESTRAZIONE PRODUZIONE PER ALLINEAMENTO STAGING`);
  console.log(`Origine: ${prodUrl}`);
  console.log(`=======================================================\n`);

  try {
    const films = await fetchAllRows('films');
    const errori = await fetchAllRows('errori');
    const movieTrivia = await fetchAllRows('movie_trivia');
    const votiBloopers = await fetchAllRows('voti_bloopers');

    console.log(`\nRiepilogo dati estratti da Produzione:`);
    console.log(` - films: ${films.length}`);
    console.log(` - errori (bloopers): ${errori.length}`);
    console.log(` - movie_trivia: ${movieTrivia.length}`);
    console.log(` - voti_bloopers: ${votiBloopers.length}`);
    console.log(` Totale contenuti (bloopers + curiosità): ${errori.length + movieTrivia.length}`);

    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const outputFile = path.join(backupDir, 'sync_production_to_staging.sql');

    let sql = `-- =========================================================================\n`;
    sql += `-- FILM BLOOPERS HUB - ALLINEAMENTO PRODUZIONE -> STAGING\n`;
    sql += `-- Generato il: ${new Date().toISOString()}\n`;
    sql += `-- Progetto Staging Target: https://supabase.com/dashboard/project/hktzscarmerpbgxgxliq/sql\n`;
    sql += `-- Istruzioni: Incolla l'intero script nell'SQL Editor di Supabase Staging ed esegui.\n`;
    sql += `-- =========================================================================\n\n`;

    sql += `-- 1. Pulizia atomica delle tabelle in Staging\n`;
    sql += `TRUNCATE TABLE public.movie_trivia, public.voti_bloopers, public.errori, public.films CASCADE;\n\n`;

    sql += `-- 2. Inserimento Films\n`;
    sql += generateInserts('films', films);

    sql += `-- 3. Inserimento Errori (Bloopers)\n`;
    sql += generateInserts('errori', errori);

    sql += `-- 4. Inserimento Curiosità (Movie Trivia)\n`;
    sql += generateInserts('movie_trivia', movieTrivia);

    sql += `-- 5. Inserimento Voti Bloopers\n`;
    sql += generateInserts('voti_bloopers', votiBloopers);

    sql += `-- 6. Ripristino e allineamento contatori di sequenza Postgres (per nuovi inserimenti)\n`;
    sql += `SELECT setval(pg_get_serial_sequence('public.films', 'id'), COALESCE((SELECT MAX(id) FROM public.films), 1));\n`;
    sql += `SELECT setval(pg_get_serial_sequence('public.errori', 'id'), COALESCE((SELECT MAX(id) FROM public.errori), 1));\n\n`;
    sql += `-- Fine Script Allineamento\n`;

    fs.writeFileSync(outputFile, sql, 'utf8');

    const stats = fs.statSync(outputFile);
    console.log(`\n=======================================================`);
    console.log(`SUCCESSO! File SQL generato:`);
    console.log(`Percorso: ${outputFile}`);
    console.log(`Dimensione: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`=======================================================\n`);
  } catch (err) {
    console.error('Errore durante l\'estrazione:', err);
    process.exit(1);
  }
}

main();
