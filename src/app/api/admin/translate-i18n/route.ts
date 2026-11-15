import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { batchTranslateFilmTexts } from "@/lib/translator";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

    const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const db = hasServiceKey ? createAdminClient() : supabase;

    // Recupera bloopers e curiosità con traduzioni mancanti
    const [bloopersRes, triviaRes] = await Promise.all([
      db.from("errori").select("id, film_id, descrizione_i18n"),
      db.from("movie_trivia").select("id, film_id, descrizione_i18n, titolo_i18n"),
    ]);

    const bloopers = bloopersRes.data || [];
    const trivia = triviaRes.data || [];

    const missingB = bloopers.filter((b: any) => !b.descrizione_i18n || !b.descrizione_i18n.en || Object.keys(b.descrizione_i18n).length < 2);
    const missingT = trivia.filter((t: any) => !t.descrizione_i18n || !t.descrizione_i18n.en || Object.keys(t.descrizione_i18n).length < 2);

    const filmMap: Record<number, { missingBloopers: number; missingTrivia: number }> = {};
    for (const b of missingB) {
      if (!filmMap[b.film_id]) filmMap[b.film_id] = { missingBloopers: 0, missingTrivia: 0 };
      filmMap[b.film_id].missingBloopers++;
    }
    for (const t of missingT) {
      if (!filmMap[t.film_id]) filmMap[t.film_id] = { missingBloopers: 0, missingTrivia: 0 };
      filmMap[t.film_id].missingTrivia++;
    }

    const filmIds = Object.keys(filmMap).map(Number);

    return NextResponse.json({
      missingBloopersCount: missingB.length,
      missingTriviaCount: missingT.length,
      filmsNeedingTranslationCount: filmIds.length,
      filmIds,
    });
  } catch (err: any) {
    console.error("Errore verifica traduzioni mancanti:", err);
    return NextResponse.json({ error: err.message || "Errore interno" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

    const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const db = hasServiceKey ? createAdminClient() : supabase;

    const body = await request.json().catch(() => ({}));
    const filmId = body?.filmId ? Number(body.filmId) : null;
    const limit = Math.min(Math.max(1, Number(body?.limit) || 1), 5);
    const excludeIds: number[] = Array.isArray(body?.excludeIds) ? body.excludeIds : [];

    let targetFilms: Array<{ id: number; titolo: string; anno?: number }> = [];

    if (filmId) {
      const { data: singleFilm } = await db
        .from("films")
        .select("id, titolo, anno")
        .eq("id", filmId)
        .maybeSingle();

      if (!singleFilm) {
        return NextResponse.json({ error: "Film non trovato" }, { status: 404 });
      }
      targetFilms = [singleFilm];
    } else {
      // Trova i film con bloopers o curiosità non tradotte
      const [bloopersRes, triviaRes] = await Promise.all([
        db.from("errori").select("id, film_id, descrizione_i18n"),
        db.from("movie_trivia").select("id, film_id, descrizione_i18n"),
      ]);

      const untranslatedFilmIds = new Set<number>();
      for (const b of (bloopersRes.data || [])) {
        if (!b.descrizione_i18n || !b.descrizione_i18n.en || Object.keys(b.descrizione_i18n).length < 2) {
          untranslatedFilmIds.add(b.film_id);
        }
      }
      for (const t of (triviaRes.data || [])) {
        if (!t.descrizione_i18n || !t.descrizione_i18n.en || Object.keys(t.descrizione_i18n).length < 2) {
          untranslatedFilmIds.add(t.film_id);
        }
      }

      const candidateIds = Array.from(untranslatedFilmIds)
        .filter((id) => !excludeIds.includes(id))
        .sort((a, b) => b - a); // Priorità ai più recenti per ID decrescente

      if (candidateIds.length === 0) {
        return NextResponse.json({
          success: true,
          message: "Tutti i film hanno già le traduzioni complete!",
          processedFilms: [],
          totalBloopersUpdated: 0,
          totalTriviaUpdated: 0,
          remainingFilmsCount: 0,
        });
      }

      const batchIds = candidateIds.slice(0, limit);
      const { data: filmsData } = await db
        .from("films")
        .select("id, titolo, anno")
        .in("id", batchIds)
        .order("id", { ascending: false });

      targetFilms = (filmsData as any[]) || [];
    }

    const processedResults: Array<{
      film_id: number;
      titolo: string;
      bloopersUpdated: number;
      triviaUpdated: number;
      error?: string;
    }> = [];

    let totalBloopersUpdated = 0;
    let totalTriviaUpdated = 0;

    for (const film of targetFilms) {
      try {
        // 1. Bloopers da tradurre
        const { data: bloopers } = await db
          .from("errori")
          .select("id, descrizione, descrizione_i18n")
          .eq("film_id", film.id);

        const bloopersToTranslate = (bloopers || []).filter(
          (b: any) => !b.descrizione_i18n || !b.descrizione_i18n.en || Object.keys(b.descrizione_i18n).length < 2
        );

        let filmBloopersUpdated = 0;
        if (bloopersToTranslate.length > 0) {
          const payload = bloopersToTranslate.map((b: any) => ({ id: b.id, text: b.descrizione }));
          const translations = await batchTranslateFilmTexts(payload, "blooper");

          for (const b of bloopersToTranslate) {
            const transObj = translations.get(b.id) || translations.get(String(b.id));
            if (transObj && (transObj.en || transObj.it)) {
              await db
                .from("errori")
                .update({ descrizione_i18n: transObj })
                .eq("id", b.id);
              filmBloopersUpdated++;
            }
          }
        }

        // 2. Curiosità da tradurre
        const { data: trivia } = await db
          .from("movie_trivia")
          .select("id, titolo, descrizione, titolo_i18n, descrizione_i18n")
          .eq("film_id", film.id);

        const triviaToTranslate = (trivia || []).filter(
          (t: any) => !t.descrizione_i18n || !t.descrizione_i18n.en || Object.keys(t.descrizione_i18n).length < 2
        );

        let filmTriviaUpdated = 0;
        if (triviaToTranslate.length > 0) {
          const descPayload = triviaToTranslate.map((t: any) => ({ id: t.id, text: t.descrizione }));
          const titlePayload = triviaToTranslate.map((t: any) => ({ id: t.id, text: t.titolo }));

          const [descTrans, titleTrans] = await Promise.all([
            batchTranslateFilmTexts(descPayload, "trivia"),
            batchTranslateFilmTexts(titlePayload, "trivia"),
          ]);

          for (const t of triviaToTranslate) {
            const dObj = descTrans.get(t.id) || descTrans.get(String(t.id));
            const tObj = titleTrans.get(t.id) || titleTrans.get(String(t.id));

            if (dObj && (dObj.en || dObj.it)) {
              const updateData: Record<string, any> = { descrizione_i18n: dObj };
              if (tObj) updateData.titolo_i18n = tObj;

              await db
                .from("movie_trivia")
                .update(updateData)
                .eq("id", t.id);
              filmTriviaUpdated++;
            }
          }
        }

        try {
          revalidatePath("/");
          revalidatePath("/film/[slug]", "page");
        } catch {}

        totalBloopersUpdated += filmBloopersUpdated;
        totalTriviaUpdated += filmTriviaUpdated;

        processedResults.push({
          film_id: film.id,
          titolo: film.titolo,
          bloopersUpdated: filmBloopersUpdated,
          triviaUpdated: filmTriviaUpdated,
        });
      } catch (fErr: any) {
        console.error(`Errore traduzione film ${film.id}:`, fErr);
        processedResults.push({
          film_id: film.id,
          titolo: film.titolo,
          bloopersUpdated: 0,
          triviaUpdated: 0,
          error: fErr.message || "Errore traduzione",
        });
      }
    }

    return NextResponse.json({
      success: true,
      processedFilms: processedResults,
      totalBloopersUpdated,
      totalTriviaUpdated,
    });
  } catch (err: any) {
    console.error("Errore route translate-i18n:", err);
    return NextResponse.json({ error: err.message || "Errore server" }, { status: 500 });
  }
}
