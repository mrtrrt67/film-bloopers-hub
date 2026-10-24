"use client";

import { useState, useEffect } from "react";
import { 
  BarChart3, 
  ExternalLink, 
  TrendingUp, 
  Users, 
  Film, 
  Bot, 
  AlertTriangle, 
  Search, 
  Flame, 
  RefreshCw,
  Copy
} from "lucide-react";

interface AdminStatsTabProps {
  onNavigateToFilms?: (filter?: string) => void;
}

export default function AdminStatsTab({ onNavigateToFilms }: AdminStatsTabProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchView, setSearchView] = useState<"recent" | "top">("recent");

  const amazonDashboardUrl = process.env.NEXT_PUBLIC_AMAZON_DASHBOARD_URL || "https://programma-affiliazione.amazon.it/home";
  const amazonTag = process.env.NEXT_PUBLIC_AMAZON_TAG || "cineblp196704-21";

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Errore fetch stats:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const duplicatePosters = data?.duplicatePosters || [];
  const aiPerformance = data?.aiPerformance || [];
  const topSearches = data?.topSearches || [];
  const recentSearches = data?.recentSearches || [];
  const topVotedBloopers = data?.topVotedBloopers || [];

  return (
    <div className="space-y-8">
      {/* 1. DASHBOARD AMAZON AFFILIATI (CARD IN EVIDENZA) */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-300">
              🛒 Programma Affiliazione Amazon
            </div>
            <h2 className="text-2xl font-black text-white">Dashboard Ufficiale Amazon Affiliati</h2>
            <p className="max-w-2xl text-sm text-zinc-300">
              Accedi alla console ufficiale di Amazon per monitorare in tempo reale ordini generati, click sui link dei film, conversioni e commissioni maturate con il tuo tag affiliato <span className="font-mono font-bold text-amber-400">{amazonTag}</span>.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <a
              href={amazonDashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 text-sm font-bold text-zinc-950 shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all text-center"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Apri Dashboard Amazon Affiliati</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </a>
          </div>
        </div>
      </div>

      {/* METRICHE PRINCIPALI IN TEMPO REALE */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-400" />
            Console Traffico & Metriche in Tempo Reale
          </h3>
          <button
            onClick={fetchStats}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 transition"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            Aggiorna
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
            <span className="text-xs text-zinc-400 font-medium">👁️ Visite Totali</span>
            <p className="text-2xl font-black text-white mt-1">{metrics.totalVisits ?? 0}</p>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Oggi: {metrics.todayVisits ?? 0}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
            <span className="text-xs text-zinc-400 font-medium">👻 Visite Ospiti</span>
            <p className="text-2xl font-black text-zinc-200 mt-1">{metrics.guestVisits ?? 0}</p>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Oggi: {metrics.guestVisitsToday ?? 0}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
            <span className="text-xs text-zinc-400 font-medium">👥 Utenti Reg.</span>
            <p className="text-2xl font-black text-amber-400 mt-1">{metrics.totalUsers ?? 0}</p>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Free: {metrics.freeUsers ?? 0}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
            <span className="text-xs text-zinc-400 font-medium">⭐ Premium Attivi</span>
            <p className="text-2xl font-black text-amber-300 mt-1">{metrics.premiumUsers ?? 0}</p>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
              {(metrics.expiredUsers || 0) > 0 ? (
                <span className="text-rose-400 font-semibold">⚠️ {metrics.expiredUsers} scaduti</span>
              ) : (
                "Tutti attivi"
              )}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
            <span className="text-xs text-zinc-400 font-medium">🔍 Ricerche Oggi</span>
            <p className="text-2xl font-black text-sky-400 mt-1">{metrics.searchesTodayCount ?? 0}</p>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Totali: {metrics.totalSearches ?? 0}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
            <span className="text-xs text-zinc-400 font-medium">🤖 IA Riuscite Oggi</span>
            <p className="text-2xl font-black text-emerald-400 mt-1">{metrics.aiCallsToday ?? 0}</p>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
              {(metrics.aiErrorsToday || 0) > 0 ? (
                <span className="text-rose-400 font-semibold">⚠️ {metrics.aiErrorsToday} err.</span>
              ) : (
                "0 errori oggi"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ALERT LOCANDINE CONDIVISE / DUPLICATE */}
      {duplicatePosters.length > 0 && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <h4 className="text-sm font-bold text-amber-200">
                Attenzione: Rilevati {duplicatePosters.length} gruppi di film con la stessa identica locandina
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Questo accade tipicamente con le saghe o quando la ricerca automatica TMDB associava lo stesso film a titoli simili (es. <em>Oak Street</em> e <em>La fine di Oak Street</em>, oppure le pellicole di <em>Star Wars</em>). Puoi modificarli o riassegnarli comodamente nella scheda <strong>Archivio Film</strong>.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {duplicatePosters.slice(0, 5).map((group: any, idx: number) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900/80 border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                  >
                    <span className="font-semibold text-amber-300">{group.films.length} film:</span>
                    {group.films.map((f: any) => f.titolo).slice(0, 2).join(", ")}
                    {group.films.length > 2 && "..."}
                  </span>
                ))}
              </div>
              {onNavigateToFilms && (
                <button
                  onClick={() => onNavigateToFilms("duplicates")}
                  className="mt-2 text-xs font-bold text-amber-400 hover:underline inline-flex items-center gap-1"
                >
                  Gestisci e correggi nell&apos;Archivio Film &rarr;
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2 COLONNE: RICERCHE & BLOOPERS PIÙ VOTATI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TABELLA RICERCHE: RECENTI VS TOP */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Search className="h-4 w-4 text-amber-400" />
              <span>Ricerche Utenti & Visitatori</span>
            </h4>
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-[11px]">
              <button
                onClick={() => setSearchView("recent")}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  searchView === "recent"
                    ? "bg-amber-500 text-zinc-950 shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Ultime ({recentSearches.length})
              </button>
              <button
                onClick={() => setSearchView("top")}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  searchView === "top"
                    ? "bg-amber-500 text-zinc-950 shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Top 10 Frequenti
              </button>
            </div>
          </div>

          {searchView === "recent" ? (
            recentSearches.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">Nessuna ricerca recente registrata.</p>
            ) : (
              <div className="overflow-x-auto max-h-[360px] overflow-y-auto pr-1">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="pb-2 font-medium">Termine Cercato</th>
                      <th className="pb-2 text-right font-medium">Data / Ora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300 font-mono">
                    {recentSearches.map((s: any, idx: number) => (
                      <tr key={s.id || idx} className="hover:bg-zinc-800/30">
                        <td className="py-2.5 font-bold text-white font-sans flex items-center gap-2">
                          <span>{s.termine}</span>
                          {s.is_today && (
                            <span className="rounded bg-sky-500/20 text-sky-300 text-[9px] font-mono px-1.5 py-0.5 border border-sky-500/30">
                              OGGI
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-right text-zinc-400 text-[11px]">
                          {s.created_at ? s.created_at.slice(0, 16).replace("T", " ") : "N/D"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            topSearches.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">Nessuna ricerca frequente al momento.</p>
            ) : (
              <div className="overflow-x-auto max-h-[360px] overflow-y-auto pr-1">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="pb-2 font-medium">Termine di Ricerca</th>
                      <th className="pb-2 text-right font-medium">Frequenza</th>
                      <th className="pb-2 text-right font-medium">Ultima Ricerca</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {topSearches.map((s: any, idx: number) => (
                      <tr key={idx} className="hover:bg-zinc-800/30">
                        <td className="py-2.5 font-bold text-white flex items-center gap-2">
                          <span className="text-zinc-600 font-mono text-[10px]">{idx + 1}.</span>
                          {s.termine}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-amber-400">
                          {s.count}
                        </td>
                        <td className="py-2.5 text-right font-mono text-zinc-500 text-[11px]">
                          {s.lastSearch ? s.lastSearch.slice(0, 16).replace("T", " ") : "N/D"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        {/* BLOOPERS PIÙ VOTATI / DISCUSSI */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-400" />
              🔥 Bloopers più votati / discussi
            </h4>
            <span className="text-xs text-zinc-500 font-mono">Dati da voti_bloopers</span>
          </div>

          {topVotedBloopers.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">Nessun voto registrato sui bloopers.</p>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {topVotedBloopers.map((b: any) => (
                <div
                  key={b.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 hover:border-zinc-700 transition"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-1">
                    <span>🎬 {b.films?.titolo || "Film"} ({b.films?.anno || "N/D"})</span>
                    <span className="font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded text-[10px]">
                      ⏱️ {b.minuto}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 line-clamp-2 mb-2">
                    {b.descrizione}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] font-semibold text-zinc-400">
                    <span className="text-emerald-400">👍 {b.votes?.conferme || 0} conferme</span>
                    <span className="text-rose-400">⚠️ {b.votes?.contestazioni || 0} contestazioni</span>
                    <span className="text-amber-300 font-bold ml-auto">
                      Totale: {b.votes?.totale || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PROSPETTO ANALITICO GIORNALIERO PER MODELLO */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Bot className="h-4 w-4 text-amber-400" />
            🤖 Prospetto Prestazioni IA Giornaliero per Modello (Ultimi 30 giorni)
          </h4>
          <span className="text-xs text-zinc-500 font-mono">Dati da statistiche_ia & log_errori_ia</span>
        </div>

        {aiPerformance.length === 0 ? (
          <p className="text-xs text-zinc-500 py-6 text-center">Nessun dato di utilizzo IA registrato di recente.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium">Modello IA</th>
                  <th className="pb-2 text-right font-medium">Riuscite</th>
                  <th className="pb-2 text-right font-medium">Fallite</th>
                  <th className="pb-2 text-right font-medium">Totale Richieste</th>
                  <th className="pb-2 text-right font-medium">Tasso di Successo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300 font-mono">
                {aiPerformance.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-zinc-800/30">
                    <td className="py-2.5 font-bold text-white">{row.giorno}</td>
                    <td className="py-2.5 font-semibold text-amber-300 font-sans">{row.modello}</td>
                    <td className="py-2.5 text-right text-emerald-400 font-bold">{row.riuscite}</td>
                    <td className="py-2.5 text-right text-rose-400 font-bold">{row.fallite}</td>
                    <td className="py-2.5 text-right text-zinc-200">{row.totale}</td>
                    <td className="py-2.5 text-right font-bold">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                          row.tasso >= 90
                            ? "bg-emerald-500/20 text-emerald-300"
                            : row.tasso >= 70
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {row.tasso}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
