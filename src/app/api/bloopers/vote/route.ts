import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Devi essere autenticato per votare." },
        { status: 401 }
      );
    }

    const { errore_id, tipo } = await request.json();

    if (!errore_id || !["conferma", "contestazione"].includes(tipo)) {
      return NextResponse.json(
        { error: "Dati richiesta non validi." },
        { status: 400 }
      );
    }

    // Verifica se l'utente ha già votato questo errore
    const { data: existingVote } = await supabase
      .from("voti_bloopers")
      .select("id, tipo")
      .eq("errore_id", errore_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingVote) {
      if ((existingVote as any).tipo === tipo) {
        // Se riclicca sullo stesso voto, lo rimuove
        await supabase
          .from("voti_bloopers")
          .delete()
          .eq("id", (existingVote as any).id);
      } else {
        // Cambia tipo di voto
        await supabase
          .from("voti_bloopers")
          .update({ tipo })
          .eq("id", (existingVote as any).id);
      }
    } else {
      // Nuovo voto
      await supabase.from("voti_bloopers").insert({
        errore_id,
        user_id: user.id,
        tipo,
      });
    }

    // Recupera conteggio aggiornato dei voti
    const { data: voti } = await supabase
      .from("voti_bloopers")
      .select("tipo")
      .eq("errore_id", errore_id);

    const conferme = (voti || []).filter((v: any) => v.tipo === "conferma").length;
    const contestazioni = (voti || []).filter((v: any) => v.tipo === "contestazione").length;

    return NextResponse.json({
      success: true,
      conferme,
      contestazioni,
    });
  } catch (err: any) {
    console.error("Errore voto blooper:", err);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
