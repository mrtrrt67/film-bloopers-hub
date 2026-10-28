"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
  Copy,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  Sparkles,
  Filter,
  Tag,
  Clock,
  ArrowRight,
  User,
  ShieldAlert
} from "lucide-react";
import AdminPagination from "./AdminPagination";

interface AdminStatsTabProps {
  onNavigateToFilms?: (filter?: string) => void;
}

export default function AdminStatsTab({ onNavigateToFilms }: AdminStatsTabProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchView, setSearchView] = useState<"recent" | "top">("recent");

  // Paginazione per prospetto IA e ricerche
  const [aiPerfPage, setAiPerfPage] = useState(1);
  const [aiPerfPageSize, setAiPerfPageSize] = useState(10);
  const [aiPerfModelFilter, setAiPerfModelFilter] = useState("all");
  const [recentSearchPage, setRecentSearchPage] = useState(1);

  // Filtri & Paginazione Prospetto Bloopers
  const [blooperSearchQuery, setBlooperSearchQuery] = useState("");
  const [blooperFilterType, setBlooperFilterType] = useState<"all" | "voted" | "ai" | "user" | "high_conf" | "high_cont">("all");
  const [blooperSortBy, setBlooperSortBy] = useState<"conferme" | "contestazioni" | "votes" | "recent">("conferme");
  const [blooperPage, setBlooperPage] = useState(1);
  const [blooperPageSize, setBlooperPageSize] = useState(8);

  const amazonDashboardUrl = process.env.NEXT_PUBLIC_AMAZON_DASHBOARD_URL || "https://programma-affiliazione.amazon.it/home";
  const amazonTag = process.env.NEXT_PUBLIC_AMAZON_TAG || "cineblp196704-21";

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      setErrorMessage(null);
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setErrorMessage(errJson?.error || `Errore HTTP ${res.status}: Impossibile caricare le statistiche.`);
      }
    } catch (err: any) {
      console.error("Errore fetch stats:", err);
      setErrorMessage(err?.message || "Errore di connessione durante il recupero dei dati.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    setAiPerfPage(1);
  }, [aiPerfModelFilter]);

  useEffect(() => {
    setRecentSearchPage(1);
  }, [searchView]);

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

  const bloopersStats = data?.bloopersStats || {
    total: 0,
    aiCount: 0,
    userCount: 0,
    totalThumbsUp: 0,
    totalThumbsDown: 0,
    totalVotes: 0,
    globalApprovalRate: 100,
    list: [],
  };

  const filteredBloopers = useMemo(() => {
    const list: any[] = bloopersStats.list || [];
    return list
      .filter((b: any) => {
        if (!b) return false;
        const film = Array.isArray(b.films) ? b.films[0] : b.films;

        if (blooperSearchQuery.trim()) {
          const q = blooperSearchQuery.toLowerCase();
          const matchTitle = String(film?.titolo || "").toLowerCase().includes(q);
          const matchDesc = String(b.descrizione || "").toLowerCase().includes(q);
          const matchCat = String(b.categoria || "").toLowerCase().includes(q);
          const matchAuthor = String(b.inserito_da || "").toLowerCase().includes(q);
          const matchMin = String(b.minuto || "").toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchCat && !matchAuthor && !matchMin) return false;
        }

        const inserito = String(b.inserito_da || "").toLowerCase();
        const isAi =
          b.provenienza === "ia" ||
          !b.inserito_da ||
          inserito.startsWith("ia") ||
          inserito.includes("filmbloopers");

        if (blooperFilterType === "voted") {
          return (Number(b.conferme) || 0) > 0 || (Number(b.contestazioni) || 0) > 0;
        }
        if (blooperFilterType === "high_conf") {
          return (Number(b.conferme) || 0) > 0;
        }
        if (blooperFilterType === "high_cont") {
          return (Number(b.contestazioni) || 0) > 0;
        }
        if (blooperFilterType === "ai") {
          return isAi;
        }
        if (blooperFilterType === "user") {
          return !isAi;
        }

        return true;
      })
      .sort((a: any, b: any) => {
        if (blooperSortBy === "votes") {
          return ((Number(b.conferme) || 0) + (Number(b.contestazioni) || 0)) - ((Number(a.conferme) || 0) + (Number(a.contestazioni) || 0));
        }
        if (blooperSortBy === "conferme") {
          return (Number(b.conferme) || 0) - (Number(a.conferme) || 0);
        }
        if (blooperSortBy === "contestazioni") {
          return (Number(b.contestazioni) || 0) - (Number(a.contestazioni) || 0);
        }
        return new Date(b.creato_il || 0).getTime() - new Date(a.creato_il || 0).getTime();
      });
  }, [bloopersStats.list, blooperSearchQuery, blooperFilterType, blooperSortBy]);

  const paginatedBloopers = useMemo(() => {
    const start = (blooperPage - 1) * blooperPageSize;
    return filteredBloopers.slice(start, start + blooperPageSize);
  }, [filteredBloopers, blooperPage, blooperPageSize]);

  // Modelli IA disponibili nel prospetto
  const availableModels = Array.from(
    new Set(aiPerformance.map((r: any) => r.modello).filter(Boolean))
  ) as string[];

  const filteredAiPerformance = aiPerformance.filter((row: any) => {
    if (aiPerfModelFilter === "all") return true;
    return row.modello === aiPerfModelFilter;
  });

  const paginatedAiPerformance = filteredAiPerformance.slice(
    (aiPerfPage - 1) * aiPerfPageSize,
    aiPerfPage * aiPerfPageSize
  );

  const searchPageSize = 10;
  const paginatedRecentSearches = recentSearches.slice(
    (recentSearchPage - 1) * searchPageSize,
    recentSearchPage * searchPageSize
  );

  return (
    <div className="space-y-8">
      {/* BANNER SEGNALAZIONE ERRORE SE PRESENTE */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-950/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-rose-200">Avviso Caricamento Statistiche</h4>
              <p className="text-xs text-rose-300/80 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button
            onClick={fetchStats}
            disabled={refreshing}
            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 transition disabled:opacity-50 shrink-0 flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Riprova
          </button>
        </div>
      )}

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
              <div className="overflow-x-auto overflow-y-auto pr-1">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="pb-2 font-medium">Termine Cercato</th>
                      <th className="pb-2 text-right font-medium">Data / Ora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300 font-mono">
                    {paginatedRecentSearches.map((s: any, idx: number) => (
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

                {recentSearches.length > searchPageSize && (
                  <AdminPagination
                    currentPage={recentSearchPage}
                    totalItems={recentSearches.length}
                    pageSize={searchPageSize}
                    onPageChange={setRecentSearchPage}
                    itemName="ricerche"
                  />
                )}
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

        {/* SINTESI GRADIMENTO BLOOPERS (CARD COMPATTA) */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-400" />
              Sintesi Gradimento Bloopers
            </h4>
            <span className="text-xs text-zinc-500 font-mono">Dati catalogo</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <ThumbsUp className="h-4 w-4" />
                <span>Pollici in Su</span>
              </div>
              <div className="text-xl font-black text-white font-mono">{bloopersStats.totalThumbsUp}</div>
              <p className="text-[10px] text-zinc-400">Conferme totali espresse</p>
            </div>

            <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                <ThumbsDown className="h-4 w-4" />
                <span>Contestazioni</span>
              </div>
              <div className="text-xl font-black text-white font-mono">{bloopersStats.totalThumbsDown}</div>
              <p className="text-[10px] text-zinc-400">Errori contestati</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Archivio Totale:</span>
              <span className="font-bold text-white font-mono">{bloopersStats.total} Bloopers</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span className="flex items-center gap-1 text-cyan-400">
                <Bot className="h-3 w-3" /> Generati da IA:
              </span>
              <span className="font-mono font-bold text-zinc-300">
                {bloopersStats.aiCount} ({bloopersStats.total > 0 ? Math.round((bloopersStats.aiCount / bloopersStats.total) * 100) : 0}%)
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span className="flex items-center gap-1 text-amber-400">
                <User className="h-3 w-3" /> Inseriti da Utenti:
              </span>
              <span className="font-mono font-bold text-zinc-300">{bloopersStats.userCount}</span>
            </div>
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Indice di Gradimento:</span>
              <span className="font-mono font-bold text-emerald-400">{bloopersStats.globalApprovalRate}% 👍</span>
            </div>
          </div>
        </div>
      </div>

      {/* PROSPETTO ANALITICO COMPLETO BLOOPERS & MONITORAGGIO GRADIMENTO (👍 / 👎) */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-amber-400" />
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                Prospetto Analitico Bloopers & Monitoraggio Voti (👍 / 👎)
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Quadro statistico dettagliato sui bloopers del catalogo: monitora in tempo reale le conferme positive e le contestazioni, analizza il gradimento percentuale e filtra tra bloopers IA e segnalazioni degli utenti.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800">
              Risultati: <strong className="text-amber-400">{filteredBloopers.length}</strong>
            </span>
          </div>
        </div>

        {/* Barra di Ricerca e Filtri */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Campo Cerca */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={blooperSearchQuery}
              onChange={(e) => {
                setBlooperSearchQuery(e.target.value);
                setBlooperPage(1);
              }}
              placeholder="Cerca per film, attore, minuto o testo..."
              className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          {/* Filtro Tipologia */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 lg:pb-0">
            <Filter className="h-3.5 w-3.5 text-zinc-500 shrink-0 mr-1" />
            {[
              { id: "all", label: "Tutti" },
              { id: "voted", label: "Con Voti (👍/👎)" },
              { id: "high_conf", label: "👍 Più Confermati" },
              { id: "high_cont", label: "👎 Più Contestati" },
              { id: "user", label: "👤 Solo Utenti" },
              { id: "ai", label: "🤖 Solo IA" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setBlooperFilterType(f.id as any);
                  setBlooperPage(1);
                }}
                className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  blooperFilterType === f.id
                    ? "bg-amber-500 text-zinc-950 shadow"
                    : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Ordinamento */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <span className="text-xs text-zinc-400 shrink-0">Ordina:</span>
            <select
              value={blooperSortBy}
              onChange={(e) => setBlooperSortBy(e.target.value as any)}
              className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-400 transition"
            >
              <option value="conferme">👍 Più Pollici in Su</option>
              <option value="contestazioni">👎 Più Contestazioni</option>
              <option value="votes">Totale Voti Espressi</option>
              <option value="recent">Più Recenti Inseriti</option>
            </select>
          </div>
        </div>

        {/* Tabella Prospetto Bloopers */}
        {filteredBloopers.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500 rounded-2xl border border-zinc-800 bg-zinc-950/40">
            Nessun blooper corrisponde ai criteri di ricerca impostati.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/60">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/90 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Film & Scena</th>
                    <th className="py-3 px-3 font-semibold">Origine / Autore</th>
                    <th className="py-3 px-4 font-semibold">Descrizione Blooper</th>
                    <th className="py-3 px-3 text-center font-semibold">👍 Voti Su</th>
                    <th className="py-3 px-3 text-center font-semibold">👎 Voti Giù</th>
                    <th className="py-3 px-4 text-center font-semibold">Attendibilità</th>
                    <th className="py-3 px-3 text-right font-semibold">Azione</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {paginatedBloopers.map((b: any) => {
                    const film = Array.isArray(b.films) ? b.films[0] : b.films;
                    const filmTitolo = film?.titolo || "Film";
                    const filmAnno = film?.anno || "N/D";
                    const filmId = film?.id || b.film_id;

                    const inseritoStr = String(b.inserito_da || "").toLowerCase();
                    const isAi =
                      b.provenienza === "ia" ||
                      !b.inserito_da ||
                      inseritoStr.startsWith("ia") ||
                      inseritoStr.includes("filmbloopers");

                    const conf = Number(b.conferme) || 0;
                    const cont = Number(b.contestazioni) || 0;
                    const tot = conf + cont;
                    const percent = tot > 0 ? Math.round((conf / tot) * 100) : 100;
                    const minutoClean = String(b.minuto || "00:00").replace(/^~/, "");

                    return (
                      <tr key={b.id} className="hover:bg-zinc-800/30 transition group">
                        {/* Film & Minuto */}
                        <td className="py-3.5 px-4 font-sans max-w-[190px]">
                          <div className="font-black text-white group-hover:text-amber-400 transition truncate">
                            🎬 {filmTitolo}
                          </div>
                          <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] mt-0.5 font-mono">
                            <span>({filmAnno})</span>
                            <span>•</span>
                            <span className="text-amber-400/90 font-bold">~{minutoClean}</span>
                          </div>
                        </td>

                        {/* Autore / Origine */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {isAi ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-bold">
                              <Bot className="h-3 w-3" /> IA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                              <User className="h-3 w-3" /> {b.inserito_da || "Utente"}
                            </span>
                          )}
                        </td>

                        {/* Descrizione */}
                        <td className="py-3.5 px-4 max-w-sm">
                          <p className="line-clamp-2 text-zinc-300 text-xs leading-relaxed">
                            {b.descrizione}
                          </p>
                          {b.categoria && (
                            <span className="inline-block mt-1 text-[10px] text-zinc-500 font-mono">
                              🏷️ {b.categoria}
                            </span>
                          )}
                        </td>

                        {/* Conferme 👍 */}
                        <td className="py-3.5 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono font-bold text-xs ${
                            conf > 0
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : "text-zinc-500"
                          }`}>
                            <ThumbsUp className="h-3 w-3" />
                            {conf}
                          </span>
                        </td>

                        {/* Contestazioni 👎 */}
                        <td className="py-3.5 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg font-mono font-bold text-xs ${
                            cont > 0
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                              : "text-zinc-500"
                          }`}>
                            <ThumbsDown className="h-3 w-3" />
                            {cont}
                          </span>
                        </td>

                        {/* Attendibilità */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`font-mono text-xs font-bold ${
                              percent >= 70 ? "text-emerald-400" : percent >= 40 ? "text-amber-400" : "text-rose-400"
                            }`}>
                              {tot > 0 ? `${percent}%` : "100% (Verg.)"}
                            </span>
                            <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                              <div
                                className={`h-full ${
                                  percent >= 70 ? "bg-emerald-400" : percent >= 40 ? "bg-amber-400" : "bg-rose-500"
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Azione link film */}
                        <td className="py-3.5 px-3 text-right">
                          {filmId && (
                            <Link
                              href={`/film/${filmId}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-amber-500/40 transition text-[11px]"
                              title="Visualizza blooper nella scheda del film"
                            >
                              <span>Apri</span>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredBloopers.length > blooperPageSize && (
              <AdminPagination
                currentPage={blooperPage}
                totalItems={filteredBloopers.length}
                pageSize={blooperPageSize}
                onPageChange={setBlooperPage}
                onPageSizeChange={setBlooperPageSize}
                pageSizeOptions={[8, 16, 32]}
                itemName="bloopers nel prospetto"
              />
            )}
          </div>
        )}
      </div>

      {/* PROSPETTO ANALITICO GIORNALIERO PER MODELLO */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Bot className="h-4 w-4 text-amber-400" />
              🤖 Prospetto Prestazioni IA Giornaliero per Modello
            </h4>
            <span className="text-xs text-zinc-500 font-mono">Dati da statistiche_ia & log_errori_ia (ultimi 30 giorni)</span>
          </div>

          {availableModels.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Modello:</span>
              <select
                value={aiPerfModelFilter}
                onChange={(e) => setAiPerfModelFilter(e.target.value)}
                className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 transition"
              >
                <option value="all">Tutti i modelli ({availableModels.length})</option>
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {filteredAiPerformance.length === 0 ? (
          <p className="text-xs text-zinc-500 py-6 text-center">Nessun dato di utilizzo IA registrato per i filtri selezionati.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800/80">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/40 text-zinc-400">
                    <th className="py-2.5 px-4 font-medium">Data</th>
                    <th className="py-2.5 px-4 font-medium">Modello IA</th>
                    <th className="py-2.5 px-4 text-right font-medium">Riuscite</th>
                    <th className="py-2.5 px-4 text-right font-medium">Fallite</th>
                    <th className="py-2.5 px-4 text-right font-medium">Totale Richieste</th>
                    <th className="py-2.5 px-4 text-right font-medium">Tasso di Successo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300 font-mono">
                  {paginatedAiPerformance.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-zinc-800/30">
                      <td className="py-2.5 px-4 font-bold text-white">{row.giorno}</td>
                      <td className="py-2.5 px-4 font-semibold text-amber-300 font-sans">{row.modello}</td>
                      <td className="py-2.5 px-4 text-right text-emerald-400 font-bold">{row.riuscite}</td>
                      <td className="py-2.5 px-4 text-right text-rose-400 font-bold">{row.fallite}</td>
                      <td className="py-2.5 px-4 text-right text-zinc-200">{row.totale}</td>
                      <td className="py-2.5 px-4 text-right font-bold">
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

            <AdminPagination
              currentPage={aiPerfPage}
              totalItems={filteredAiPerformance.length}
              pageSize={aiPerfPageSize}
              onPageChange={setAiPerfPage}
              onPageSizeChange={setAiPerfPageSize}
              pageSizeOptions={[10, 20, 50]}
              itemName="record prestazioni"
            />
          </div>
        )}
      </div>
    </div>
  );
}
