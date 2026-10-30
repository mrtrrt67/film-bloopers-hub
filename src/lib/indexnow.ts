import { createClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/utils";

export const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "b3106037cdfc4d729c7eac554ef4fb55";
export const INDEXNOW_HOST = process.env.INDEXNOW_HOST || "filmbloopers.online";
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

export interface IndexNowResponse {
  success: boolean;
  status: number;
  submitted: number;
  message: string;
}

export interface IndexNowTracking {
  submittedUrls: string[];
  lastSubmittedAt: string | null;
  lastStatus: number | null;
  lastCount: number | null;
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gmiwhscbqvadnlqruhjs.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Invia una lista di URL a IndexNow (Bing, Yandex, Seznam, Naver)
 */
export async function submitToIndexNow(urls: string[]): Promise<IndexNowResponse> {
  const cleanUrls = Array.from(
    new Set(
      urls
        .map((u) => u.trim())
        .filter((u) => u.startsWith("http://") || u.startsWith("https://"))
    )
  );

  if (cleanUrls.length === 0) {
    return {
      success: false,
      status: 400,
      submitted: 0,
      message: "Nessun URL valido fornito per la sottomissione a IndexNow.",
    };
  }

  const payload = {
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`,
    urlList: cleanUrls.slice(0, 10000), // Limite IndexNow per singola chiamata batch
  };

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    const isOk = res.status === 200 || res.status === 202;
    let message = "";

    switch (res.status) {
      case 200:
        message = `Successo: ${cleanUrls.length} URL inviati e accettati da IndexNow.`;
        break;
      case 202:
        message = `Accettato (202): ${cleanUrls.length} URL ricevuti, IndexNow sta verificando la chiave e processando l'indicizzazione.`;
        break;
      case 400:
        message = "Errore 400: Formato della richiesta non valido.";
        break;
      case 403:
        message = "Errore 403: Chiave non valida o file chiave non raggiungibile sul dominio.";
        break;
      case 422:
        message = "Errore 422: Uno o più URL non appartengono all'host dichiarato.";
        break;
      case 429:
        message = "Errore 429: Troppe richieste verso IndexNow (rate limit temporaneo).";
        break;
      default:
        message = `Risposta IndexNow con codice di stato HTTP ${res.status}.`;
        break;
    }

    // Registra nello storico locale gli URL inviati con successo
    if (isOk) {
      void recordSubmittedUrls(cleanUrls, res.status).catch(() => {});
    }

    return {
      success: isOk,
      status: res.status,
      submitted: isOk ? cleanUrls.length : 0,
      message,
    };
  } catch (err: any) {
    console.error("Errore chiamata IndexNow API:", err);
    return {
      success: false,
      status: 500,
      submitted: 0,
      message: err.message || "Errore di connessione verso le API IndexNow.",
    };
  }
}

/**
 * Estrae tutti gli URL pubblici del sito (pagine statiche e schede film) per l'invio in blocco
 */
export async function getAllSiteUrls(): Promise<string[]> {
  const baseUrl = `https://${INDEXNOW_HOST}`;

  const staticUrls = [
    `${baseUrl}/`,
    `${baseUrl}/esplora`,
    `${baseUrl}/classifica`,
    `${baseUrl}/pricing`,
    `${baseUrl}/suggerimenti`,
    `${baseUrl}/privacy`,
    `${baseUrl}/termini`,
    `${baseUrl}/cookie`,
    `${baseUrl}/note-legali`,
  ];

  try {
    const supabase = getSupabaseClient();
    const { data: films } = await supabase
      .from("films")
      .select("id, titolo, anno")
      .limit(2000);

    const movieUrls = (films || []).map((film: any) => {
      const slug = slugify(film.titolo, film.anno);
      const shortId = String(film.id);
      return `${baseUrl}/film/${slug}-${shortId}`;
    });

    return [...staticUrls, ...movieUrls];
  } catch (err) {
    console.error("Errore recupero film per IndexNow:", err);
    return staticUrls;
  }
}

/**
 * Recupera lo storico degli URL inviati da configurazioni
 */
export async function getIndexNowTracking(dbClient?: any): Promise<IndexNowTracking> {
  const db = dbClient || getSupabaseClient();
  try {
    const { data } = await db
      .from("configurazioni")
      .select("valore")
      .eq("chiave", "indexnow_tracking")
      .maybeSingle();

    if (data?.valore) {
      const parsed = JSON.parse(data.valore);
      return {
        submittedUrls: Array.isArray(parsed.submittedUrls) ? parsed.submittedUrls : [],
        lastSubmittedAt: parsed.lastSubmittedAt || null,
        lastStatus: parsed.lastStatus || null,
        lastCount: parsed.lastCount || null,
      };
    }
  } catch (e) {
    console.warn("Errore lettura indexnow_tracking:", e);
  }

  return {
    submittedUrls: [],
    lastSubmittedAt: null,
    lastStatus: null,
    lastCount: null,
  };
}

/**
 * Salva l'elenco incrementale degli URL inviati in configurazioni
 */
export async function recordSubmittedUrls(urls: string[], status: number, dbClient?: any): Promise<void> {
  const db = dbClient || getSupabaseClient();
  try {
    const current = await getIndexNowTracking(db);
    const set = new Set([...current.submittedUrls, ...urls]);
    const payload = {
      submittedUrls: Array.from(set),
      lastSubmittedAt: new Date().toISOString(),
      lastStatus: status,
      lastCount: urls.length,
    };

    await db.from("configurazioni").upsert({
      chiave: "indexnow_tracking",
      valore: JSON.stringify(payload),
      visibile: false,
    });
  } catch (e) {
    console.warn("Errore salvataggio indexnow_tracking:", e);
  }
}

/**
 * Calcola quali URL del sito non sono ancora stati inviati a IndexNow
 */
export async function getIndexNowDiff(dbClient?: any): Promise<{
  allUrls: string[];
  submittedUrls: string[];
  missingUrls: string[];
  lastSubmittedAt: string | null;
}> {
  const allUrls = await getAllSiteUrls();
  const tracking = await getIndexNowTracking(dbClient);
  const submittedSet = new Set(tracking.submittedUrls);

  const missingUrls = allUrls.filter((u) => !submittedSet.has(u));

  return {
    allUrls,
    submittedUrls: tracking.submittedUrls,
    missingUrls,
    lastSubmittedAt: tracking.lastSubmittedAt,
  };
}
