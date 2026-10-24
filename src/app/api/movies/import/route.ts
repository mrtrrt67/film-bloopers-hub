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

    // 1. Verifica se già archiviato su Supabase
    const { data: existing } = await supabase
      .from("films")
      .select("*")
      .eq("tmdb_id", tmdb_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ film: existing });
    }

    // 2. Recupera dettagli ufficiali da TMDB
    const details = await getTMDBMovieDetails(Number(tmdb_id));
    if (!details) {
      return NextResponse.json({ error: "Film non trovato su TMDB" }, { status: 404 });
    }

    const year = details.release_date?.substring(0, 4) || null;
    const formatted = formatCredits(details);

    // Verifica anche per titolo e anno nel caso sia presente un vecchio record senza tmdb_id
    const { data: existingByTitle } = await supabase
      .from("films")
      .select("*")
      .ilike("titolo", details.title)
      .maybeSingle();

    if (existingByTitle) {
      // Aggiorna con dati TMDB ufficiali e tmdb_id
      const { data: updated } = await supabase
        .from("films")
        .update({
          tmdb_id: details.id,
          anno: year,
          regista: formatted.regista,
          attori: formatted.attori,
          genere: formatted.genere,
          trama: formatted.trama,
          poster_url: formatted.poster_url,
          backdrop_url: formatted.backdrop_url,
          tmdb_collection_id: formatted.tmdb_collection_id,
        })
        .eq("id", (existingByTitle as any).id)
        .select()
        .single();

      return NextResponse.json({ film: updated || existingByTitle });
    }

    // 3. Inserimento nuovo record ufficiale nel DB
    const newRecord = {
      titolo: details.title,
      anno: year,
      regista: formatted.regista,
      attori: formatted.attori,
      genere: formatted.genere,
      trama: formatted.trama,
      poster_url: formatted.poster_url,
      backdrop_url: formatted.backdrop_url,
      tmdb_id: details.id,
      original_title: details.original_title,
      tmdb_collection_id: formatted.tmdb_collection_id,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("films")
      .insert(newRecord)
      .select()
      .single();

    if (insertErr) {
      console.error("Errore inserimento film da TMDB:", insertErr);
      return NextResponse.json({ error: "Errore salvataggio a database" }, { status: 500 });
    }

    return NextResponse.json({ film: inserted });
  } catch (err: any) {
    console.error("Errore importazione film:", err);
    return NextResponse.json({ error: "Errore interno durante l'importazione" }, { status: 500 });
  }
}
