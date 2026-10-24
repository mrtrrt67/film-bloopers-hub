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

    // 1. Metriche Utenti & Visite
    const [profilesRes, accessiRes, filmsRes] = await Promise.all([
      supabase.from("profiles").select("id, tier, calls_today, last_reset_date"),
      supabase.from("log_accessi").select("tipo"),
      supabase.from("films").select("id, titolo, anno, poster_url"),
    ]);

    const profiles = profilesRes.data || [];
    const totalUsers = profiles.length;
    const freeUsers = profiles.filter((p) => p.tier === "free").length;
    const premiumUsers = profiles.filter((p) => p.tier === "premium").length;

    const accessi = accessiRes.data || [];
    const totalVisits = accessi.length;
    const guestVisits = accessi.filter((a) => a.tipo === "ospite").length;

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

    const todayStr = new Date().toISOString().slice(0, 10);
    const aiCallsToday = statIa.filter((s) => (s.data_chiamata || "").startsWith(todayStr)).length;
    const aiErrorsToday = errIa.filter((e) => (e.created_at || "").startsWith(todayStr)).length;

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

    // 3. Top Ricerche
    const { data: logRicerche } = await supabase
      .from("log_ricerche")
      .select("termine, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    const searchCountMap: Record<string, { termine: string; count: number; lastSearch: string }> = {};
    for (const r of logRicerche || []) {
      const clean = (r.termine || "").trim().toLowerCase();
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
        guestVisits,
        totalUsers,
        freeUsers,
        premiumUsers,
        totalFilms,
        aiCallsToday,
        aiErrorsToday,
        totalAiCallsPast30d: statIa.length,
      },
      duplicatePosters,
      aiPerformance,
      topSearches,
      topVotedBloopers,
    });
  } catch (err: any) {
    console.error("Errore recupero statistiche admin:", err);
    return NextResponse.json({ error: err.message || "Errore statistiche" }, { status: 500 });
  }
}
