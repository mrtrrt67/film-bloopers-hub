import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBloopersForMovie } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { film_id, titolo, anno, regista, attori, trama } = body;

    if (!film_id || !titolo) {
      return NextResponse.json(
        { error: "film_id e titolo sono obbligatori." },
        { status: 400 }
      );
    }

    // Verifica quota utente
    const today = new Date().toISOString().slice(0, 10);
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        const prof = profile as any;
        const isFree = (prof.tier || "free") === "free";
        const callsToday = prof.last_reset_date === today ? prof.calls_today || 0 : 0;

        if (isFree && callsToday >= 15) {
          return NextResponse.json(
            { error: "Hai raggiunto il limite giornaliero di 15 generazioni per il piano Free. Passa a Premium per generazioni illimitate!" },
            { status: 429 }
          );
        }

        // Incrementa chiamate
        await supabase
          .from("profiles")
          .update({
            calls_today: callsToday + 1,
            last_reset_date: today,
          })
          .eq("id", user.id);
      }
    }

    // Recupera errori già presenti a DB per evitare duplicati
    const { data: existingBloopers } = await supabase
      .from("errori")
      .select("descrizione")
      .eq("film_id", film_id);

    const descrizioniEsistenti = (existingBloopers || []).map((e: any) => e.descrizione);

    // Chiamata specializzata a Gemini con contesto TMDB
    const generati = await generateBloopersForMovie({
      titolo,
      anno,
      regista,
      attori,
      trama,
      erroriEsistenti: descrizioniEsistenti,
    });

    if (!generati || generati.length === 0) {
      return NextResponse.json(
        { error: "Nessun nuovo blooper trovato per questa pellicola." },
        { status: 404 }
      );
    }

    const emailInserimento = user?.email || "IA (Sistema)";
    const daInserire = generati.map((g) => ({
      film_id,
      minuto: g.minuto,
      categoria: g.categoria,
      descrizione: g.descrizione,
      approvato: true,
      inserito_da: emailInserimento,
      provenienza: "ia",
    }));

    const { data: inserted, error: insertErr } = await supabase
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
