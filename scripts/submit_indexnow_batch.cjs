const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Carica variabili da .env.local se presenti
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "b3106037cdfc4d729c7eac554ef4fb55";
const INDEXNOW_HOST = process.env.INDEXNOW_HOST || "filmbloopers.online";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const LOCALES = ["it", "en", "es", "fr", "de"];

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gmiwhscbqvadnlqruhjs.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function slugify(title, year) {
  let s = (title || "").toLowerCase();
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (year && !s.includes(String(year))) {
    s = `${s}-${year}`;
  }
  return s;
}

async function run() {
  console.log(`[IndexNow] Connessione a Supabase (${SUPABASE_URL})...`);
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const baseUrl = `https://${INDEXNOW_HOST}`;
  const staticPaths = [
    "/",
    "/esplora",
    "/classifica",
    "/pricing",
    "/suggerimenti",
    "/privacy",
    "/termini",
    "/cookie",
    "/note-legali",
  ];

  const urls = [];

  // Pagine statiche in tutte le 5 lingue
  for (const p of staticPaths) {
    for (const loc of LOCALES) {
      const path = loc === "it" ? p : `/${loc}${p === "/" ? "" : p}`;
      urls.push(`${baseUrl}${path}`);
    }
  }

  // Estrai tutti i film
  const { data: films, error } = await supabase
    .from("films")
    .select("id, titolo, anno")
    .order("id", { ascending: true })
    .limit(3000);

  if (error) {
    console.error("[IndexNow] Errore estrazione film:", error.message);
    process.exit(1);
  }

  console.log(`[IndexNow] Trovati ${films.length} film a catalogo.`);

  for (const film of films) {
    const slug = slugify(film.titolo, film.anno);
    const baseSlug = `${slug}-${film.id}`;
    for (const loc of LOCALES) {
      const path = loc === "it" ? `/film/${baseSlug}` : `/${loc}/film/${baseSlug}`;
      urls.push(`${baseUrl}${path}`);
    }
  }

  const cleanUrls = Array.from(new Set(urls));
  console.log(`[IndexNow] Totale URL univoci pronti per l'invio: ${cleanUrls.length}`);

  const payload = {
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`,
    urlList: cleanUrls.slice(0, 10000),
  };

  console.log(`[IndexNow] Invio chiamata batch a ${INDEXNOW_ENDPOINT}...`);
  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    console.log(`[IndexNow] HTTP Status Code: ${res.status} ${res.statusText}`);
    const text = await res.text();
    if (text) console.log(`[IndexNow] Risposta:`, text);

    if (res.status === 200 || res.status === 202) {
      console.log(`[IndexNow] SUCCESSO! Tutti i ${cleanUrls.length} URL sono stati registrati nei motori (Bing, Yahoo, DuckDuckGo, Seznam).`);
    } else {
      console.warn(`[IndexNow] Nota sullo stato: ${res.status}`);
    }
  } catch (e) {
    console.error("[IndexNow] Errore di rete:", e.message);
  }
}

run();
