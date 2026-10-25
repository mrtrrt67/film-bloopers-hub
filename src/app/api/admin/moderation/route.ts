import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAndAwardPointRewards } from "@/lib/rewards";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

    // 1. Bloopers in attesa di approvazione
    const { data: pendingBloopers } = await supabase
      .from("errori")
      .select("*, films(titolo, anno, id)")
      .eq("approvato", false)
      .order("creato_il", { ascending: false });

    // Recupera profili degli autori per evidenziare priorità e punti doppi
    const submitterEmails = Array.from(new Set((pendingBloopers || []).map((b: any) => b.inserito_da).filter(Boolean)));
    let profilesByEmail: Record<string, any> = {};

    if (submitterEmails.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, email, tier, tipo_abbonamento, punti")
        .in("email", submitterEmails);

      (profs || []).forEach((p: any) => {
        if (p.email) profilesByEmail[p.email.toLowerCase()] = p;
      });
    }

    const enrichedPending = (pendingBloopers || []).map((b: any) => {
      const p = b.inserito_da ? profilesByEmail[b.inserito_da.toLowerCase()] : null;
      const isPriority = p && (p.tipo_abbonamento === "annuale" || p.tipo_abbonamento === "lifetime");
      const isDoublePoints = isPriority;
      return {
        ...b,
        user_tier: p?.tier || "free",
        user_sub: p?.tipo_abbonamento || "nessuno",
        is_priority: !!isPriority,
        is_double_points: !!isDoublePoints,
      };
    });

    // Ordina mettendo le segnalazioni prioritarie (Annuale/Lifetime) in cima
    enrichedPending.sort((a: any, b: any) => {
      if (a.is_priority && !b.is_priority) return -1;
      if (!a.is_priority && b.is_priority) return 1;
      return 0;
    });

    // 2. Contestazioni attive
    const { data: contestazioni } = await supabase
      .from("voti_bloopers")
      .select("*, errori(*, films(titolo, anno, id))")
      .eq("tipo", "contestazione")
      .not("motivo", "is", null);

    // 3. Archivio bloopers approvati dagli utenti
    const { data: approvedUserBloopers } = await supabase
      .from("errori")
      .select("*, films(titolo, anno, id)")
      .eq("approvato", true)
      .eq("provenienza", "utente")
      .order("creato_il", { ascending: false })
      .limit(50);

    return NextResponse.json({
      pending: enrichedPending,
      contestazioni: contestazioni || [],
      approved: approvedUserBloopers || [],
    });
  } catch (err: any) {
    console.error("Errore moderazione:", err);
    return NextResponse.json({ error: err.message || "Errore moderazione" }, { status: 500 });
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

    const body = await request.json();
    const { action, blooper_id, contestazione_id, points, userId, userEmail, minuto, descrizione } = body;

    if (action === "approve") {
      // 1. Approva blooper
      await supabase.from("errori").update({ approvato: true }).eq("id", blooper_id);

      // 2. Assegna punti se l'utente è registrato e applica moltiplicatore 2x se annuale/lifetime
      let targetProfile = null;
      if (userEmail) {
        const { data: p } = await supabase.from("profiles").select("*").eq("email", userEmail).maybeSingle();
        targetProfile = p;
      } else if (userId) {
        const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
        targetProfile = p;
      }

      let awardedPts = points ? parseInt(String(points), 10) : 10;
      let isDouble = false;
      let rewardMsg = "";

      if (targetProfile) {
        if (targetProfile.tipo_abbonamento === "annuale" || targetProfile.tipo_abbonamento === "lifetime") {
          // Se non è stato specificato manualmente un punteggio custom, raddoppia i 10 punti base a 20
          awardedPts = points ? parseInt(String(points), 10) : 20;
          isDouble = true;
        }

        const newTotal = (targetProfile.punti || 0) + awardedPts;
        const resReward = await checkAndAwardPointRewards(supabase, targetProfile.id, newTotal);
        if (resReward?.message) {
          rewardMsg = ` (${resReward.message})`;
        }
      }

      const msg = isDouble
        ? `Blooper approvato! Assegnati ${awardedPts} pt (Raddoppiati per Piano Annuale/Lifetime)${rewardMsg}`
        : `Blooper approvato e ${awardedPts} pt assegnati!${rewardMsg}`;

      return NextResponse.json({ success: true, message: msg });
    }

    if (action === "reject") {
      await supabase.from("errori").delete().eq("id", blooper_id);
      return NextResponse.json({ success: true, message: "Segnalazione rifiutata ed eliminata." });
    }

    if (action === "correct_contestation") {
      // 1. Rimuovi contestazione risolta
      if (contestazione_id) {
        await supabase.from("voti_bloopers").delete().eq("id", contestazione_id);
      }

      // 2. Aggiorna blooper con la correzione e ricalcola i contatori
      if (blooper_id) {
        const { data: voti } = await supabase
          .from("voti_bloopers")
          .select("tipo")
          .eq("errore_id", blooper_id);

        const conferme = (voti || []).filter((v: any) => v.tipo === "conferma").length;
        const contestazioni = (voti || []).filter((v: any) => v.tipo === "contestazione").length;

        const updateData: Record<string, any> = { conferme, contestazioni };
        if (minuto) updateData.minuto = minuto;
        if (descrizione) updateData.descrizione = descrizione;
        await supabase.from("errori").update(updateData).eq("id", blooper_id);
      }

      // 3. Assegna punti se previsti
      if (userId && points) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
        if (profile) {
          const isDouble = profile.tipo_abbonamento === "annuale" || profile.tipo_abbonamento === "lifetime";
          const finalPts = isDouble ? parseInt(String(points), 10) * 2 : parseInt(String(points), 10);
          await checkAndAwardPointRewards(supabase, profile.id, (profile.punti || 0) + finalPts);
        }
      }

      return NextResponse.json({ success: true, message: "Correzione salvata e contestazione risolta!" });
    }

    if (action === "delete_blooper") {
      if (contestazione_id) {
        await supabase.from("voti_bloopers").delete().eq("id", contestazione_id);
      }
      if (blooper_id) {
        await supabase.from("errori").delete().eq("id", blooper_id);
      }
      return NextResponse.json({ success: true, message: "Blooper eliminato definitivamente." });
    }

    if (action === "ignore_contestation") {
      let bId = blooper_id;
      if (!bId && contestazione_id) {
        const { data: cData } = await supabase
          .from("voti_bloopers")
          .select("errore_id")
          .eq("id", contestazione_id)
          .single();
        bId = cData?.errore_id;
      }

      if (contestazione_id) {
        await supabase.from("voti_bloopers").delete().eq("id", contestazione_id);
      }

      if (bId) {
        const { data: voti } = await supabase
          .from("voti_bloopers")
          .select("tipo")
          .eq("errore_id", bId);

        const conferme = (voti || []).filter((v: any) => v.tipo === "conferma").length;
        const contestazioni = (voti || []).filter((v: any) => v.tipo === "contestazione").length;
        await supabase.from("errori").update({ conferme, contestazioni }).eq("id", bId);
      }

      return NextResponse.json({ success: true, message: "Contestazione ignorata ed archiviata." });
    }

    if (action === "delete_approved") {
      if (blooper_id) {
        await supabase.from("errori").delete().eq("id", blooper_id);
      }
      return NextResponse.json({ success: true, message: "Blooper eliminato dall'archivio." });
    }

    return NextResponse.json({ error: "Azione non riconosciuta" }, { status: 400 });
  } catch (err: any) {
    console.error("Errore operazione moderazione:", err);
    return NextResponse.json({ error: err.message || "Errore moderazione" }, { status: 500 });
  }
}
