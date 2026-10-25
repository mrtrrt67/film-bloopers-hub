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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkRls() {
  console.log('Testing select on all tables with anon key...');
  const tables = ['films', 'errori', 'profiles', 'configurazioni', 'voti_bloopers', 'suggerimenti', 'log_ricerche'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    console.log(`Table ${t}:`, error ? `ERROR: ${error.message}` : `OK (${data?.length || 0} rows read)`);
  }
}

checkRls();
