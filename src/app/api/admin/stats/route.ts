import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
    if (!user || user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 403 });
    }

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
      supabase.from("profiles").select("id, email, tier, calls_today, last_reset_date, tipo_abbonamento, subscription_type, data_scadenza, expires_at"),
      supabase.from("log_accessi").select("tipo, created_at"),
      supabase.from("films").select("id, titolo, anno, poster_url"),
    ]);

    const profiles = profilesRes.data || [];
    const nonAdminProfiles = profiles.filter((p) => p.email?.toLowerCase() !== adminEmail);
    const totalUsers = nonAdminProfiles.length;

    const activePremiumUsers = nonAdminProfiles.filter((p) => {
      if (p.tier !== "premium") return false;
      const scad = p.data_scadenza || p.expires_at ? String(p.data_scadenza || p.expires_at).slice(0, 10) : null;
      const sub = p.tipo_abbonamento || p.subscription_type || "nessuno";
      if ((sub === "mensile" || sub === "annuale") && scad && scad < todayUtc) return false;
      return true;
    }).length;

    const expiredUsers = nonAdminProfiles.filter((p) => {
      const scad = p.data_scadenza || p.expires_at ? String(p.data_scadenza || p.expires_at).slice(0, 10) : null;
      const sub = p.tipo_abbonamento || p.subscription_type || "nessuno";
      return (sub === "mensile" || sub === "annuale") && scad && scad < todayUtc;
    }).length;

    const freeUsers = nonAdminProfiles.filter((p) => p.tier === "free" || !p.tier).length;

    // Filtra gli accessi dell'amministratore per non inquinare le statistiche di traffico
    const adminIdPrefix = user.id.slice(0, 8);
    const accessi = (accessiRes.data || []).filter((a: any) => 
      !a.tipo?.includes(adminIdPrefix) && 
      a.tipo?.toLowerCase() !== "admin"
    );
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
      supabase.from("statistiche_ia").select("*").gte("data_chiamata", thirtyDaysStr).order("data_chiamata", { ascending: false }),
      supabase.from("log_errori_ia").select("*").gte("created_at", thirtyDaysStr).order("created_at", { ascending: false }),
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
    const { data: logRicerche } = await supabase
      .from("log_ricerche")
      .select("id, termine, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    // Filtra ricerche vuote, troppo corte (< 2 char) o generate da test di audit
    const rawSearches = (logRicerche || []).filter((r: any) => {
      const t = (r.termine || "").trim().toLowerCase();
      if (!t || t.length < 2 || t.startsWith("audit_")) return false;
      return true;
    });

    // Rimuove i sotto-frammenti digitati in rapida successione (es. "tit" prima di "titanic", "Matr" prima di "Matrix", "il mi" prima di "il miglio verde")
    const filteredSearches: typeof rawSearches = [];
    const subFragmentIds: string[] = [];

    for (let i = 0; i < rawSearches.length; i++) {
      const current = rawSearches[i];
      const curTerm = current.termine.trim().toLowerCase();
      const curTime = new Date(current.created_at).getTime();

      // Cerca nei vicini temporali se esiste una versione più completa dello stesso termine
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
      void supabase.from("log_ricerche").delete().in("id", subFragmentIds);
    }

    // Rimuove le tracce storiche dell'admin da log_accessi
    void supabase.from("log_accessi").delete().ilike("tipo", `%${adminIdPrefix}%`);

    const searchesToday = filteredSearches.filter((r) => isToday(r.created_at));
    const searchesTodayCount = searchesToday.length;

    const recentSearches = filteredSearches.slice(0, 20).map((r) => ({
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

    // 4. Bloopers più votati / discussi
    const { data: voti } = await supabase.from("voti_bloopers").select("errore_id, tipo");
    const votesMap: Record<string, { conferme: number; contestazioni: number; totale: number }> = {};
    for (const v of voti || []) {
      if (!v.errore_id) continue;
      if (!votesMap[v.errore_id]) votesMap[v.errore_id] = { conferme: 0, contestazioni: 0, totale: 0 };
      if (v.tipo === "conferma") votesMap[v.errore_id].conferme += 1;
      if (v.tipo === "contestazione") votesMap[v.errore_id].contestazioni += 1;
      votesMap[v.errore_id].totale += 1;
    }

    const topVoteIds = Object.entries(votesMap)
      .sort((a, b) => b[1].totale - a[1].totale)
      .slice(0, 8)
      .map(([id]) => id);

    let topVotedBloopers: any[] = [];
    if (topVoteIds.length > 0) {
      const { data: bloopersData } = await supabase
        .from("errori")
        .select("id, minuto, descrizione, film_id, films(titolo, anno)")
        .in("id", topVoteIds);

      topVotedBloopers = (bloopersData || []).map((b) => ({
        ...b,
        votes: votesMap[b.id] || { conferme: 0, contestazioni: 0, totale: 0 },
      })).sort((a, b) => b.votes.totale - a.votes.totale);
    }

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
      },
      duplicatePosters,
      aiPerformance,
      topSearches,
      recentSearches,
      topVotedBloopers,
    });
  } catch (err: any) {
    console.error("Errore recupero statistiche admin:", err);
    return NextResponse.json({ error: err.message || "Errore statistiche" }, { status: 500 });
  }
}
