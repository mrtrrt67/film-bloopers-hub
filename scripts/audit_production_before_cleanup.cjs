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

async function audit() {
  const tables = [
    'films',
    'errori',
    'profiles',
    'configurazioni',
    'suggerimenti',
    'voti_bloopers',
    'log_ricerche',
    'log_accessi',
    'log_errori_ia',
    'statistiche_ia',
    'storico_moderazione'
  ];

  console.log('--- PRODUCTION AUDIT ---');
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`${t}: ${error ? 'ERROR: ' + error.message : count + ' rows'}`);
  }

  // Check test film 233
  const { data: testFilm } = await supabase.from('films').select('id, titolo').eq('id', 233).maybeSingle();
  console.log('Test film 233 in production:', testFilm ? `Found ("${testFilm.titolo}")` : 'Not found');
}

audit();
