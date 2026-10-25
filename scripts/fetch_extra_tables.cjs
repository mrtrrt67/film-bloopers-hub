const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const idx = trimmed.indexOf('=');
    env[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim().replace(/^["'](.*)["']$/, '$1');
  }
});

const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, supabaseKey);

const extraTables = [
  'log_accessi',
  'log_errori_ia',
  'statistiche_ia',
  'storico_moderazione'
];

async function check() {
  console.log('Checking extra tables in production...');
  const snapshotDir = path.join(__dirname, '..', 'backups', 'snapshot_pre_cleanup');
  
  for (const table of extraTables) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.log(`Table ${table}: ERROR - ${error.message}`);
    } else {
      console.log(`Table ${table}: FOUND ${data?.length || 0} rows`);
      fs.writeFileSync(path.join(snapshotDir, `${table}.json`), JSON.stringify(data, null, 2), 'utf8');
      if (data && data.length > 0) {
        console.log(`Sample row from ${table}:`, Object.keys(data[0]));
      }
    }
  }
}

check();
