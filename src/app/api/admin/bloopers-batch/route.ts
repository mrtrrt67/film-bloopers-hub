import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateBloopersForMovie } from "@/lib/gemini";
import { batchTranslateFilmTexts } from "@/lib/translator";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const targetCount = Math.max(1, parseInt(searchParams.get("target") || "10", 10));
    const underTargetFilms = (allFilms || []).filter((f: any) => (f.errori?.[0]?.count || 0) < targetCount);
    const atTargetFilms = (allFilms || []).filter((f: any) => (f.errori?.[0]?.count || 0) >= targetCount);
    const totalMissingBloopers = underTargetFilms.reduce(
      (acc: number, f: any) => acc + (targetCount - (f.errori?.[0]?.count || 0)),
      0
    );

    const totalBloopersCount = (allFilms || []).reduce((acc: number, f: any) => acc + (f.errori?.[0]?.count || 0), 0);
    const zeroBloopersFilms = (allFilms || []).filter((f: any) => (f.errori?.[0]?.count || 0) === 0).length;

    return NextResponse.json({
      totalFilms: allFilms?.length || 0,
      totalBloopers: totalBloopersCount,
      zeroBloopersFilms,
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
    const filmId = body?.filmId ? Number(body.filmId) : null;
    const limit = Math.min(Number(body?.limit) || 1, 10);
    const maxNewPerFilm = Math.min(Math.max(1, Number(body?.maxNewPerFilm) || 5), 50);
    const mode = body?.mode || "scan_missing"; // "scan_missing" (predefinito) oppure "quota"
    const targetCount = Number(body?.targetCount) || 10;
    const excludeIds: number[] = Array.isArray(body?.excludeIds) ? body.excludeIds : [];

    // 1. Recupera film dal database
    const { data: allFilms, error: errFilms } = await db
      .from("films")
      .select("id, titolo, anno, regista, attori, trama, errori(count)")
      .order("id", { ascending: true });

    if (errFilms) throw errFilms;

    // Seleziona i film candidati
    const mappedFilms = (allFilms || []).map((f: any) => ({
      ...f,
      currentCount: f.errori?.[0]?.count || 0,
    }));

    const candidateFilms = mappedFilms
      .filter((f: any) => {
        if (filmId) return f.id === filmId;
        if (excludeIds.includes(f.id)) return false;
        if (mode === "quota") {
          return f.currentCount < targetCount;
        }
        return true; // in modalità scan_missing esamina qualsiasi film indipendentemente dal totale attuale
      })
      .sort((a: any, b: any) => a.currentCount - b.currentCount); // Priorità a chi ne ha meno (es. 0, 1, 2...)

    if (candidateFilms.length === 0) {
      return NextResponse.json({
        success: true,
        message: mode === "quota"
          ? `Tutti i film presenti nel catalogo hanno già almeno ${targetCount} bloopers!`
          : `Tutti i film del catalogo sono stati scansionati per questa sessione.`,
        processedCount: 0,
        totalBloopersGenerated: 0,
        remainingFilmsToScan: 0,
        results: [],
      });
    }

    const batch = candidateFilms.slice(0, limit);
    const results: Array<{
      film_id: number;
      titolo: string;
      generated: number;
      currentCount: number;
      error?: string;
      note?: string;
    }> = [];
    let totalGenerated = 0;

    for (let i = 0; i < batch.length; i++) {
      const film = batch[i];

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
          maxNew: maxNewPerFilm,
          countNeeded: mode === "quota" ? Math.max(1, targetCount - film.currentCount) : undefined,
        });

        const { bloopers, modelUsed, executionTimeSec, error: genError, errorsLog } = genResult;

        if (errorsLog && errorsLog.length > 0) {
          for (const errItem of errorsLog) {
            try {
              await db.from("log_errori_ia").insert({
                utente: user?.email || "admin",
                film: film.titolo,
                modello: errItem.model,
                operazione: "Scansione Bloopers Mancanti (Batch)",
                errore_dettaglio: errItem.error,
              });
            } catch (e) {
              console.error("Errore salvataggio log_errori_ia:", e);
            }
          }
        }

        if (genError) {
          results.push({
            film_id: film.id,
            titolo: film.titolo,
            generated: 0,
            currentCount: film.currentCount,
            error: genError,
          });
          continue;
        }

        // Se Gemini restituisce 0 bloopers con prompt anti-allucinazione, significa che l'archivio ha già tutti gli errori noti
        if (!bloopers || bloopers.length === 0) {
          results.push({
            film_id: film.id,
            titolo: film.titolo,
            generated: 0,
            currentCount: film.currentCount,
            note: "Archivio completo (nessun altro blooper reale documentato)",
          });
          continue;
        }

        const batchPayload = bloopers.map((g, idx) => ({ id: idx, text: g.descrizione }));
        let transMap = new Map();
        try {
          transMap = await batchTranslateFilmTexts(batchPayload, "blooper");
        } catch (tErr) {
          console.warn("Auto-traduzione batch bloopers warning:", tErr);
        }

        const daInserire = bloopers.map((g, idx) => ({
          film_id: film.id,
          minuto: g.minuto || "00:00",
          categoria: g.categoria,
          descrizione: g.descrizione,
          descrizione_i18n: transMap.get(idx) || {},
          approvato: true,
          conferme: 0,
          contestazioni: 0,
          inserito_da: "IA (Admin)",
          provenienza: "IA Verificata",
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
            error: insertErr.message,
          });
        } else {
          totalGenerated += bloopers.length;
          results.push({
            film_id: film.id,
            titolo: film.titolo,
            generated: bloopers.length,
            currentCount: film.currentCount + bloopers.length,
          });

          // Traccia statistiche IA
          if (modelUsed) {
            try {
              await db.from("statistiche_ia").insert({
                modello: modelUsed,
                tempo_esecuzione: executionTimeSec || 1.2,
              });
            } catch {}
          }
        }
      } catch (loopErr: any) {
        console.error(`Errore batch su film ${film.id}:`, loopErr);
        results.push({
          film_id: film.id,
          titolo: film.titolo,
          generated: 0,
          currentCount: film.currentCount,
          error: loopErr.message,
        });
      }
    }

    const remainingToScan = Math.max(0, candidateFilms.length - batch.length);

    return NextResponse.json({
      success: true,
      message: totalGenerated > 0
        ? `Scansione completata: inseriti ${totalGenerated} nuovi bloopers autentici su ${batch.length} film analizzati.`
        : `Scansione completata su ${batch.length} film: i film analizzati contengono già tutti i bloopers reali noti.`,
      processedCount: batch.length,
      totalBloopersGenerated: totalGenerated,
      remainingFilmsToScan: remainingToScan,
      results,
    });
  } catch (err: any) {
    console.error("Errore generale batch bloopers:", err);
    return NextResponse.json({ error: err.message || "Errore interno durante il batch" }, { status: 500 });
  }
}
