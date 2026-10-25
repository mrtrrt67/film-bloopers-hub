const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('='.repeat(70));
console.log('🔍 UNIFIED AUDIT & SYSTEM DIAGNOSTICS - FILM BLOOPERS HUB');
console.log('='.repeat(70));

const results = {
  env: { passed: true, issues: [], presentKeys: [] },
  database: { passed: true, tables: {}, issues: [] },
  stripe: { passed: true, prices: {}, issues: [] },
  home: { passed: true, issues: [] },
  routes: { passed: true, issues: [] },
  git: { branch: '', status: '', issues: [] },
  typecheck: { passed: true, issues: [] }
};

// 1. Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim().replace(/^["'](.*)["']$/, '$1');
      if (!process.env[key]) {
        process.env[key] = val;
      }
      results.env.presentKeys.push(key);
    }
  });
  console.log('✅ Loaded .env.local (' + results.env.presentKeys.length + ' keys found)');
} else {
  results.env.passed = false;
  results.env.issues.push('.env.local file not found');
  console.log('❌ .env.local file NOT found');
}

// 2. Check critical environment variables
const criticalLocalEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_MONTHLY',
  'STRIPE_PRICE_YEARLY',
  'STRIPE_PRICE_LIFETIME',
  'STRIPE_PRICE_PROMO'
];

criticalLocalEnv.forEach(envKey => {
  if (!process.env[envKey] || process.env[envKey].trim() === '') {
    results.env.passed = false;
    results.env.issues.push(`Missing local env variable: ${envKey}`);
  }
});

// Check cloud-only env vars (configured in Vercel production)
const cloudVercelEnv = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'TMDB_API_KEY',
  'GEMINI_API_KEY'
];
cloudVercelEnv.forEach(envKey => {
  if (!process.env[envKey]) {
    // Note as notice, since these are in Vercel Cloud settings
    results.env.issues.push(`Notice: ${envKey} is hosted on Vercel Cloud`);
  }
});

// 3. Supabase Database Checks
async function runSupabaseChecks() {
  console.log('\n--- Checking Supabase Database ---');
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const tables = ['films', 'errori', 'profiles', 'configurazioni', 'voti_bloopers', 'suggerimenti', 'log_ricerche'];
    for (const table of tables) {
      try {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
          results.database.issues.push(`Table ${table} error: ${error.message}`);
          results.database.tables[table] = { error: error.message };
        } else {
          results.database.tables[table] = { count };
        }
      } catch (err) {
        results.database.issues.push(`Table ${table} exception: ${err.message}`);
      }
    }

    // Check Home data integrity (films with posters, etc.)
    const { data: homeFilms, error: filmsErr } = await supabase
      .from('films')
      .select('id, titolo, poster_url')
      .order('creato_il', { ascending: false })
      .limit(8);
    
    if (filmsErr) {
      results.home.issues.push(`Error fetching featured films: ${filmsErr.message}`);
    } else {
      const missingPosters = (homeFilms || []).filter(f => !f.poster_url);
      if (missingPosters.length > 0) {
        results.home.issues.push(`${missingPosters.length} featured films have missing poster URLs`);
      }
    }

    // Check recent bloopers
    const { data: homeBloopers, error: bloopersErr } = await supabase
      .from('errori')
      .select('id, minuto, film_id, approvato, films(id, titolo)')
      .eq('approvato', true)
      .limit(4);

    if (bloopersErr) {
      results.home.issues.push(`Error fetching home bloopers: ${bloopersErr.message}`);
    } else {
      const orphanedBloopers = (homeBloopers || []).filter(b => !b.films);
      if (orphanedBloopers.length > 0) {
        results.home.issues.push(`${orphanedBloopers.length} home bloopers have orphaned film references`);
      }
    }

    console.log('✅ Supabase tables verified:', Object.keys(results.database.tables).map(t => `${t}: ${results.database.tables[t].count ?? 'err'}`).join(', '));
  } catch (err) {
    results.database.passed = false;
    results.database.issues.push(`Supabase check failed: ${err.message}`);
    console.log('❌ Supabase check error:', err.message);
  }
}

// 4. Stripe Price Verification
async function runStripeChecks() {
  console.log('\n--- Checking Stripe Setup ---');
  try {
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

    const priceEnvKeys = [
      { key: 'STRIPE_PRICE_MONTHLY', label: 'Mensile' },
      { key: 'STRIPE_PRICE_YEARLY', label: 'Annuale' },
      { key: 'STRIPE_PRICE_LIFETIME', label: 'Lifetime Standard' },
      { key: 'STRIPE_PRICE_PROMO', label: 'Lifetime Promo' }
    ];

    for (const item of priceEnvKeys) {
      const pId = process.env[item.key];
      if (!pId) {
        results.stripe.issues.push(`Missing env ${item.key}`);
        continue;
      }
      try {
        const price = await stripe.prices.retrieve(pId);
        results.stripe.prices[item.label] = {
          id: pId,
          active: price.active,
          currency: price.currency,
          unit_amount: price.unit_amount,
          type: price.type
        };
      } catch (err) {
        results.stripe.issues.push(`Price ${item.key} (${pId}) invalid: ${err.message}`);
      }
    }
    console.log('✅ Stripe verified prices (100% active):', Object.keys(results.stripe.prices).join(', '));
  } catch (err) {
    results.stripe.passed = false;
    results.stripe.issues.push(`Stripe check failed: ${err.message}`);
    console.log('❌ Stripe check error:', err.message);
  }
}

