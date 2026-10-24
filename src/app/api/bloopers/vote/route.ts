import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const adminDb = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Devi essere autenticato per votare e contestare i bloopers." },
        { status: 401 }
      );
    }

    const { errore_id, tipo, motivo } = await request.json();

    if (!errore_id || !["conferma", "contestazione"].includes(tipo)) {
      return NextResponse.json(
        { error: "Dati richiesta non validi." },
        { status: 400 }
      );
    }

    const motivoPulito = motivo && typeof motivo === "string" ? motivo.trim() : null;

    // Verifica se l'utente ha già votato questo errore
    const { data: existingVote } = await adminDb
      .from("voti_bloopers")
      .select("id, tipo")
      .eq("errore_id", errore_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingVote) {
      if ((existingVote as any).tipo === tipo && !motivoPulito) {
        // Se riclicca sullo stesso voto (senza aggiornare motivo), lo rimuove
        await adminDb
          .from("voti_bloopers")
          .delete()
          .eq("id", (existingVote as any).id);
      } else {
        // Cambia tipo di voto o aggiorna la motivazione
        await adminDb
          .from("voti_bloopers")
          .update({
            tipo,
            motivo: tipo === "contestazione" ? motivoPulito : null,
          })
          .eq("id", (existingVote as any).id);
      }
    } else {
      // Nuovo voto
      await adminDb.from("voti_bloopers").insert({
        errore_id,
        user_id: user.id,
        tipo,
        motivo: tipo === "contestazione" ? motivoPulito : null,
      });
    }

    // Recupera conteggio aggiornato dei voti da voti_bloopers
    const { data: voti } = await adminDb
      .from("voti_bloopers")
      .select("tipo")
      .eq("errore_id", errore_id);

    const conferme = (voti || []).filter((v: any) => v.tipo === "conferma").length;
    const contestazioni = (voti || []).filter((v: any) => v.tipo === "contestazione").length;

    // Sincronizza i contatori direttamente nella tabella errori
    await adminDb
      .from("errori")
      .update({
        conferme,
        contestazioni,
      })
      .eq("id", errore_id);

    return NextResponse.json({
      success: true,
      conferme,
      contestazioni,
      tipo,
      motivo: motivoPulito,
    });
  } catch (err: any) {
    console.error("Errore voto blooper:", err);
    return NextResponse.json(
      { error: err?.message || "Errore interno del server" },
      { status: 500 }
    );
  }
}
