import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ notifications: [] });
    }

    // 1. Profilo utente per conoscere il punteggio attuale
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, punti, tier, tipo_abbonamento")
      .eq("id", user.id)
      .maybeSingle();

    const notifications: any[] = [];

    // 2. Controllo se esiste tabella notifiche_utenti
    try {
      const { data: dbNotifs, error: notifErr } = await supabase
        .from("notifiche_utenti")
        .select("*")
        .eq("user_id", user.id)
        .eq("letta", false)
        .order("created_at", { ascending: false });

      if (!notifErr && dbNotifs && dbNotifs.length > 0) {
        for (const n of dbNotifs) {
          notifications.push({
            id: `db_${n.id}`,
            tipo: n.tipo || "contestazione_approvata",
            titolo: n.titolo || "Contestazione Approvata!",
            messaggio: n.messaggio,
            punti: n.punti || 10,
            film_titolo: n.film_titolo || "Film",
            created_at: n.created_at,
            current_user_points: profile?.punti || 0,
          });
        }
      }
    } catch {
      // Tabella non ancora creata, fallback trasparente su voti_bloopers
    }

    // 3. Fallback / Integrazione: Recupera contestazioni risolte da voti_bloopers
    const { data: resolvedContests, error: votiErr } = await supabase
      .from("voti_bloopers")
      .select("id, tipo, motivo, created_at, errore_id, errori(minuto, descrizione, films(titolo, anno, id))")
      .eq("user_id", user.id)
      .in("tipo", ["contestazione_risolta", "blooper_falso_risolto"])
      .order("created_at", { ascending: false })
      .limit(5);

    if (!votiErr && resolvedContests) {
      for (const rc of resolvedContests) {
        // Evita duplicati se già presente da dbNotifs
        const exists = notifications.some((n) => n.id.includes(rc.id));
        if (!exists) {
          const isFakeBlooper = rc.tipo === "blooper_falso_risolto";
          const filmTitolo = (rc as any)?.errori?.films?.titolo || "Film nel Catalogo";
          const filmAnno = (rc as any)?.errori?.films?.anno ? ` (${(rc as any).errori.films.anno})` : "";
          const minuto = (rc as any)?.errori?.minuto ? ` al minuto ${(rc as any).errori.minuto}` : "";

          notifications.push({
            id: `vote_${rc.id}`,
            tipo: rc.tipo,
            titolo: isFakeBlooper
              ? "Blooper Errato Smascherato!"
              : "Contestazione Approvata dall'Admin!",
            messaggio: isFakeBlooper
              ? `L'amministratore ha verificato ed eliminato il blooper errato in "${filmTitolo}${filmAnno}" che avevi contestato.`
              : `La tua correzione per "${filmTitolo}${filmAnno}"${minuto} è stata approvata e inserita nel catalogo ufficiale!`,
            film_titolo: `${filmTitolo}${filmAnno}`,
            motivo: rc.motivo || "",
            punti: 10,
            created_at: rc.created_at,
            current_user_points: profile?.punti || 0,
          });
        }
      }
    }

    return NextResponse.json({ notifications });
  } catch (err: any) {
    console.error("Errore fetch notifiche utente:", err);
    return NextResponse.json({ notifications: [] });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "ID mancante" }, { status: 400 });
    }

    // Se l'ID appartiene alla tabella notifiche_utenti
    if (String(id).startsWith("db_")) {
      const realId = String(id).replace("db_", "");
      try {
        await supabase
          .from("notifiche_utenti")
          .update({ letta: true })
          .eq("id", realId)
          .eq("user_id", user.id);
      } catch (e) {
        console.error("Errore update notifiche_utenti:", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Errore salvataggio notifica letta:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
