import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTMDBMovieDetails, formatCredits, fetchTMDBMultiLanguage } from "@/lib/tmdb";
import { notifyIndexNowForMovie } from "@/lib/indexnow";
import { extractClientMetadata } from "@/lib/request-meta";

// Rate limiter in-memory per prevenire spam massivo su TMDB / Supabase
const importRateMap = new Map<string, { count: number; resetAt: number }>();

function checkImportRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = importRateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    importRateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) {
    return false;
  }
  entry.count += 1;
  return true;
}

export async function POST(request: Request) {
  try {
    const meta = extractClientMetadata(request);
    const clientIp = meta.ip_address || "anonymous";

    if (!checkImportRateLimit(clientIp)) {
      return NextResponse.json(
        { error: "Troppe importazioni in corso. Riprova tra un minuto." },
        { status: 429 }
      );
    }

    const supabase = await createClient();
    const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const db = hasServiceKey ? createAdminClient() : supabase;
    const body = await request.json().catch(() => ({}));
    const { tmdb_id } = body;

    const numId = Number(tmdb_id);
    if (!tmdb_id || !Number.isInteger(numId) || numId <= 0 || numId > 50_000_000) {
      return NextResponse.json({ error: "tmdb_id non valido" }, { status: 400 });
    }

    // 1. Recupera dettagli ufficiali da TMDB
    const details = await getTMDBMovieDetails(numId);
    if (!details) {
      return NextResponse.json({ error: "Film non trovato su TMDB" }, { status: 404 });
    }

    const rawYear = details.release_date?.substring(0, 4);
    const year = rawYear ? parseInt(rawYear, 10) : null;
    const formatted = formatCredits(details);

    // 2. Verifica se già archiviato su Supabase (per titolo e anno)
    let query = supabase.from("films").select("*").ilike("titolo", details.title);
    if (year) {
      query = query.eq("anno", year);
    }
    const { data: existingByTitle } = await query.maybeSingle();

    if (existingByTitle) {
      return NextResponse.json({ film: existingByTitle });
    }

    // 3. Inserimento nuovo record ufficiale nel DB con solo le colonne presenti nella tabella films
    let multiTitoli: Record<string, string> = { it: details.title };
    let multiTrame: Record<string, string> = { it: formatted.trama || "" };
    try {
      const multi = await fetchTMDBMultiLanguage(Number(tmdb_id));
      if (multi?.titoli) multiTitoli = { ...multiTitoli, ...multi.titoli };
      if (multi?.trame) multiTrame = { ...multiTrame, ...multi.trame };
    } catch (e) {
      console.warn("fetchTMDBMultiLanguage warning:", e);
    }

    const newRecord: Record<string, any> = {
      titolo: details.title,
      anno: year,
      regista: formatted.regista,
      attori: formatted.attori,
      genere: formatted.genere,
      trama: formatted.trama,
      poster_url: formatted.poster_url,
      titoli_i18n: multiTitoli,
      trame_i18n: multiTrame,
    };

    let { data: inserted, error: insertErr } = await db
      .from("films")
      .insert(newRecord)
      .select()
      .single();

    // Se db ha dato errore e non era già supabase, tenta il fallback con il client della sessione utente
    if (insertErr && db !== supabase) {
      const retry = await supabase.from("films").insert(newRecord).select().single();
      if (!retry.error && retry.data) {
        inserted = retry.data;
        insertErr = null;
      } else {
        insertErr = retry.error || insertErr;
      }
    }

    if (insertErr) {
      console.error("Errore inserimento film da TMDB:", insertErr);
      return NextResponse.json(
        { error: "Errore salvataggio nel database: " + insertErr.message },
        { status: 500 }
      );
    }

    if (inserted) {
      void notifyIndexNowForMovie(inserted).catch((err) => console.warn("IndexNow auto-submit warn:", err));
    }

    return NextResponse.json({ film: inserted });
  } catch (err: any) {
    console.error("Errore importazione film:", err);
    return NextResponse.json(
      { error: "Errore interno durante l'importazione: " + (err?.message || err) },
      { status: 500 }
    );
  }
}
