import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAndAwardPointRewards } from "@/lib/rewards";

async function resolveAuthorProfile(adminDb: any, userEmailOrHandle?: string | null) {
  if (!userEmailOrHandle) return null;
  const raw = userEmailOrHandle.trim();
  const clean = raw.replace(/^@/, "").trim().toLowerCase();

  if (raw.includes("@") && raw.includes(".") && !raw.startsWith("@")) {
    const { data: p } = await adminDb.from("profiles").select("*").eq("email", raw.toLowerCase()).maybeSingle();
    if (p) return p;
  }
  const { data: pUser } = await adminDb.from("profiles").select("*").ilike("username", clean).maybeSingle();
  if (pUser) return pUser;

  const { data: pPrefix } = await adminDb.from("profiles").select("*").ilike("email", `${clean}@%`).maybeSingle();
  if (pPrefix) return pPrefix;

  const { data: pRaw } = await adminDb.from("profiles").select("*").eq("email", raw).maybeSingle();
  if (pRaw) return pRaw;

  return null;
}

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

    // 1. Recupera il blooper di riferimento con info sul film
    const { data: targetBlooper } = await supabase
      .from("errori")
      .select("id, inserito_da, provenienza, film_id, films(titolo, anno)")
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
    let deltaConferme = 0;

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
        if (existingVote.tipo === "conferma") {
          deltaConferme = -1;
        }
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

        if (existingVote.tipo !== "conferma" && tipo === "conferma") {
          deltaConferme = 1;
        } else if (existingVote.tipo === "conferma" && tipo !== "conferma") {
          deltaConferme = -1;
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

      if (tipo === "conferma") {
        deltaConferme = 1;
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

    // 6. Accredito punteggio all'autore del blooper (ogni 👍 fa guadagnare +1 punto all'utente che l'ha inserito)
    // Se il blooper è generato da IA (come la quasi totalità di quelli iniziali nel catalogo), nessun utente riceve punti.
    const isAiBlooper =
      targetBlooper.provenienza === "ia" ||
      !targetBlooper.inserito_da ||
      targetBlooper.inserito_da.toLowerCase().startsWith("ia") ||
      targetBlooper.inserito_da.toLowerCase().includes("filmbloopers");

    if (!isAiBlooper && deltaConferme !== 0) {
      try {
        const authorProfile = await resolveAuthorProfile(adminDb, targetBlooper.inserito_da);
        if (authorProfile && authorProfile.id !== user.id) {
          if (deltaConferme > 0) {
            const newTotal = (authorProfile.punti || 0) + 1;
            await checkAndAwardPointRewards(adminDb, authorProfile.id, newTotal);

            const filmTitolo = (targetBlooper as any)?.films?.titolo || "un film";
            await adminDb.from("notifiche_utenti").insert({
              user_id: authorProfile.id,
              tipo: "conferma_ricevuta",
              titolo: "Nuovo Pollice in Su Ricevuto! 👍",
              messaggio: `La community ha confermato con un pollice in su il tuo blooper in "${filmTitolo}"! Ti è stato accreditato +1 punto.`,
              punti: 1,
              film_titolo: filmTitolo,
              letta: false,
            });
          } else if (deltaConferme < 0) {
            const newTotal = Math.max(0, (authorProfile.punti || 0) - 1);
            await adminDb.from("profiles").update({ punti: newTotal }).eq("id", authorProfile.id);
          }
        }
      } catch (errAuthor) {
        console.error("Errore accredito punti autore blooper:", errAuthor);
      }
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
