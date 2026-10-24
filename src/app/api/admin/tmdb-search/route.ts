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

    if (tmdbId) {
      // Se viene passato tmdbId, recupera i dettagli completi del film selezionato
      const details = await getTMDBMovieDetails(parseInt(tmdbId, 10));
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

    const candidates = await searchTMDBMovieCandidates(query, year);
    return NextResponse.json({ candidates });
  } catch (err: any) {
    console.error("Errore ricerca candidati TMDB:", err);
    return NextResponse.json({ error: err.message || "Errore TMDB" }, { status: 500 });
  }
}
