import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAndAwardPointRewards } from "@/lib/rewards";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

    const adminDb = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;

    // 1. Bloopers in attesa di approvazione
    const { data: pendingBloopers } = await adminDb
      .from("errori")
      .select("*, films(titolo, anno, id)")
      .eq("approvato", false)
      .order("creato_il", { ascending: false });

    // Recupera profili degli autori per evidenziare priorità e punti doppi
    const { data: allProfiles } = await adminDb
      .from("profiles")
      .select("id, email, tier, tipo_abbonamento, punti");

    const profilesByHandleOrEmail: Record<string, any> = {};
    (allProfiles || []).forEach((p: any) => {
      if (p.email) {
        profilesByHandleOrEmail[p.email.toLowerCase()] = p;
        const handle = `@${p.email.split("@")[0].toLowerCase()}`;
        profilesByHandleOrEmail[handle] = p;
      }
    });

    const enrichedPending = (pendingBloopers || []).map((b: any) => {
      const key = b.inserito_da ? b.inserito_da.toLowerCase() : "";
      const p = key ? profilesByHandleOrEmail[key] : null;
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
    const { data: rawContestazioni } = await adminDb
      .from("voti_bloopers")
      .select("*, errori(*, films(titolo, anno, id))")
      .eq("tipo", "contestazione")
      .not("motivo", "is", null);

    const enrichedContestazioni = (rawContestazioni || []).map((c: any) => {
      const p = c.user_id ? allProfiles?.find((prof: any) => prof.id === c.user_id) : null;
      const isPriority = p && (p.tipo_abbonamento === "annuale" || p.tipo_abbonamento === "lifetime");
      const handle = p?.email ? `@${p.email.split("@")[0]}` : "Utente Registrato";
      return {
        ...c,
        user_email: p?.email || null,
        user_handle: handle,
        user_tier: p?.tier || "free",
        user_sub: p?.tipo_abbonamento || "nessuno",
        user_points: p?.punti || 0,
        is_priority: !!isPriority,
        is_double_points: !!isPriority,
      };
    });

    // 3. Archivio bloopers approvati dagli utenti
    const { data: approvedUserBloopers } = await adminDb
      .from("errori")
      .select("*, films(titolo, anno, id)")
      .eq("approvato", true)
      .eq("provenienza", "utente")
      .order("creato_il", { ascending: false })
      .limit(50);

    // 4. Correzioni blooper inviate dal modulo suggerimenti (solo utenti registrati che partecipano alla classifica)
    const { data: rawCorrections } = await adminDb
      .from("suggerimenti")
      .select("*")
      .ilike("messaggio", "%[Correzione blooper]%")
      .not("user_id", "is", null)
      .order("created_at", { ascending: false });

    const pendingCorrections = (rawCorrections || [])
      .filter((s: any) => !s.messaggio?.includes("[APPROVATO]") && !s.messaggio?.includes("[RIFIUTATO]"))
      .map((s: any) => {
        const key = s.email ? s.email.toLowerCase() : "";
        const p = (s.user_id && allProfiles?.find((prof: any) => prof.id === s.user_id)) || (key ? profilesByHandleOrEmail[key] : null);
        const isPriority = p && (p.tipo_abbonamento === "annuale" || p.tipo_abbonamento === "lifetime");
        const handle = p?.email ? `@${p.email.split("@")[0]}` : (s.email ? `@${s.email.split("@")[0]}` : "Utente");
        return {
          ...s,
          user_id: s.user_id || p?.id || null,
          user_handle: handle,
          user_tier: p?.tier || "free",
          user_sub: p?.tipo_abbonamento || "nessuno",
          user_points: p?.punti || 0,
          is_priority: !!isPriority,
          is_double_points: !!isPriority,
        };
      });

    return NextResponse.json({
      pending: enrichedPending,
      contestazioni: enrichedContestazioni,
      approved: approvedUserBloopers || [],
      corrections: pendingCorrections,
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

    const adminDb = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;
    const body = await request.json();
    const { action, blooper_id, contestazione_id, suggestion_id, points, userId, userEmail, minuto, descrizione } = body;

    if (action === "approve") {
      // 1. Approva blooper
      await adminDb.from("errori").update({ approvato: true }).eq("id", blooper_id);

      // 2. Assegna punti se l'utente è registrato e applica moltiplicatore 2x se annuale/lifetime
      let targetProfile = null;
      if (userEmail) {
        let query = adminDb.from("profiles").select("*");
        if (userEmail.includes("@")) {
          query = query.eq("email", userEmail.trim());
        } else {
          const clean = userEmail.replace(/^@/, "").trim();
          query = query.ilike("email", `${clean}@%`);
        }
        const { data: p } = await query.maybeSingle();
        targetProfile = p;
      } else if (userId) {
        const { data: p } = await adminDb.from("profiles").select("*").eq("id", userId).maybeSingle();
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
        const resReward = await checkAndAwardPointRewards(adminDb, targetProfile.id, newTotal);
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
      await adminDb.from("errori").delete().eq("id", blooper_id);
      return NextResponse.json({ success: true, message: "Segnalazione rifiutata ed eliminata." });
    }

    if (action === "correct_contestation") {
      // 1. Rimuovi contestazione risolta
      if (contestazione_id) {
        await adminDb.from("voti_bloopers").delete().eq("id", contestazione_id);
      }

      // 2. Aggiorna blooper con la correzione e ricalcola i contatori
      if (blooper_id) {
        const { data: voti } = await adminDb
          .from("voti_bloopers")
          .select("tipo")
          .eq("errore_id", blooper_id);

        const conferme = (voti || []).filter((v: any) => v.tipo === "conferma").length;
        const contestazioni = (voti || []).filter((v: any) => v.tipo === "contestazione").length;

        const updateData: Record<string, any> = { conferme, contestazioni };
        if (minuto) updateData.minuto = minuto;
        if (descrizione) updateData.descrizione = descrizione;
        await adminDb.from("errori").update(updateData).eq("id", blooper_id);
      }

      // 3. Assegna punti se previsti
      let rewardMsg = "";
      let targetProfile = null;
      if (userId) {
        const { data: p } = await adminDb.from("profiles").select("*").eq("id", userId).maybeSingle();
        targetProfile = p;
      }
      if (!targetProfile && userEmail) {
        let query = adminDb.from("profiles").select("*");
        if (userEmail.includes("@")) {
          query = query.eq("email", userEmail.trim());
        } else {
          const clean = userEmail.replace(/^@/, "").trim();
          query = query.ilike("email", `${clean}@%`);
        }
        const { data: p } = await query.maybeSingle();
        targetProfile = p;
      }

      if (targetProfile) {
        const isDouble = targetProfile.tipo_abbonamento === "annuale" || targetProfile.tipo_abbonamento === "lifetime";
        let basePts = points ? parseInt(String(points), 10) : (isDouble ? 20 : 10);
        const finalPts = isDouble && basePts === 10 ? 20 : basePts;
        const newTotal = (targetProfile.punti || 0) + finalPts;
        const resReward = await checkAndAwardPointRewards(adminDb, targetProfile.id, newTotal);
        rewardMsg = ` Assegnati ${finalPts} pt a ${targetProfile.email ? `@${targetProfile.email.split("@")[0]}` : "chi ha corretto"}!`;
        if (resReward?.message) rewardMsg += ` (${resReward.message})`;
      }

      return NextResponse.json({ success: true, message: `Correzione salvata e contestazione risolta!${rewardMsg}` });
    }

    if (action === "delete_blooper") {
      if (contestazione_id) {
        await adminDb.from("voti_bloopers").delete().eq("id", contestazione_id);
      }
      if (blooper_id) {
        await adminDb.from("errori").delete().eq("id", blooper_id);
      }

      // Assegna punti al segnalatore della contestazione per aver smascherato il fake blooper
      let rewardMsg = "";
      let targetProfile = null;
      if (userId) {
        const { data: p } = await adminDb.from("profiles").select("*").eq("id", userId).maybeSingle();
        targetProfile = p;
      }
      if (!targetProfile && userEmail) {
        let query = adminDb.from("profiles").select("*");
        if (userEmail.includes("@")) {
          query = query.eq("email", userEmail.trim());
        } else {
          const clean = userEmail.replace(/^@/, "").trim();
          query = query.ilike("email", `${clean}@%`);
        }
        const { data: p } = await query.maybeSingle();
        targetProfile = p;
      }

      if (targetProfile) {
        const isDouble = targetProfile.tipo_abbonamento === "annuale" || targetProfile.tipo_abbonamento === "lifetime";
        let basePts = points ? parseInt(String(points), 10) : (isDouble ? 20 : 10);
        const finalPts = isDouble && basePts === 10 ? 20 : basePts;
        const newTotal = (targetProfile.punti || 0) + finalPts;
        const resReward = await checkAndAwardPointRewards(adminDb, targetProfile.id, newTotal);
        rewardMsg = ` Assegnati ${finalPts} pt a ${targetProfile.email ? `@${targetProfile.email.split("@")[0]}` : "chi ha smascherato l'errore"}!`;
        if (resReward?.message) rewardMsg += ` (${resReward.message})`;
      }

      return NextResponse.json({ 
        success: true, 
        message: `Blooper errato eliminato definitivamente dall'archivio.${rewardMsg}` 
      });
    }

    if (action === "ignore_contestation") {
      let bId = blooper_id;
      if (!bId && contestazione_id) {
        const { data: cData } = await adminDb
          .from("voti_bloopers")
          .select("errore_id")
          .eq("id", contestazione_id)
          .single();
        bId = cData?.errore_id;
      }

      if (contestazione_id) {
        await adminDb.from("voti_bloopers").delete().eq("id", contestazione_id);
      }

      if (bId) {
        const { data: voti } = await adminDb
          .from("voti_bloopers")
          .select("tipo")
          .eq("errore_id", bId);

        const conferme = (voti || []).filter((v: any) => v.tipo === "conferma").length;
        const contestazioni = (voti || []).filter((v: any) => v.tipo === "contestazione").length;
        await adminDb.from("errori").update({ conferme, contestazioni }).eq("id", bId);
      }

      return NextResponse.json({ success: true, message: "Contestazione ignorata ed archiviata." });
    }

    if (action === "delete_approved") {
      if (blooper_id) {
        await adminDb.from("errori").delete().eq("id", blooper_id);
      }
      return NextResponse.json({ success: true, message: "Blooper eliminato dall'archivio." });
    }

    if (action === "approve_suggestion_correction") {
      let targetProfile = null;
      if (userId) {
        const { data: p } = await adminDb.from("profiles").select("*").eq("id", userId).maybeSingle();
        targetProfile = p;
      }
      if (!targetProfile && userEmail) {
        let query = adminDb.from("profiles").select("*");
        if (userEmail.includes("@")) {
          query = query.eq("email", userEmail.trim());
        } else {
          const clean = userEmail.replace(/^@/, "").trim();
          query = query.ilike("email", `${clean}@%`);
        }
        const { data: p } = await query.maybeSingle();
        targetProfile = p;
      }

      let awardedPts = points ? parseInt(String(points), 10) : 10;
      let isDouble = false;
      let rewardMsg = "";

      if (targetProfile) {
        if (targetProfile.tipo_abbonamento === "annuale" || targetProfile.tipo_abbonamento === "lifetime") {
          awardedPts = points ? parseInt(String(points), 10) : 20;
          isDouble = true;
        }

        const newTotal = (targetProfile.punti || 0) + awardedPts;
        await adminDb.from("profiles").update({ punti: newTotal }).eq("id", targetProfile.id);
        const resReward = await checkAndAwardPointRewards(adminDb, targetProfile.id, newTotal);
        if (resReward?.message) {
          rewardMsg = ` (${resReward.message})`;
        }
      }

      // Rimuovi la segnalazione approvata dalla coda dei suggerimenti
      if (suggestion_id) {
        await adminDb.from("suggerimenti").delete().eq("id", suggestion_id);
      }

      const msg = isDouble
        ? `Correzione approvata! Assegnati ${awardedPts} pt (Raddoppiati per Piano Annuale/Lifetime)${rewardMsg}`
        : `Correzione approvata e ${awardedPts} pt assegnati alla classifica!${rewardMsg}`;

      return NextResponse.json({ success: true, message: msg });
    }

    if (action === "reject_suggestion_correction") {
      if (suggestion_id) {
        await adminDb.from("suggerimenti").delete().eq("id", suggestion_id);
      }
      return NextResponse.json({ success: true, message: "Correzione rifiutata ed eliminata dalla moderazione." });
    }

    return NextResponse.json({ error: "Azione non riconosciuta" }, { status: 400 });
  } catch (err: any) {
    console.error("Errore operazione moderazione:", err);
    return NextResponse.json({ error: err.message || "Errore moderazione" }, { status: 500 });
  }
}
