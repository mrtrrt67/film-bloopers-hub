import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchPosterForMovie, fetchDetailsForMovie } from "@/lib/tmdb";

export async function GET() {
  try {
    const supabase = await createClient();

    // Recupera tutti i film che non hanno la locandina
    const { data: missingPosters, error: errPosters } = await supabase
      .from("films")
      .select("id, titolo, anno, poster_url, regista, attori")
      .or("poster_url.is.null,poster_url.eq.")
      .order("titolo", { ascending: true });

    if (errPosters) throw errPosters;

    // Recupera tutti i film che non hanno il cast
    const { data: missingCast, error: errCast } = await supabase
      .from("films")
      .select("id, titolo, anno, poster_url, regista, attori")
      .or("attori.is.null,attori.eq.")
      .order("titolo", { ascending: true });

    if (errCast) throw errCast;

    return NextResponse.json({
      missingPostersCount: missingPosters?.length || 0,
      missingPosters: missingPosters || [],
      missingCastCount: missingCast?.length || 0,
      missingCast: missingCast || [],
      // retrocompatibilità
      count: missingPosters?.length || 0,
      films: missingPosters || [],
    });
  } catch (err: any) {
    console.error("Errore recupero film senza poster o cast:", err);
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

    const adminDb = createAdminClient();
    const { film_id, all, action, updateCast } = await request.json();

    // 1. Aggiornamento in massa del CAST mancante
    if (action === "bulk_cast" || (all && action === "cast")) {
      const { data: missingCastFilms } = await adminDb
        .from("films")
        .select("id, titolo, anno, attori, regista")
        .or("attori.is.null,attori.eq.");

      const updatedFilms: any[] = [];
      for (const film of missingCastFilms || []) {
        const details = await fetchDetailsForMovie(film.titolo, film.anno);
        if (details?.attori && details.attori !== "N/D") {
          const up: Record<string, any> = { attori: details.attori };
          if (!film.regista || film.regista === "N/D") {
            if (details.regista && details.regista !== "N/D") up.regista = details.regista;
          }
          await adminDb.from("films").update(up).eq("id", film.id);
          updatedFilms.push({ id: film.id, titolo: film.titolo, attori: details.attori });
        }
      }

      return NextResponse.json({
        success: true,
        updatedCount: updatedFilms.length,
        updatedFilms,
      });
    }

    // 2. Aggiornamento cast per SINGOLO film
    if (film_id && action === "cast") {
      const { data: film } = await adminDb
        .from("films")
        .select("id, titolo, anno, regista")
        .eq("id", film_id)
        .single();

      if (!film) return NextResponse.json({ error: "Film non trovato" }, { status: 404 });

      const details = await fetchDetailsForMovie(film.titolo, film.anno);
      if (details?.attori && details.attori !== "N/D") {
        const up: Record<string, any> = { attori: details.attori };
        if (!film.regista || film.regista === "N/D") {
          if (details.regista && details.regista !== "N/D") up.regista = details.regista;
        }
        await adminDb.from("films").update(up).eq("id", film.id);
        return NextResponse.json({ success: true, attori: details.attori });
      }

      return NextResponse.json({ error: "Cast non trovato su TMDB" }, { status: 404 });
    }

    // 3. Aggiornamento in massa delle LOCANDINE
    if (all) {
      const { data: missingFilms } = await adminDb
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

          if (updateCast && (!film.attori || film.attori === "N/D")) {
            const details = await fetchDetailsForMovie(film.titolo, film.anno);
            if (details) {
              if (details.attori && details.attori !== "N/D") updateData.attori = details.attori;
              if (details.regista && details.regista !== "N/D") updateData.regista = details.regista;
            }
          }

          await adminDb.from("films").update(updateData).eq("id", film.id);
          updatedFilms.push({ id: film.id, titolo: film.titolo, poster_url: result.poster_url });
        }
      }

      return NextResponse.json({
        success: true,
        updatedCount: updatedFilms.length,
        updatedFilms,
      });
    }

    // 4. Aggiornamento singola locandina
    if (film_id) {
      const { data: film } = await adminDb
        .from("films")
        .select("id, titolo, anno")
        .eq("id", film_id)
        .single();

      if (!film) {
        return NextResponse.json({ error: "Film non trovato" }, { status: 404 });
      }

      const result = await fetchPosterForMovie(film.titolo, film.anno);
      if (result.poster_url) {
        await adminDb
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

    return NextResponse.json({ error: "Parametro non valido" }, { status: 400 });
  } catch (err: any) {
    console.error("Errore aggiornamento locandine:", err);
    return NextResponse.json(
      { error: err.message || "Errore aggiornamento locandine" },
      { status: 500 }
    );
  }
}
