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

async function inspect() {
  console.log('Inspecting production grants and policies...');

  // Check if any policies exist on any of the tables
  try {
    const { data, error } = await supabase.rpc('get_policies');
    console.log('RPC get_policies:', error ? error.message : data);
  } catch (e) {
    console.log('No get_policies rpc');
  }

  // Check if anon or authenticated can insert/update/select on key tables
  const anonClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const tables = ['films', 'errori', 'profiles', 'configurazioni', 'voti_bloopers', 'suggerimenti', 'log_ricerche'];
  
  for (const t of tables) {
    const { data, error } = await anonClient.from(t).select('*').limit(1);
    console.log(`Anon SELECT on ${t}:`, error ? `FAILED (${error.message})` : 'ALLOWED');
  }
}

inspect();
