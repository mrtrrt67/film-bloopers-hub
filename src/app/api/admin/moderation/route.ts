import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAndAwardPointRewards } from "@/lib/rewards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isUserAdmin(profile: any, emailOrHandle?: string | null, adminEmailParam?: string): boolean {
  const adminEmail = (adminEmailParam || process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
  if (profile?.is_admin === true) return true;
  if (profile?.email && profile.email.toLowerCase() === adminEmail) return true;
  if (profile?.username && profile.username.toLowerCase() === adminEmail.split("@")[0].toLowerCase()) return true;
  if (emailOrHandle) {
    const clean = emailOrHandle.replace(/^@/, "").toLowerCase().trim();
    if (clean === adminEmail || clean === adminEmail.split("@")[0].toLowerCase()) return true;
  }
  return false;
}

function hasDoublePoints(profile: any, emailOrHandle?: string | null, adminEmailParam?: string): boolean {
  // L'amministratore riceve SEMPRE priorità massima e punti doppi 2x
  if (isUserAdmin(profile, emailOrHandle, adminEmailParam)) return true;
  return profile?.tipo_abbonamento === "annuale" || profile?.tipo_abbonamento === "lifetime";
}

async function resolveProfile(adminDb: any, userId?: string | null, userEmailOrHandle?: string | null) {
  if (userId) {
    const { data: p } = await adminDb.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (p) return p;
  }
  if (!userEmailOrHandle) return null;

  const raw = userEmailOrHandle.trim();
  const clean = raw.replace(/^@/, "").trim().toLowerCase();

  // 1. Email esatta (se contiene @ e un dominio)
  if (raw.includes("@") && raw.includes(".") && !raw.startsWith("@")) {
    const { data: p } = await adminDb.from("profiles").select("*").eq("email", raw.toLowerCase()).maybeSingle();
    if (p) return p;
  }

  // 2. Cerca per username
  const { data: pUser } = await adminDb.from("profiles").select("*").ilike("username", clean).maybeSingle();
  if (pUser) return pUser;

  // 3. Cerca per prefisso email (es. mrtrrt67@%)
  const { data: pPrefix } = await adminDb.from("profiles").select("*").ilike("email", `${clean}@%`).maybeSingle();
  if (pPrefix) return pPrefix;

  // 4. Fallback per raw email
  const { data: pRaw } = await adminDb.from("profiles").select("*").eq("email", raw).maybeSingle();
  if (pRaw) return pRaw;

  return null;
}

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
      .select("id, email, username, tier, tipo_abbonamento, is_admin, punti");

    const profilesByHandleOrEmail: Record<string, any> = {};
    (allProfiles || []).forEach((p: any) => {
      if (p.email) {
        const em = p.email.toLowerCase();
        profilesByHandleOrEmail[em] = p;
        profilesByHandleOrEmail[`@${em.split("@")[0]}`] = p;
        profilesByHandleOrEmail[em.split("@")[0]] = p;
      }
      if (p.username) {
        const un = p.username.toLowerCase();
        profilesByHandleOrEmail[un] = p;
        profilesByHandleOrEmail[`@${un}`] = p;
      }
    });

    const enrichedPending = (pendingBloopers || []).map((b: any) => {
      const key = b.inserito_da ? b.inserito_da.toLowerCase().trim() : "";
      const p = key ? profilesByHandleOrEmail[key] : null;
      const isAdmin = isUserAdmin(p, key, adminEmail);
      const isPriority = isAdmin || hasDoublePoints(p, key, adminEmail);
      const isDoublePoints = !!isPriority;
      return {
        ...b,
        user_id: p?.id || null,
        user_tier: p?.tier || (isAdmin ? "premium" : "free"),
        user_sub: p?.tipo_abbonamento || (isAdmin ? "lifetime" : "nessuno"),
        is_admin: !!isAdmin,
        is_priority: !!isPriority,
        is_double_points: isDoublePoints,
      };
    });

    // Ordina mettendo le segnalazioni prioritarie (Admin/Annuale/Lifetime) in cima
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
      const isAdmin = isUserAdmin(p, null, adminEmail);
      const isPriority = isAdmin || hasDoublePoints(p, null, adminEmail);
      const handle = p?.email ? `@${p.email.split("@")[0]}` : "Utente Registrato";
      return {
        ...c,
        user_email: p?.email || null,
        user_handle: handle,
        user_tier: p?.tier || (isAdmin ? "premium" : "free"),
        user_sub: p?.tipo_abbonamento || (isAdmin ? "lifetime" : "nessuno"),
        user_points: p?.punti || 0,
        is_admin: !!isAdmin,
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

    // 3b. Archivio contestazioni e correzioni risolte
    const { data: rawResolvedContests } = await adminDb
      .from("voti_bloopers")
      .select("*, errori(*, films(titolo, anno, id))")
      .in("tipo", ["contestazione_risolta", "blooper_falso_risolto"])
      .order("created_at", { ascending: false })
      .limit(50);

    const enrichedResolvedContests = (rawResolvedContests || []).map((c: any) => {
      const p = c.user_id ? allProfiles?.find((prof: any) => prof.id === c.user_id) : null;
      const isAdmin = isUserAdmin(p, null, adminEmail);
      const handle = p?.email ? `@${p.email.split("@")[0]}` : (p?.username ? `@${p.username}` : "Utente Registrato");
      return {
        ...c,
        user_email: p?.email || null,
        user_handle: handle,
        user_tier: p?.tier || (isAdmin ? "admin" : "free"),
        is_admin: !!isAdmin,
      };
    });

    // 4. Correzioni blooper inviate dal modulo suggerimenti
    const { data: rawCorrections } = await adminDb
      .from("suggerimenti")
      .select("*")
      .ilike("messaggio", "%[Correzione blooper]%")
      .not("user_id", "is", null)
      .order("created_at", { ascending: false });

    const pendingCorrections = (rawCorrections || [])
      .filter((s: any) => !s.messaggio?.includes("[APPROVATO]") && !s.messaggio?.includes("[RIFIUTATO]"))
      .map((s: any) => {
        const key = s.email ? s.email.toLowerCase().trim() : "";
        const p = (s.user_id && allProfiles?.find((prof: any) => prof.id === s.user_id)) || (key ? profilesByHandleOrEmail[key] : null);
        const isAdmin = isUserAdmin(p, key, adminEmail);
        const isPriority = isAdmin || hasDoublePoints(p, key, adminEmail);
        const handle = p?.email ? `@${p.email.split("@")[0]}` : (s.email ? `@${s.email.split("@")[0]}` : "Utente");
        return {
          ...s,
          user_id: s.user_id || p?.id || null,
          user_handle: handle,
          user_tier: p?.tier || (isAdmin ? "premium" : "free"),
          user_sub: p?.tipo_abbonamento || (isAdmin ? "lifetime" : "nessuno"),
          user_points: p?.punti || 0,
          is_admin: !!isAdmin,
          is_priority: !!isPriority,
          is_double_points: !!isPriority,
        };
      });

    return NextResponse.json({
      pending: enrichedPending,
      contestazioni: enrichedContestazioni,
      approved: approvedUserBloopers || [],
      resolved_contests: enrichedResolvedContests,
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

      // 2. Risolvi profilo utente
      const targetProfile = await resolveProfile(adminDb, userId, userEmail);
      const isDouble = hasDoublePoints(targetProfile, userEmail, adminEmail);
      let awardedPts = points ? parseInt(String(points), 10) : (isDouble ? 20 : 10);
      if (isDouble && awardedPts === 10) {
        awardedPts = 20;
      }

      let rewardMsg = "";
      if (targetProfile) {
        const newTotal = (targetProfile.punti || 0) + awardedPts;
        const resReward = await checkAndAwardPointRewards(adminDb, targetProfile.id, newTotal);
        if (resReward?.message) {
          rewardMsg = ` (${resReward.message})`;
        } else if (resReward?.error) {
          rewardMsg = ` (⚠️ Attenzione errore salvataggio punti: ${resReward.error})`;
        }
      } else {
        rewardMsg = ` (⚠️ Profilo non trovato per l'utente "${userEmail || "anonimo"}")`;
      }

      const userTag = targetProfile?.email ? `@${targetProfile.email.split("@")[0]}` : (userEmail || "utente");
      const msg = isDouble
        ? `Blooper approvato! Assegnati ${awardedPts} pt a ${userTag} (Raddoppiati per Amministratore / Piano Annuale)${rewardMsg}`
        : `Blooper approvato e ${awardedPts} pt assegnati a ${userTag}!${rewardMsg}`;

      // Inserimento notifica celebrativa per l'utente che ha inviato il blooper
      if (targetProfile) {
        try {
          const { data: bData } = await adminDb
            .from("errori")
            .select("films(titolo, anno)")
            .eq("id", blooper_id)
            .maybeSingle();
          const filmTitolo = (bData as any)?.films?.titolo || "un film";
          await adminDb.from("notifiche_utenti").insert({
            user_id: targetProfile.id,
            tipo: "blooper_approvato",
            titolo: "Nuovo Blooper Approvato!",
            messaggio: `Il tuo blooper per "${filmTitolo}" è stato verificato ed è ora online nel catalogo! Ti sono stati accreditati ${awardedPts} punti.`,
            punti: awardedPts,
            film_titolo: filmTitolo,
            letta: false,
          });
        } catch {
          // Fallback
        }
      }

      return NextResponse.json({ success: true, message: msg });
    }

    if (action === "reject") {
      await adminDb.from("errori").delete().eq("id", blooper_id);
      return NextResponse.json({ success: true, message: "Segnalazione rifiutata ed eliminata." });
    }

    if (action === "correct_contestation") {
      // 1. Archivia contestazione come risolta nell'archivio storico
      if (contestazione_id) {
        await adminDb.from("voti_bloopers").update({ tipo: "contestazione_risolta" }).eq("id", contestazione_id);
      }

      // 2. Aggiorna blooper con la correzione e ricalcola i contatori
      if (blooper_id) {
        const { data: voti } = await adminDb
          .from("voti_bloopers")
          .select("tipo")
          .eq("errore_id", blooper_id);

        const conferme = (voti || []).filter((v: any) => v.tipo === "conferma").length;
        const contestazioni = (voti || []).filter((v: any) => v.tipo === "contestazione").length;

        const updateData: Record<string, any> = { conferme, contestazioni, provenienza: "utente" };
        if (minuto) updateData.minuto = minuto;
        if (descrizione) updateData.descrizione = descrizione;
        await adminDb.from("errori").update(updateData).eq("id", blooper_id);
      }

      // 3. Assegna punti al correttore
      const targetProfile = await resolveProfile(adminDb, userId, userEmail);
      let rewardMsg = "";
      if (targetProfile) {
        const isDouble = hasDoublePoints(targetProfile, userEmail, adminEmail);
        let basePts = points ? parseInt(String(points), 10) : (isDouble ? 20 : 10);
        const finalPts = isDouble && basePts === 10 ? 20 : basePts;
        const newTotal = (targetProfile.punti || 0) + finalPts;
        const resReward = await checkAndAwardPointRewards(adminDb, targetProfile.id, newTotal);
        rewardMsg = ` Assegnati ${finalPts} pt a ${targetProfile.email ? `@${targetProfile.email.split("@")[0]}` : "chi ha corretto"}!`;
        if (resReward?.message) rewardMsg += ` (${resReward.message})`;

        // Inserimento notifica celebrativa per l'utente
        try {
          let filmTitolo = "un film";
          if (blooper_id) {
            const { data: bData } = await adminDb
              .from("errori")
              .select("films(titolo, anno)")
              .eq("id", blooper_id)
              .maybeSingle();
            if ((bData as any)?.films?.titolo) {
              filmTitolo = `${(bData as any).films.titolo}${(bData as any).films.anno ? ` (${(bData as any).films.anno})` : ""}`;
            }
          }
          await adminDb.from("notifiche_utenti").insert({
            user_id: targetProfile.id,
            tipo: "contestazione_approvata",
            titolo: "Contestazione Approvata dall'Admin!",
            messaggio: `La tua correzione per "${filmTitolo}" è stata verificata e approvata! Ti sono stati accreditati ${finalPts} punti.`,
            punti: finalPts,
            film_titolo: filmTitolo,
            letta: false,
          });
        } catch {
          // Fallback gestito da voti_bloopers
        }
      }

      return NextResponse.json({ success: true, message: `Correzione salvata e contestazione risolta!${rewardMsg}` });
    }

    if (action === "delete_blooper") {
      let filmTitolo = "un film";
      if (blooper_id) {
        const { data: bData } = await adminDb
          .from("errori")
          .select("films(titolo, anno)")
          .eq("id", blooper_id)
          .maybeSingle();
        if ((bData as any)?.films?.titolo) {
          filmTitolo = `${(bData as any).films.titolo}${(bData as any).films.anno ? ` (${(bData as any).films.anno})` : ""}`;
        }
      }

      // Conserva la contestazione come risolta anziché cancellarla, così finisce nell'archivio e l'utente riceve la notifica
      if (contestazione_id) {
        await adminDb.from("voti_bloopers").update({ tipo: "blooper_falso_risolto" }).eq("id", contestazione_id);
      }
      if (blooper_id) {
        await adminDb.from("errori").delete().eq("id", blooper_id);
      }

      // Assegna punti al segnalatore della contestazione per aver smascherato il fake blooper
      const targetProfile = await resolveProfile(adminDb, userId, userEmail);
      let rewardMsg = "";
      if (targetProfile) {
        const isDouble = hasDoublePoints(targetProfile, userEmail, adminEmail);
        let basePts = points ? parseInt(String(points), 10) : (isDouble ? 20 : 10);
        const finalPts = isDouble && basePts === 10 ? 20 : basePts;
        const newTotal = (targetProfile.punti || 0) + finalPts;
        const resReward = await checkAndAwardPointRewards(adminDb, targetProfile.id, newTotal);
        rewardMsg = ` Assegnati ${finalPts} pt a ${targetProfile.email ? `@${targetProfile.email.split("@")[0]}` : "chi ha smascherato l'errore"}!`;
        if (resReward?.message) rewardMsg += ` (${resReward.message})`;

        // Inserimento notifica celebrativa per l'utente
        try {
          await adminDb.from("notifiche_utenti").insert({
            user_id: targetProfile.id,
            tipo: "blooper_falso_risolto",
            titolo: "Blooper Errato Smascherato!",
            messaggio: `Hai smascherato con successo un errore infondato in "${filmTitolo}". Il blooper è stato rimosso dal catalogo e hai guadagnato ${finalPts} punti!`,
            punti: finalPts,
            film_titolo: filmTitolo,
            letta: false,
          });
        } catch {
          // Fallback gestito da voti_bloopers
        }
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

    if (action === "delete_resolved_contest") {
      if (contestazione_id) {
        await adminDb.from("voti_bloopers").delete().eq("id", contestazione_id);
      }
      return NextResponse.json({ success: true, message: "Contestazione rimossa dall'archivio." });
    }

    if (action === "clear_resolved_contests") {
      await adminDb.from("voti_bloopers").delete().in("tipo", ["contestazione_risolta", "blooper_falso_risolto"]);
      return NextResponse.json({ success: true, message: "Archivio contestazioni risolte svuotato con successo." });
    }

    if (action === "approve_suggestion_correction") {
      const targetProfile = await resolveProfile(adminDb, userId, userEmail);
      let rewardMsg = "";
      let awardedPts = 10;
      let isDouble = false;

      if (targetProfile) {
        isDouble = hasDoublePoints(targetProfile, userEmail, adminEmail);
        let basePts = points ? parseInt(String(points), 10) : (isDouble ? 20 : 10);
        awardedPts = isDouble && basePts === 10 ? 20 : basePts;
        const newTotal = (targetProfile.punti || 0) + awardedPts;
        const resReward = await checkAndAwardPointRewards(adminDb, targetProfile.id, newTotal);
        if (resReward?.message) {
          rewardMsg = ` (${resReward.message})`;
        }
      }

      if (suggestion_id) {
        await adminDb.from("suggerimenti").delete().eq("id", suggestion_id);
      }

      const msg = isDouble
        ? `Correzione approvata! Assegnati ${awardedPts} pt (Raddoppiati per Amministratore / Piano Annuale)${rewardMsg}`
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