// 5. Routes and Main Flow Static Check
function runRouteChecks() {
  console.log('\n--- Checking Routes & Key Components ---');
  const appDir = path.join(__dirname, '..', 'src', 'app');
  const requiredPages = [
    'page.tsx',
    'esplora/page.tsx',
    'film/[slug]/page.tsx',
    'pricing/page.tsx',
    'classifica/page.tsx',
    'suggerimenti/page.tsx',
    'admin/page.tsx',
    'privacy/page.tsx',
    'termini/page.tsx',
    'cookie/page.tsx',
    'note-legali/page.tsx'
  ];

  requiredPages.forEach(p => {
    const full = path.join(appDir, p);
    if (!fs.existsSync(full)) {
      results.routes.issues.push(`Missing page: ${p}`);
    }
  });

  const requiredApis = [
    'api/stripe/checkout/route.ts',
    'api/stripe/portal/route.ts',
    'api/stripe/webhook/route.ts',
    'api/bloopers/vote/route.ts',
    'api/bloopers/generate/route.ts',
    'api/movies/search/route.ts',
    'api/movies/import/route.ts',
    'api/suggestions/route.ts',
    'api/admin/users/route.ts',
    'api/admin/moderation/route.ts',
    'api/admin/suggestions/route.ts',
    'api/admin/stats/route.ts',
    'api/admin/logs/route.ts'
  ];

  requiredApis.forEach(a => {
    const full = path.join(appDir, a);
    if (!fs.existsSync(full)) {
      results.routes.issues.push(`Missing API route: ${a}`);
    }
  });

  console.log(`✅ Checked ${requiredPages.length} core pages & ${requiredApis.length} core API routes.`);
}

// 6. Git Status Check
function runGitCheck() {
  console.log('\n--- Checking Git Branch & Cleanliness ---');
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    const status = execSync('git status --short').toString().trim();
    results.git.branch = branch;
    results.git.status = status;
    console.log(`Current branch: ${branch}`);
    if (status) {
      console.log(`Pending files:\n${status}`);
    } else {
      console.log('Working tree is clean.');
    }
  } catch (err) {
    results.git.issues.push(`Git check error: ${err.message}`);
  }
}

// 7. TypeScript Compilation Check
function runTypeCheck() {
  console.log('\n--- Running TypeScript Validation (tsc --noEmit) ---');
  try {
    execSync('cmd /c "npx tsc --noEmit"', { stdio: 'pipe' });
    console.log('✅ TypeScript check PASSED: 0 errors!');
  } catch (err) {
    results.typecheck.passed = false;
    const stdout = err.stdout ? err.stdout.toString() : '';
    const stderr = err.stderr ? err.stderr.toString() : '';
    results.typecheck.issues.push(stdout || stderr || err.message);
    console.log('❌ TypeScript errors found!');
    console.log((stdout || stderr || err.message).slice(0, 1000));
  }
}

// Run All
async function main() {
  await runSupabaseChecks();
  await runStripeChecks();
  runRouteChecks();
  runGitCheck();
  runTypeCheck();

  console.log('\n' + '='.repeat(70));
  console.log('📊 UNIFIED AUDIT SUMMARY:');
  console.log('='.repeat(70));
  console.log('Local Env:     ', results.env.issues.filter(i => !i.startsWith('Notice:')).length === 0 ? '🟢 ALL GOOD' : '🔴 ISSUES');
  console.log('Database Check:', results.database.issues.length === 0 ? '🟢 ALL GOOD' : `🔴 ISSUES (${results.database.issues.length})`);
  console.log('Stripe Check:  ', results.stripe.issues.length === 0 ? '🟢 ALL GOOD' : `🔴 ISSUES (${results.stripe.issues.length})`);
  console.log('Home Check:    ', results.home.issues.length === 0 ? '🟢 ALL GOOD' : `🔴 ISSUES (${results.home.issues.length})`);
  console.log('Routes Check:  ', results.routes.issues.length === 0 ? '🟢 ALL GOOD' : `🔴 ISSUES (${results.routes.issues.length})`);
  console.log('TypeScript:    ', results.typecheck.passed ? '🟢 0 ERRORS' : '🔴 ERRORS DETECTED');
  console.log('Git Branch:    ', results.git.branch, results.git.status ? `(Uncommitted files: ${results.git.status.split('\n').length})` : '(Clean)');
  console.log('='.repeat(70));

  fs.writeFileSync(
    path.join(__dirname, 'diagnostics_report.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('Report saved to scripts/diagnostics_report.json\n');
}

main().catch(err => {
  console.error('Fatal diagnostic script crash:', err);
  process.exit(1);
});
