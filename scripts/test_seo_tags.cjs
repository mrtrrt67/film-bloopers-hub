const fs = require('fs');
const path = require('path');

async function checkLive() {
  try {
    const res = await fetch('https://filmbloopers.online');
    const html = await res.text();
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
                      html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
    if (descMatch) {
      console.log('--- LIVE https://filmbloopers.online ---');
      console.log('Current Meta Description:', descMatch[1]);
      console.log('Length:', descMatch[1].length, 'characters');
      console.log('Bing Status:', descMatch[1].length >= 25 && descMatch[1].length <= 160 ? '✅ PASSED' : '❌ FAILED (Too Long/Short)');
    } else {
      console.log('No meta description found on live site!');
    }
  } catch (e) {
    console.error('Fetch error:', e.message);
  }
}

function auditLocal() {
  console.log('\n--- AUDIT DEI FILE LOCALI IN SRC/APP ---');
  const files = [
    'src/app/layout.tsx',
    'src/app/classifica/page.tsx',
    'src/app/pricing/layout.tsx',
    'src/app/esplora/layout.tsx',
    'src/app/suggerimenti/layout.tsx',
    'src/app/privacy/page.tsx',
    'src/app/termini/page.tsx',
    'src/app/cookie/page.tsx',
    'src/app/note-legali/page.tsx',
    'src/app/film/[slug]/page.tsx'
  ];

  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    const content = fs.readFileSync(f, 'utf-8');
    const matches = content.match(/description:\s*["'`]([\s\S]*?)["'`]/g);
    if (matches) {
      for (const m of matches) {
        const val = m.replace(/^description:\s*["'`]/, '').replace(/["'`]$/, '').trim();
        if (val.length > 0 && !val.includes('${')) {
          const ok = val.length >= 25 && val.length <= 160;
          console.log(`${f}: [len: ${val.length}] ${ok ? '✅ OK' : '❌ ERR (Must be 25-160)'}`);
          console.log('   Text: "' + val + '"');
        }
      }
    }
  }
}

async function run() {
  await checkLive();
  auditLocal();
}

run();
