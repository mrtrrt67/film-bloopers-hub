import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Devi essere registrato per votare o contestare i bloopers." },
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

    const cleanErrId = typeof errore_id === "string" ? parseInt(errore_id, 10) : Number(errore_id);
    if (isNaN(cleanErrId)) {
      return NextResponse.json(
        { error: "ID blooper non valido." },
        { status: 400 }
      );
    }

    const motivoPulito = motivo && typeof motivo === "string" ? motivo.trim() : null;

    // 1. Recupera il blooper di riferimento
    const { data: targetBlooper } = await supabase
      .from("errori")
      .select("id, inserito_da, provenienza")
      .eq("id", cleanErrId)
      .maybeSingle();

    if (!targetBlooper) {
      return NextResponse.json({ error: "Blooper non trovato." }, { status: 404 });
    }

    // 2. Regola anti-auto-voto: un utente non può votare o contestare un proprio blooper
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("username, email")
      .eq("id", user.id)
      .maybeSingle();

    const userEmail = (user.email || "").toLowerCase().trim();
    const userHandle = `@${userEmail.split("@")[0]}`;
    const username = currentProfile?.username ? currentProfile.username.toLowerCase().trim() : "";
    const blooperAuthor = (targetBlooper.inserito_da || "").toLowerCase().trim();

    const isOwnBlooper =
      blooperAuthor &&
      (blooperAuthor === userEmail ||
       blooperAuthor === userHandle ||
       (username && (blooperAuthor === `@${username}` || blooperAuthor === username)));

    if (isOwnBlooper) {
      return NextResponse.json(
        { error: "Non puoi votare o contestare un blooper inserito da te!" },
        { status: 400 }
      );
    }

    // 3. Verifica se l'utente ha già votato questo errore
    const { data: existingVote, error: selectErr } = await supabase
      .from("voti_bloopers")
      .select("id, tipo, motivo")
      .eq("errore_id", cleanErrId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (selectErr) {
      console.error("Errore verifica voto esistente:", selectErr);
    }

    let resultingTipo: "conferma" | "contestazione" | null = tipo;

    if (existingVote) {
      if (existingVote.tipo === tipo && !motivoPulito) {
        // Se riclicca sullo stesso voto (stesso tipo e senza motivazione), lo rimuove (toggle off)
        const { error: delErr } = await supabase
          .from("voti_bloopers")
          .delete()
          .eq("id", existingVote.id)
          .eq("user_id", user.id);

        if (delErr) {
          console.error("Errore eliminazione voto:", delErr);
          throw new Error("Impossibile rimuovere il voto: " + delErr.message);
        }
        resultingTipo = null;
      } else {
        // Cambia tipo di voto o aggiorna/conferma la motivazione
        const { error: updErr } = await supabase
          .from("voti_bloopers")
          .update({
            tipo,
            motivo: tipo === "contestazione" ? (motivoPulito || existingVote.motivo || null) : null,
          })
          .eq("id", existingVote.id)
          .eq("user_id", user.id);

        if (updErr) {
          console.error("Errore aggiornamento voto:", updErr);
          throw new Error("Impossibile aggiornare il voto: " + updErr.message);
        }
      }
    } else {
      // Nuovo voto
      const { error: insErr } = await supabase
        .from("voti_bloopers")
        .insert({
          errore_id: cleanErrId,
          user_id: user.id,
          tipo,
          motivo: tipo === "contestazione" ? motivoPulito : null,
        });

      if (insErr) {
        console.error("Errore inserimento voto:", insErr);
        throw new Error("Impossibile registrare il voto: " + insErr.message);
      }
    }

    // 4. Recupera conteggio aggiornato dei voti da voti_bloopers
    const { data: voti, error: countErr } = await supabase
      .from("voti_bloopers")
      .select("tipo")
      .eq("errore_id", cleanErrId);

    if (countErr) {
      console.error("Errore conteggio voti:", countErr);
    }

    const conferme = (voti || []).filter((v: any) => v.tipo === "conferma").length;
    const contestazioni = (voti || []).filter((v: any) => v.tipo === "contestazione").length;

    // 5. Sincronizza i contatori direttamente nella tabella errori con privilegi admin per RLS
    const adminDb = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;
    const { error: updateErr } = await adminDb
      .from("errori")
      .update({
        conferme,
        contestazioni,
      })
      .eq("id", cleanErrId);

    if (updateErr) {
      console.error("Errore aggiornamento contatori in errori:", updateErr);
    }

    return NextResponse.json({
      success: true,
      conferme,
      contestazioni,
      tipo: resultingTipo,
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
