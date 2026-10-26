import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTriviaForMovie } from "@/lib/gemini";

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

    // 1. Recupera tutti i film
    const { data: allFilms, error: errFilms } = await db
      .from("films")
      .select("id")
      .order("id", { ascending: true });

    if (errFilms) throw errFilms;

    // 2. Recupera gli ID dei film con curiosità
    const { data: existingTrivia, error: errTrivia } = await db
      .from("movie_trivia")
      .select("film_id");

    if (errTrivia) throw errTrivia;

    const filmIdsWithTrivia = new Set((existingTrivia || []).map((t: any) => Number(t.film_id)));
    const missingFilms = (allFilms || []).filter((f: any) => !filmIdsWithTrivia.has(Number(f.id)));

    return NextResponse.json({
      totalFilms: allFilms?.length || 0,
      withTriviaCount: filmIdsWithTrivia.size,
      missingTriviaCount: missingFilms.length,
    });
  } catch (err: any) {
    console.error("Errore verifica curiosità mancanti:", err);
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
    const limit = Math.min(Number(body?.limit) || 5, 10); // Massimo 10 per volta per sicurezza timeout

    // 1. Recupera film senza curiosità
    const { data: allFilms, error: errFilms } = await db
      .from("films")
      .select("id, titolo, anno, regista, attori, trama")
      .order("id", { ascending: true });

    if (errFilms) throw errFilms;

    const { data: existingTrivia, error: errTrivia } = await db
      .from("movie_trivia")
      .select("film_id");

    if (errTrivia) throw errTrivia;

    const filmIdsWithTrivia = new Set((existingTrivia || []).map((t: any) => Number(t.film_id)));
    const candidateFilms = (allFilms || []).filter((f: any) => !filmIdsWithTrivia.has(Number(f.id)));

    if (candidateFilms.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Tutti i film presenti nel catalogo hanno già almeno una curiosità!",
        processedCount: 0,
        totalTriviaGenerated: 0,
        remainingFilmsWithoutTrivia: 0,
        results: [],
      });
    }

    const batch = candidateFilms.slice(0, limit);
    const results: Array<{ film_id: number; titolo: string; generated: number; error?: string }> = [];
    let totalGenerated = 0;

    for (let i = 0; i < batch.length; i++) {
      const film = batch[i];

      try {
        const genResult = await generateTriviaForMovie({
          titolo: film.titolo,
          anno: film.anno,
          regista: film.regista,
          attori: film.attori,
          trama: film.trama,
          triviaEsistenti: [],
        });

        const { trivia, modelUsed, executionTimeSec, error: genError } = genResult;

        if (genError || !trivia || trivia.length === 0) {
          try {
            await db.from("log_errori_ia").insert({
              utente: user?.email || "admin",
              film: film.titolo,
              modello: modelUsed || "gemini",
              operazione: "Generazione Curiosità (Batch)",
              errore_dettaglio: genError || "Nessuna curiosità generata",
            });
          } catch {}

          results.push({
            film_id: film.id,
            titolo: film.titolo,
            generated: 0,
            error: genError || "Nessuna curiosità generata",
          });
          continue;
        }

        const daInserire = trivia.map((g, idx) => ({
          film_id: film.id,
          categoria: g.categoria,
          titolo: g.titolo,
          descrizione: g.descrizione,
          fonte: g.fonte || "Dietro le quinte",
          approvato: true,
          inserito_da: "IA (Batch Admin)",
          provenienza: "ia",
          likes: Math.floor(Math.random() * 8) + 1, // Piccolo boost like iniziale per credibilità
          ordine: idx + 1,
        }));

        let insertErr = null;
        if (hasServiceKey) {
          const res = await db.from("movie_trivia").insert(daInserire);
          insertErr = res.error;
        }

        if (!hasServiceKey || insertErr) {
          const resUser = await supabase.from("movie_trivia").insert(daInserire);
          insertErr = resUser.error;
        }

        if (insertErr) {
          results.push({
            film_id: film.id,
            titolo: film.titolo,
            generated: 0,
            error: insertErr.message,
          });
        } else {
          totalGenerated += trivia.length;
          results.push({
            film_id: film.id,
            titolo: film.titolo,
            generated: trivia.length,
          });

          // Log statistiche
          if (modelUsed) {
            try {
              await db.from("statistiche_ia").insert({
                modello: modelUsed,
                tempo_esecuzione: executionTimeSec || 1.5,
              });
            } catch {}
          }
        }
      } catch (err: any) {
        try {
          await db.from("log_errori_ia").insert({
            utente: user?.email || "admin",
            film: film.titolo,
            modello: "gemini",
            operazione: "Generazione Curiosità (Batch)",
            errore_dettaglio: err.message || "Errore imprevisto",
          });
        } catch {}

        results.push({
          film_id: film.id,
          titolo: film.titolo,
          generated: 0,
          error: err.message,
        });
      }

      // Piccola pausa di 1 secondo tra le chiamate per rispetto dei rate limit
      if (i < batch.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const remainingCount = candidateFilms.length - results.filter((r) => r.generated > 0).length;

    return NextResponse.json({
      success: true,
      processedCount: results.filter((r) => r.generated > 0).length,
      totalTriviaGenerated: totalGenerated,
      remainingFilmsWithoutTrivia: Math.max(0, remainingCount),
      results,
    });
  } catch (err: any) {
    console.error("Errore batch trivia:", err);
    return NextResponse.json({ error: err.message || "Errore elaborazione batch" }, { status: 500 });
  }
}
