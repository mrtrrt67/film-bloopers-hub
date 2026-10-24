import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateBloopersForMovie } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const adminDb = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { film_id, titolo, anno, regista, attori, trama } = body;

    if (!film_id || !titolo) {
      return NextResponse.json(
        { error: "film_id e titolo sono obbligatori." },
        { status: 400 }
      );
    }

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    const isUserAdmin = user && user.email && user.email.toLowerCase() === adminEmail;
    const today = new Date().toISOString().slice(0, 10);

    // 1. Verifica quota per utenti non admin
    if (user && !isUserAdmin) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        const prof = profile as any;
        const scad = prof.data_scadenza || prof.expires_at ? String(prof.data_scadenza || prof.expires_at).slice(0, 10) : null;
        const sub = prof.tipo_abbonamento || prof.subscription_type || "nessuno";
        const isExpired = sub === "mensile" && scad ? scad < today : false;

        if (isExpired && prof.tier !== "free") {
          try {
            await adminDb.from("profiles").update({
              tier: "free",
              tipo_abbonamento: "nessuno",
              subscription_type: "nessuno",
            }).eq("id", user.id);
          } catch {}
        }

        const isFree = (prof.tier || "free") === "free" || isExpired;
        const callsToday = prof.last_reset_date === today ? prof.calls_today || 0 : 0;

        if (isFree && callsToday >= 15) {
          return NextResponse.json(
            { error: "Hai raggiunto il limite giornaliero di 15 generazioni per il piano Free. Passa a Premium per generazioni illimitate!" },
            { status: 429 }
          );
        }

        // Incrementa chiamate solo per utenti non admin
        await adminDb
          .from("profiles")
          .update({
            calls_today: callsToday + 1,
            last_reset_date: today,
          })
          .eq("id", user.id);
      }
    }

    // 2. Recupera errori già presenti a DB per evitare duplicati
    const { data: existingBloopers } = await supabase
      .from("errori")
      .select("descrizione")
      .eq("film_id", film_id);

    const descrizioniEsistenti = (existingBloopers || []).map((e: any) => e.descrizione);

    // 3. Chiamata specializzata a Gemini con contesto TMDB
    const genResult = await generateBloopersForMovie({
      titolo,
      anno,
      regista,
      attori,
      trama,
      erroriEsistenti: descrizioniEsistenti,
    });

    const { bloopers: generati, error: genError, modelUsed, executionTimeSec, errorsLog } = genResult;

    // 4. Se ci sono stati errori parziali o totali, registrali in log_errori_ia
    if (errorsLog && errorsLog.length > 0) {
      for (const errItem of errorsLog) {
        try {
          await adminDb.from("log_errori_ia").insert({
            utente: user?.email || "ospite",
            film: titolo,
            modello: errItem.model,
            operazione: "Ricerca Bloopers",
            errore_dettaglio: errItem.error,
          });
        } catch (e) {
          console.error("Errore salvataggio log_errori_ia:", e);
        }
      }
    }

    // Se la chiamata è fallita del tutto
    if (genError && (!generati || generati.length === 0)) {
      try {
        await adminDb.from("log_errori_ia").insert({
          utente: user?.email || "ospite",
          film: titolo,
          modello: "gemini",
          operazione: "Ricerca Bloopers",
          errore_dettaglio: genError,
        });
      } catch {}

      return NextResponse.json(
        { error: genError },
        { status: genError.includes("GEMINI_API_KEY") ? 500 : 404 }
      );
    }

    if (!generati || generati.length === 0) {
      return NextResponse.json(
        { error: "Nessun nuovo blooper trovato per questa pellicola." },
        { status: 404 }
      );
    }

    // 5. REGISTRAZIONE CHIAMATA RIUSCITA IN statistiche_ia
    if (modelUsed) {
      try {
        await adminDb.from("statistiche_ia").insert({
          modello: modelUsed,
          tempo_esecuzione: executionTimeSec || 1.5,
        });
      } catch (e) {
        console.error("Errore salvataggio statistiche_ia:", e);
      }
    }

    // 6. Inserimento bloopers generati
    const emailInserimento = user?.email || "IA (Sistema)";
    const daInserire = generati.map((g) => ({
      film_id,
      minuto: g.minuto,
      categoria: g.categoria,
      descrizione: g.descrizione,
      approvato: true,
      conferme: 0,
      contestazioni: 0,
      inserito_da: emailInserimento,
      provenienza: "ia",
    }));

    const { data: inserted, error: insertErr } = await adminDb
      .from("errori")
      .insert(daInserire)
      .select();

    if (insertErr) {
      console.error("Errore inserimento bloopers:", insertErr);
      return NextResponse.json(
        { error: "Errore durante il salvataggio dei bloopers nel database." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bloopers: inserted,
    });
  } catch (err: any) {
    console.error("Errore generazione bloopers:", err);
    return NextResponse.json(
      { error: "Errore interno del server durante la generazione dei bloopers" },
      { status: 500 }
    );
  }
}
