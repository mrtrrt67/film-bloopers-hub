import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTMDBMovieDetails, formatCredits } from "@/lib/tmdb";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { tmdb_id } = await request.json();

    if (!tmdb_id) {
      return NextResponse.json({ error: "tmdb_id mancante" }, { status: 400 });
    }

    // 1. Recupera dettagli ufficiali da TMDB
    const details = await getTMDBMovieDetails(Number(tmdb_id));
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
    const newRecord: Record<string, any> = {
      titolo: details.title,
      anno: year,
      regista: formatted.regista,
      attori: formatted.attori,
      genere: formatted.genere,
      trama: formatted.trama,
      poster_url: formatted.poster_url,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("films")
      .insert(newRecord)
      .select()
      .single();

    if (insertErr) {
      console.error("Errore inserimento film da TMDB:", insertErr);
      return NextResponse.json(
        { error: "Errore salvataggio nel database: " + insertErr.message },
        { status: 500 }
      );
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
