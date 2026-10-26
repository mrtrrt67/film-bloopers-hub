import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    const filter = searchParams.get("filter") || "all";

    let req = supabase.from("films").select("id, titolo, anno, regista, genere, trama, poster_url, attori, creato_il");

    if (query.trim()) {
      req = req.or(`titolo.ilike.%${query.trim()}%,regista.ilike.%${query.trim()}%,genere.ilike.%${query.trim()}%`);
    }

    if (filter === "missing_poster") {
      req = req.or("poster_url.is.null,poster_url.eq.");
    } else if (filter === "missing_cast") {
      req = req.or("attori.is.null,attori.eq.");
    }

    req = req.order("titolo", { ascending: true });

    const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const db = hasServiceKey ? createAdminClient() : supabase;

    const [filmsRes, triviaRes, bloopersRes] = await Promise.all([
      req,
      db.from("movie_trivia").select("film_id"),
      db.from("errori").select("film_id"),
    ]);

    if (filmsRes.error) throw filmsRes.error;

    const triviaCountMap: Record<number, number> = {};
    for (const t of triviaRes.data || []) {
      triviaCountMap[Number(t.film_id)] = (triviaCountMap[Number(t.film_id)] || 0) + 1;
    }

    const bloopersCountMap: Record<number, number> = {};
    for (const b of bloopersRes.data || []) {
      bloopersCountMap[Number(b.film_id)] = (bloopersCountMap[Number(b.film_id)] || 0) + 1;
    }

    let films = (filmsRes.data || []).map((film: any) => ({
      ...film,
      trivia_count: triviaCountMap[Number(film.id)] || 0,
      bloopers_count: bloopersCountMap[Number(film.id)] || 0,
    }));

    if (filter === "with_trivia") {
      films = films.filter((f: any) => f.trivia_count > 0);
    } else if (filter === "missing_trivia") {
      films = films.filter((f: any) => f.trivia_count === 0);
    }

    return NextResponse.json({ films });
  } catch (err: any) {
    console.error("Errore recupero archivio film:", err);
    return NextResponse.json({ error: err.message || "Errore film" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

    const body = await request.json();
    const { id, titolo, anno, regista, genere, trama, poster_url, attori } = body;

    if (!id) {
      return NextResponse.json({ error: "ID film mancante" }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {};
    if (titolo !== undefined) updatePayload.titolo = titolo;
    if (anno !== undefined) updatePayload.anno = anno ? parseInt(String(anno), 10) : null;
    if (regista !== undefined) updatePayload.regista = regista;
    if (genere !== undefined) updatePayload.genere = genere;
    if (trama !== undefined) updatePayload.trama = trama;
    if (poster_url !== undefined) updatePayload.poster_url = poster_url || null;
    if (attori !== undefined) updatePayload.attori = attori;

    const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;
    const { data, error } = await adminClient
      .from("films")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, film: data });
  } catch (err: any) {
    console.error("Errore aggiornamento film:", err);
    return NextResponse.json({ error: err.message || "Errore salvataggio" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");

    if (!idParam) {
      return NextResponse.json({ error: "ID film mancante" }, { status: 400 });
    }

    const filmId = parseInt(idParam, 10);
    const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;

    // 1. Elimina prima i voti/contestazioni legati agli errori di questo film
    const { data: erroriFilm } = await adminClient
      .from("errori")
      .select("id")
      .eq("film_id", filmId);

    if (erroriFilm && erroriFilm.length > 0) {
      const erroreIds = erroriFilm.map((e) => e.id);
      await adminClient.from("voti_bloopers").delete().in("errore_id", erroreIds);
    }

    // 2. Elimina gli errori del film
    await adminClient.from("errori").delete().eq("film_id", filmId);

    // 3. Elimina il film verificando con .select() che la riga sia stata effettivamente cancellata
    const { data: deleted, error } = await adminClient
      .from("films")
      .delete()
      .eq("id", filmId)
      .select();

    if (error) {
      console.error("Errore Postgres DELETE film:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!deleted || deleted.length === 0) {
      return NextResponse.json(
        {
          error:
            "L'eliminazione è stata bloccata dalle policy di sicurezza RLS (Row Level Security) del tuo database Supabase. Per consentire la cancellazione definitiva dei film, aggiungi la chiave SUPABASE_SERVICE_ROLE_KEY su Vercel oppure esegui il comando SQL 'CREATE POLICY' nel pannello Supabase.",
          requiresRlsPolicy: true,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, deletedId: filmId, deleted: deleted[0] });
  } catch (err: any) {
    console.error("Errore eliminazione film:", err);
    return NextResponse.json({ error: err.message || "Errore eliminazione" }, { status: 500 });
  }
}
