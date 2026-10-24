import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchTMDBMovieCandidates, getTMDBMovieDetails, formatCredits } from "@/lib/tmdb";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const year = searchParams.get("year") || undefined;
    const tmdbId = searchParams.get("tmdbId");
    const mediaType = (searchParams.get("mediaType") || undefined) as "movie" | "tv" | undefined;

    // Recupera API Key da process.env o da tabella configurazioni di Supabase
    let apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      const { data: conf } = await supabase
        .from("configurazioni")
        .select("valore")
        .eq("chiave", "tmdb_api_key")
        .maybeSingle();
      if (conf?.valore && conf.valore.trim()) {
        apiKey = conf.valore.trim();
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Chiave TMDB_API_KEY non configurata. Inseriscila nelle variabili d'ambiente di Vercel (o in .env.local).",
          missing_key: true,
          candidates: [],
        },
        { status: 400 }
      );
    }

    if (tmdbId) {
      // Se viene passato tmdbId, recupera i dettagli completi del film/serie selezionato
      const details = await getTMDBMovieDetails(parseInt(tmdbId, 10), apiKey, mediaType);
      if (!details) {
        return NextResponse.json({ error: "Dettagli non trovati su TMDB" }, { status: 404 });
      }
      const formatted = formatCredits(details);
      return NextResponse.json({
        id: details.id,
        title: details.title,
        year: details.release_date ? parseInt(details.release_date.slice(0, 4), 10) : null,
        ...formatted,
      });
    }

    if (!query.trim()) {
      return NextResponse.json({ candidates: [] });
    }

    const candidates = await searchTMDBMovieCandidates(query, year, apiKey);
    return NextResponse.json({ candidates });
  } catch (err: any) {
    console.error("Errore ricerca candidati TMDB:", err);
    return NextResponse.json({ error: err.message || "Errore TMDB" }, { status: 500 });
  }
}
