const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Carica variabili d'ambiente (supporta sia Staging che Produzione)
const useStaging = process.argv.includes('--staging') || !process.argv.includes('--prod');
const envFile = useStaging && fs.existsSync(path.join(__dirname, '..', '.env.staging')) 
  ? '.env.staging' 
  : '.env.local';

const envPath = path.join(__dirname, '..', envFile);
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const idx = trimmed.indexOf('=');
    env[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim().replace(/^["'](.*)["']$/, '$1');
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL || 'https://hktzscarmerpbgxgxliq.supabase.co';
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey) {
  console.error(`❌ Configurazione mancante in ${envFile} (NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY)`);
  process.exit(1);
}

const anonClient = createClient(url, anonKey);
const serviceClient = serviceKey ? createClient(url, serviceKey) : null;

async function runTests() {
  console.log('======================================================================');
  console.log('🛡️  TEST SUITE DI SICUREZZA & INTEGRITÀ RLS - FILM BLOOPERS HUB');
  console.log('======================================================================');
  console.log(`Database Target: ${url}\n`);

  let passedCount = 0;
  let totalCount = 0;

  async function test(name, fn) {
    totalCount++;
    process.stdout.write(`[Test ${totalCount}] ${name}... `);
    try {
      const ok = await fn();
      if (ok) {
        console.log('✅ SUPERATO');
        passedCount++;
      } else {
        console.log('❌ FALLITO');
      }
    } catch (err) {
      console.log(`❌ ERRORE: ${err.message}`);
    }
  }

  // --- TEST UTENTE OSPITE (ANON KEY PUBBLICA) ---
  console.log('--- 1. Verifica Accesso Utente Pubblico (Anon Key) ---');

  await test('Lettura pubblica del catalogo films', async () => {
    const { data, error } = await anonClient.from('films').select('id, titolo').limit(5);
    return !error && data && data.length > 0;
  });

  await test('Lettura pubblica bloopers approvati', async () => {
    const { data, error } = await anonClient.from('errori').select('id, descrizione').eq('approvato', true).limit(5);
    return !error && data && data.length > 0;
  });

  await test('Lettura pubblica configurazioni sito', async () => {
    const { data, error } = await anonClient.from('configurazioni').select('chiave, valore').limit(5);
    return !error && data && data.length > 0;
  });

  await test('Lettura pubblica conteggio voti community', async () => {
    const { error } = await anonClient.from('voti_bloopers').select('id, tipo').limit(1);
    return !error;
  });

  await test('BLOCCO tentativo inserimento film con anon key (Violazione RLS 42501)', async () => {
    const { error } = await anonClient.from('films').insert({ titolo: 'FILM_TEST_NON_AUTORIZZATO' });
    // Deve fallire con errore di permessi RLS (code 42501)
    return error && (error.code === '42501' || error.message.includes('row-level security'));
  });

  await test('BLOCCO tentativo alterazione configurazioni con anon key', async () => {
    const { error } = await anonClient.from('configurazioni').insert({ chiave: 'test_hack', valore: '1' });
    return error && (error.code === '42501' || error.message.includes('row-level security'));
  });

  await test('BLOCCO inserimento blooper da visitatore non autenticato', async () => {
    const { error } = await anonClient.from('errori').insert({
      film_id: 1,
      descrizione: 'Blooper non autorizzato da guest',
      approvato: true,
      minuto: '00:00'
    });
    return error && (error.code === '42501' || error.message.includes('row-level security'));
  });

  // --- TEST BACKEND (SERVICE ROLE - STRIPE & ADMIN) ---
  console.log('\n--- 3. Verifica Backend & Webhook Stripe (Service Role) ---');
  if (serviceClient) {
    await test('Accesso completo backend per Webhook Stripe su profiles', async () => {
      const { data, error } = await serviceClient.from('profiles').select('id, tier').limit(1);
      return !error;
    });

    await test('Accesso admin moderazione per approvazione errori', async () => {
      const { data, error } = await serviceClient.from('errori').select('id').limit(1);
      return !error;
    });
  } else {
    console.log('⚠️ SUPABASE_SERVICE_ROLE_KEY non presente in .env.local, test service role saltati.');
  }

  console.log('\n======================================================================');
  console.log(`🎯 RISULTATO: ${passedCount}/${totalCount} test passati con successo.`);
  console.log('======================================================================');
}

runTests();
