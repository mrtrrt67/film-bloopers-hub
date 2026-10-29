import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTestAccount, isTestAccessType, shouldExcludeTestAccounts } from "@/lib/test-accounts";
import { deduplicateAccessRecords } from "@/lib/dedup-visits";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

    const adminDb = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;

    const now = new Date();
    const todayUtc = now.toISOString().slice(0, 10);
    const todayRome = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(now);
    const isToday = (dateStr?: string | null) => {
      if (!dateStr) return false;
      const d = String(dateStr).slice(0, 10);
      return d === todayUtc || d === todayRome;
    };

    // 1. Metriche Utenti & Visite
    const [profilesRes, accessiRes, filmsRes] = await Promise.all([
      adminDb.from("profiles").select("id, email, username, tier, calls_today, last_reset_date, tipo_abbonamento, subscription_type, data_scadenza, expires_at"),
      adminDb.from("log_accessi").select("id, tipo, created_at"),
      adminDb.from("films").select("id, titolo, anno, poster_url"),
    ]);

    const profiles = profilesRes.data || [];
    const excludeTests = shouldExcludeTestAccounts(request);

    // In STAGING gli utenti di test rimangono visibili, conteggiati e attivi.
    // In PRODUZIONE escludiamo categoricamente l'amministratore e gli account di test/audit.
    const activeProfiles = profiles.filter((p) => {
      const isAdm = p.email?.toLowerCase() === adminEmail || p.email?.toLowerCase().includes("mrtrrt67");
      if (isAdm) return false;
      if (excludeTests && isTestAccount(p.email, p.username)) return false;
      return true;
    });

    const totalUsers = activeProfiles.length;

    const activePremiumUsers = activeProfiles.filter((p) => {
      if (p.tier !== "premium") return false;
      const scad = p.data_scadenza || p.expires_at ? String(p.data_scadenza || p.expires_at).slice(0, 10) : null;
      const sub = p.tipo_abbonamento || p.subscription_type || "nessuno";
      if ((sub === "mensile" || sub === "annuale") && scad && scad < todayUtc) return false;
      return true;
    }).length;

    const expiredUsers = activeProfiles.filter((p) => {
      const scad = p.data_scadenza || p.expires_at ? String(p.data_scadenza || p.expires_at).slice(0, 10) : null;
      const sub = p.tipo_abbonamento || p.subscription_type || "nessuno";
      return (sub === "mensile" || sub === "annuale") && scad && scad < todayUtc;
    }).length;

    const freeUsers = activeProfiles.filter((p) => p.tier === "free" || !p.tier).length;

    // Raccoglie i prefissi e username di test SOLO se excludeTests è attivo (produzione)
    const testPrefixes = new Set<string>();
    const adminIdPrefix = user.id.slice(0, 8);
    testPrefixes.add(adminIdPrefix.toLowerCase());

    if (excludeTests) {
      profiles.forEach((p) => {
        if (isTestAccount(p.email, p.username)) {
          if (p.id) {
            testPrefixes.add(p.id.slice(0, 8).toLowerCase());
            testPrefixes.add(p.id.toLowerCase());
          }
          if (p.username) testPrefixes.add(p.username.toLowerCase());
          if (p.email) testPrefixes.add(p.email.toLowerCase());
        }
      });
    }

    // Filtra gli accessi: l'admin è sempre escluso, i test solo in produzione
    const rawAccessi = (accessiRes.data || []).filter((a: any) => {
      const t = (a.tipo || "").toLowerCase();
      if (t.includes(adminIdPrefix) || t.includes("mrtrrt67") || t.includes(adminEmail) || t === "admin") {
        return false;
      }
      if (excludeTests && isTestAccessType(a.tipo, testPrefixes)) {
        return false;
      }
      return true;
    });

    // Deduplica accessi cloni prima dei conteggi
    const { uniqueRecords: accessi, duplicateIds: statDuplicateIds } = deduplicateAccessRecords(rawAccessi, 4000);

    // Se ci sono ID duplicati, puliscili dal DB
    if (statDuplicateIds.length > 0) {
      void (async () => {
        try {
          for (let i = 0; i < statDuplicateIds.length; i += 100) {
            const batch = statDuplicateIds.slice(i, i + 100);
            await adminDb.from("log_accessi").delete().in("id", batch);
          }
        } catch {}
      })();
    }

    const totalVisits = accessi.length;
    const todayVisits = accessi.filter((a) => isToday(a.created_at)).length;
    const guestVisits = accessi.filter((a) => a.tipo === "ospite").length;
    const guestVisitsToday = accessi.filter((a) => a.tipo === "ospite" && isToday(a.created_at)).length;

    const allFilms = filmsRes.data || [];
    const totalFilms = allFilms.length;

    // Rilevamento locandine duplicate
    const posterMap: Record<string, any[]> = {};
    for (const f of allFilms) {
      if (f.poster_url && f.poster_url.trim()) {
        if (!posterMap[f.poster_url]) posterMap[f.poster_url] = [];
        posterMap[f.poster_url].push({ id: f.id, titolo: f.titolo, anno: f.anno });
      }
    }
    const duplicatePosters = Object.entries(posterMap)
      .filter(([_, list]) => list.length > 1)
      .map(([url, films]) => ({ url, films, count: films.length }));

    // 2. Metriche IA (ultimi 30 giorni)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysStr = thirtyDaysAgo.toISOString();

    const [statIaRes, errIaRes] = await Promise.all([
      adminDb.from("statistiche_ia").select("*").gte("data_chiamata", thirtyDaysStr).order("data_chiamata", { ascending: false }),
      adminDb.from("log_errori_ia").select("*").gte("created_at", thirtyDaysStr).order("created_at", { ascending: false }),
    ]);

    const statIa = statIaRes.data || [];
    const errIa = errIaRes.data || [];

    const aiCallsToday = statIa.filter((s) => isToday(s.data_chiamata)).length;
    const aiErrorsToday = errIa.filter((e) => isToday(e.created_at)).length;

    // Aggregazione prestazioni per giorno e modello
    const performanceMap: Record<string, { giorno: string; modello: string; riuscite: number; fallite: number }> = {};

    for (const s of statIa) {
      const giorno = (s.data_chiamata || "").slice(0, 10);
      const modello = s.modello || "sconosciuto";
      const key = `${giorno}_${modello}`;
      if (!performanceMap[key]) {
        performanceMap[key] = { giorno, modello, riuscite: 0, fallite: 0 };
      }
      performanceMap[key].riuscite += 1;
    }

    for (const e of errIa) {
      const giorno = (e.created_at || "").slice(0, 10);
      const modello = e.modello || "sconosciuto";
      const key = `${giorno}_${modello}`;
      if (!performanceMap[key]) {
        performanceMap[key] = { giorno, modello, riuscite: 0, fallite: 0 };
      }
      performanceMap[key].fallite += 1;
    }

    const aiPerformance = Object.values(performanceMap)
      .map((item) => {
        const totale = item.riuscite + item.fallite;
        const tasso = totale > 0 ? Number(((item.riuscite / totale) * 100).toFixed(1)) : 0;
        return { ...item, totale, tasso };
      })
      .sort((a, b) => b.giorno.localeCompare(a.giorno));

    // 3. Top Ricerche & Ultime Ricerche (esclude test, frammenti parziali e deduplica)
    const { data: logRicerche } = await adminDb
      .from("log_ricerche")
      .select("id, termine, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    const rawSearches = (logRicerche || []).filter((r: any) => {
      const t = (r.termine || "").trim().toLowerCase();
      if (!t || t.length < 2 || (excludeTests && t.startsWith("audit_"))) return false;
      return true;
    });

    const filteredSearches: typeof rawSearches = [];
    const subFragmentIds: string[] = [];

    for (let i = 0; i < rawSearches.length; i++) {
      const current = rawSearches[i];
      const curTerm = current.termine.trim().toLowerCase();
      const curTime = new Date(current.created_at).getTime();

      const isSubFragment = rawSearches.some((other, oIdx) => {
        if (i === oIdx) return false;
        const otherTerm = other.termine.trim().toLowerCase();
        const otherTime = new Date(other.created_at).getTime();
        const timeDiffSec = Math.abs(curTime - otherTime) / 1000;
        return timeDiffSec <= 60 && otherTerm.length > curTerm.length && otherTerm.startsWith(curTerm);
      });

      if (isSubFragment) {
        subFragmentIds.push(current.id);
      } else {
        filteredSearches.push(current);
      }
    }

    // Pulisce in background i sotto-frammenti e i test obsoleti dal DB
    if (subFragmentIds.length > 0) {
      void adminDb.from("log_ricerche").delete().in("id", subFragmentIds);
    }

    // Rimuove le tracce storiche dell'admin da log_accessi (sempre)
    void adminDb.from("log_accessi").delete().ilike("tipo", `%${adminIdPrefix}%`);
    void adminDb.from("log_accessi").delete().ilike("tipo", `%mrtrrt67%`);
    void adminDb.from("log_accessi").delete().ilike("tipo", `%${adminEmail}%`);

    // In produzione ripulisce anche i log di test, in staging li mantiene
    if (excludeTests) {
      void adminDb.from("log_accessi").delete().ilike("tipo", `audit_%`);
      void adminDb.from("log_accessi").delete().ilike("tipo", `test_%`);
    }

    const searchesToday = filteredSearches.filter((r) => isToday(r.created_at));
    const searchesTodayCount = searchesToday.length;

    const recentSearches = filteredSearches.slice(0, 60).map((r) => ({
      id: r.id,
      termine: r.termine.trim(),
      created_at: r.created_at,
      is_today: isToday(r.created_at),
    }));

    const searchCountMap: Record<string, { termine: string; count: number; lastSearch: string }> = {};
    for (const r of filteredSearches) {
      const clean = r.termine.trim().toLowerCase();
      if (!clean) continue;
      if (!searchCountMap[clean]) {
        searchCountMap[clean] = { termine: r.termine.trim(), count: 0, lastSearch: r.created_at };
      }
      searchCountMap[clean].count += 1;
      if (r.created_at > searchCountMap[clean].lastSearch) {
        searchCountMap[clean].lastSearch = r.created_at;
      }
    }

    const topSearches = Object.values(searchCountMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 4. Statistiche & Prospetto Bloopers (👍 e 👎)
    const { count: totalBloopersCount } = await adminDb
      .from("errori")
      .select("*", { count: "exact", head: true });

    const { data: allBloopersSummary } = await adminDb
      .from("errori")
      .select("conferme, contestazioni, provenienza, inserito_da");

    let totalThumbsUp = 0;
    let totalThumbsDown = 0;
    let aiBloopersCount = 0;
    let userBloopersCount = 0;

    for (const b of allBloopersSummary || []) {
      const isAi =
        b.provenienza === "ia" ||
        !b.inserito_da ||
        b.inserito_da.toLowerCase().startsWith("ia") ||
        b.inserito_da.toLowerCase().includes("filmbloopers");

      if (isAi) aiBloopersCount++;
      else userBloopersCount++;

      totalThumbsUp += b.conferme || 0;
      totalThumbsDown += b.contestazioni || 0;
    }

    const totalVotes = totalThumbsUp + totalThumbsDown;
    const globalApprovalRate = totalVotes > 0 ? Math.round((totalThumbsUp / totalVotes) * 100) : 100;

    const { data: votedBloopers } = await adminDb
      .from("errori")
      .select("id, minuto, categoria, descrizione, conferme, contestazioni, provenienza, inserito_da, creato_il, film_id, films(id, titolo, anno)")
      .or("conferme.gt.0,contestazioni.gt.0")
      .order("conferme", { ascending: false })
      .limit(60);

    let prospectList = [...(votedBloopers || [])];

    if (prospectList.length < 30) {
      const { data: recentBloopers } = await adminDb
        .from("errori")
        .select("id, minuto, categoria, descrizione, conferme, contestazioni, provenienza, inserito_da, creato_il, film_id, films(id, titolo, anno)")
        .order("creato_il", { ascending: false })
        .limit(40);

      const existingIds = new Set(prospectList.map((b) => b.id));
      for (const rb of recentBloopers || []) {
        if (!existingIds.has(rb.id)) {
          prospectList.push(rb);
          existingIds.add(rb.id);
        }
      }
    }

    const bloopersStats = {
      total: totalBloopersCount || (allBloopersSummary?.length ?? 0),
      aiCount: aiBloopersCount,
      userCount: userBloopersCount,
      totalThumbsUp,
      totalThumbsDown,
      totalVotes,
      globalApprovalRate,
      list: prospectList,
    };

    return NextResponse.json({
      metrics: {
        totalVisits,
        todayVisits,
        guestVisits,
        guestVisitsToday,
        totalUsers,
        freeUsers,
        premiumUsers: activePremiumUsers,
        expiredUsers,
        totalFilms,
        aiCallsToday,
        aiErrorsToday,
        totalAiCallsPast30d: statIa.length,
        searchesTodayCount,
        totalSearches: filteredSearches.length,
        isStaging: !excludeTests,
      },
      duplicatePosters,
      aiPerformance,
      topSearches,
      recentSearches,
      bloopersStats,
    });
  } catch (err: any) {
    console.error("Errore recupero statistiche admin:", err);
    return NextResponse.json({ error: err.message || "Errore statistiche" }, { status: 500 });
  }
}
