import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateBloopersForMovie } from "@/lib/gemini";

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

    // 1. Recupera tutti i film con conteggio bloopers (errori)
    const { data: allFilms, error: errFilms } = await db
      .from("films")
      .select("id, errori(count)")
      .order("id", { ascending: true });

    if (errFilms) throw errFilms;

    const targetCount = 10;
    const underTargetFilms = (allFilms || []).filter((f: any) => (f.errori?.[0]?.count || 0) < targetCount);
    const atTargetFilms = (allFilms || []).filter((f: any) => (f.errori?.[0]?.count || 0) >= targetCount);
    const totalMissingBloopers = underTargetFilms.reduce(
      (acc: number, f: any) => acc + (targetCount - (f.errori?.[0]?.count || 0)),
      0
    );

    return NextResponse.json({
      totalFilms: allFilms?.length || 0,
      withBloopersCount: atTargetFilms.length,
      missingBloopersCount: underTargetFilms.length,
      underTargetFilmsCount: underTargetFilms.length,
      totalMissingBloopers,
      targetCount,
    });
  } catch (err: any) {
    console.error("Errore verifica bloopers mancanti:", err);
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
    const limit = Math.min(Number(body?.limit) || 1, 10);
    const targetCount = Number(body?.targetCount) || 10;

    // 1. Recupera film che hanno meno di targetCount bloopers
    const { data: allFilms, error: errFilms } = await db
      .from("films")
      .select("id, titolo, anno, regista, attori, trama, errori(count)")
      .order("id", { ascending: true });

    if (errFilms) throw errFilms;

    // Ordina i film per minor numero di bloopers esistenti (prima chi ne ha 1, 2, 3...)
    const candidateFilms = (allFilms || [])
      .map((f: any) => ({
        ...f,
        currentCount: f.errori?.[0]?.count || 0,
      }))
      .filter((f: any) => f.currentCount < targetCount)
      .sort((a: any, b: any) => a.currentCount - b.currentCount);

    if (candidateFilms.length === 0) {
      return NextResponse.json({
        success: true,
        message: `Tutti i film presenti nel catalogo hanno già almeno ${targetCount} bloopers!`,
        processedCount: 0,
        totalBloopersGenerated: 0,
        remainingFilmsWithoutBloopers: 0,
        remainingFilmsUnderTarget: 0,
        results: [],
      });
    }

    const batch = candidateFilms.slice(0, limit);
    const results: Array<{ film_id: number; titolo: string; generated: number; currentCount: number; targetCount: number; error?: string }> = [];
    let totalGenerated = 0;

    for (let i = 0; i < batch.length; i++) {
      const film = batch[i];
      const countNeeded = Math.max(1, targetCount - film.currentCount);

      try {
        const { data: existingBloopers } = await db
          .from("errori")
          .select("descrizione")
          .eq("film_id", film.id);

        const descrizioniEsistenti = (existingBloopers || []).map((e: any) => e.descrizione);

        const genResult = await generateBloopersForMovie({
          titolo: film.titolo,
          anno: film.anno,
          regista: film.regista,
          attori: film.attori,
          trama: film.trama,
          erroriEsistenti: descrizioniEsistenti,
          countNeeded,
        });

        const { bloopers, modelUsed, executionTimeSec, error: genError, errorsLog } = genResult;

        // Traccia ogni eventuale errore per modello in log_errori_ia
        if (errorsLog && errorsLog.length > 0) {
          for (const errItem of errorsLog) {
            try {
              await db.from("log_errori_ia").insert({
                utente: user?.email || "admin",
                film: film.titolo,
                modello: errItem.model,
                operazione: "Generazione Bloopers (Batch)",
                errore_dettaglio: errItem.error,
              });
            } catch (e) {
              console.error("Errore salvataggio log_errori_ia:", e);
            }
          }
        }

        if (genError || !bloopers || bloopers.length === 0) {
          try {
            await db.from("log_errori_ia").insert({
              utente: user?.email || "admin",
              film: film.titolo,
              modello: modelUsed || "gemini",
              operazione: "Generazione Bloopers (Batch)",
              errore_dettaglio: genError || "Nessun blooper generato",
            });
          } catch {}

          results.push({
            film_id: film.id,
            titolo: film.titolo,
            generated: 0,
            currentCount: film.currentCount,
            targetCount,
            error: genError || "Nessun blooper generato",
          });
          continue;
        }

        const daInserire = bloopers.map((g) => ({
          film_id: film.id,
          minuto: g.minuto || "00:00",
          categoria: g.categoria,
          descrizione: g.descrizione,
          approvato: true,
          conferme: 0,
          contestazioni: 0,
          inserito_da: "IA (Batch Admin)",
          provenienza: "ia",
        }));

        let insertErr = null;
        if (hasServiceKey) {
          const res = await db.from("errori").insert(daInserire);
          insertErr = res.error;
        }

        if (!hasServiceKey || insertErr) {
          const resUser = await supabase.from("errori").insert(daInserire);
          insertErr = resUser.error;
        }

        if (insertErr) {
          results.push({
            film_id: film.id,
            titolo: film.titolo,
            generated: 0,
            currentCount: film.currentCount,
            targetCount,
            error: insertErr.message,
          });
        } else {
          totalGenerated += bloopers.length;
          results.push({
            film_id: film.id,
            titolo: film.titolo,
            generated: bloopers.length,
            currentCount: film.currentCount + bloopers.length,
            targetCount,
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
            operazione: "Generazione Bloopers (Batch)",
            errore_dettaglio: err.message || "Errore imprevisto",
          });
        } catch {}

        results.push({
          film_id: film.id,
          titolo: film.titolo,
          generated: 0,
          currentCount: film.currentCount,
          targetCount,
          error: err.message,
        });
      }

      // Pausa di 1 secondo tra le chiamate per rispetto dei rate limit
      if (i < batch.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const remainingCount = candidateFilms.length - results.filter((r) => r.generated > 0).length;

    return NextResponse.json({
      success: true,
      processedCount: results.filter((r) => r.generated > 0).length,
      totalBloopersGenerated: totalGenerated,
      remainingFilmsWithoutBloopers: Math.max(0, remainingCount),
      remainingFilmsUnderTarget: Math.max(0, remainingCount),
      results,
    });
  } catch (err: any) {
    console.error("Errore batch bloopers:", err);
    return NextResponse.json({ error: err.message || "Errore elaborazione batch" }, { status: 500 });
  }
}
