import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchPosterForMovie, fetchDetailsForMovie } from "@/lib/tmdb";

export async function GET() {
  try {
    const supabase = await createClient();

    // Recupera tutti i film che non hanno la locandina
    const { data: missingPosters, error } = await supabase
      .from("films")
      .select("id, titolo, anno, poster_url, regista, attori")
      .or("poster_url.is.null,poster_url.eq.")
      .order("titolo", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      count: missingPosters?.length || 0,
      films: missingPosters || [],
    });
  } catch (err: any) {
    console.error("Errore recupero film senza poster:", err);
    return NextResponse.json(
      { error: err.message || "Errore recupero dati" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();

    // Controllo sicurezza Admin
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

    const { film_id, all, updateCast } = await request.json();

    if (all) {
      // Aggiorna tutte le locandine mancanti in bulk
      const { data: missingFilms } = await supabase
        .from("films")
        .select("id, titolo, anno, poster_url, attori, regista")
        .or("poster_url.is.null,poster_url.eq.");

      const updatedFilms: any[] = [];

      for (const film of missingFilms || []) {
        const result = await fetchPosterForMovie(film.titolo, film.anno);
        if (result.poster_url) {
          const updateData: Record<string, any> = {
            poster_url: result.poster_url,
          };

          // Se richiesto, aggiorna anche cast e regista se mancanti
          if (updateCast && (!film.attori || film.attori === "N/D")) {
            const details = await fetchDetailsForMovie(film.titolo, film.anno);
            if (details) {
              if (details.attori && details.attori !== "N/D") updateData.attori = details.attori;
              if (details.regista && details.regista !== "N/D") updateData.regista = details.regista;
            }
          }

          await supabase.from("films").update(updateData).eq("id", film.id);
          updatedFilms.push({ id: film.id, titolo: film.titolo, poster_url: result.poster_url });
        }
      }

      return NextResponse.json({
        success: true,
        updatedCount: updatedFilms.length,
        updatedFilms,
      });
    }

    if (film_id) {
      // Aggiorna singolo film
      const { data: film } = await supabase
        .from("films")
        .select("id, titolo, anno")
        .eq("id", film_id)
        .single();

      if (!film) {
        return NextResponse.json({ error: "Film non trovato" }, { status: 404 });
      }

      const result = await fetchPosterForMovie(film.titolo, film.anno);
      if (result.poster_url) {
        await supabase
          .from("films")
          .update({ poster_url: result.poster_url })
          .eq("id", film.id);

        return NextResponse.json({
          success: true,
          poster_url: result.poster_url,
        });
      } else {
        return NextResponse.json(
          { error: "Nessuna locandina trovata su TMDB per questo titolo" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({ error: "Parametro film_id o all mancante" }, { status: 400 });
  } catch (err: any) {
    console.error("Errore aggiornamento locandine:", err);
    return NextResponse.json(
      { error: err.message || "Errore aggiornamento locandine" },
      { status: 500 }
    );
  }
}
