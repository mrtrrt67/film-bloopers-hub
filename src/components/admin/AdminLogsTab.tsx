"use client";

import { useState, useEffect } from "react";
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  LogIn, 
  RefreshCw, 
  Search,
  ChevronDown,
  ChevronUp,
  Users,
  Ghost,
  UserCheck
} from "lucide-react";
import AdminPagination from "./AdminPagination";

export default function AdminLogsTab() {
  const [subTab, setSubTab] = useState<"errors" | "calls" | "access">("errors");
  const [accessFilter, setAccessFilter] = useState<"all" | "registered" | "guest">("all");
  const [data, setData] = useState<any>({ aiErrors: [], recentAiCalls: [], recentAccess: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedErrorId, setExpandedErrorId] = useState<number | string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const fetchLogs = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin/logs?limit=500");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Errore fetch logs:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Reset pagina al cambio tab o filtro
  useEffect(() => {
    setPage(1);
  }, [subTab, filterText, accessFilter]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  const aiErrors = (data.aiErrors || []).filter((e: any) => {
    if (!filterText.trim()) return true;
    const term = filterText.toLowerCase();
    return (
      (e.film || "").toLowerCase().includes(term) ||
      (e.modello || "").toLowerCase().includes(term) ||
      (e.errore_dettaglio || "").toLowerCase().includes(term) ||
      (e.utente || "").toLowerCase().includes(term)
    );
  });

  const recentCalls = (data.recentAiCalls || []).filter((c: any) => {
    if (!filterText.trim()) return true;
    const term = filterText.toLowerCase();
    return (c.modello || "").toLowerCase().includes(term);
  });

  const rawAccess = data.recentAccess || [];
  const registeredCount = rawAccess.filter((a: any) => !a.isGuest && a.tipo !== "ospite").length;
  const guestCount = rawAccess.filter((a: any) => a.isGuest || a.tipo === "ospite").length;

  const accessLogs = rawAccess.filter((a: any) => {
    const isGuest = a.isGuest || a.tipo === "ospite";
    if (accessFilter === "registered" && isGuest) return false;
    if (accessFilter === "guest" && !isGuest) return false;

    if (!filterText.trim()) return true;
    const term = filterText.toLowerCase();
    return (
      (a.tipo || "").toLowerCase().includes(term) ||
      (a.username || "").toLowerCase().includes(term) ||
      (a.created_at || "").toLowerCase().includes(term)
    );
  });

  const paginatedErrors = aiErrors.slice((page - 1) * pageSize, page * pageSize);
  const paginatedCalls = recentCalls.slice((page - 1) * pageSize, page * pageSize);
  const paginatedAccess = accessLogs.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      {/* HEADER & FILTRI */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab("errors")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              subTab === "errors"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Errori IA ({data.aiErrors?.length || 0})
          </button>
          <button
            onClick={() => setSubTab("calls")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              subTab === "calls"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
            }`}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Chiamate Riuscite ({data.recentAiCalls?.length || 0})
          </button>
          <button
            onClick={() => setSubTab("access")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              subTab === "access"
                ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            Accessi ({rawAccess.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder={subTab === "access" ? "Cerca per username, ospite..." : "Filtra per film, modello..."}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full rounded-xl bg-zinc-900 border border-zinc-800 pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            onClick={fetchLogs}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 transition shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
            <span className="hidden sm:inline">Aggiorna</span>
          </button>
        </div>
      </div>

      {/* 1. ERRORI IA */}
      {subTab === "errors" && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden shadow-xl">
          {aiErrors.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              Nessun errore registrato di recente. Ottimo lavoro!
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950/40 text-zinc-400 font-semibold">
                      <th className="py-3 px-4">Data / Ora</th>
                      <th className="py-3 px-4">Operazione</th>
                      <th className="py-3 px-4">Film / Contesto</th>
                      <th className="py-3 px-4">Modello</th>
                      <th className="py-3 px-4">Utente</th>
                      <th className="py-3 px-4">Dettagli Errore</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {paginatedErrors.map((e: any) => {
                      const isExpanded = expandedErrorId === e.id;
                      const hasLongError = (e.errore_dettaglio || "").length > 80;

                      return (
                        <tr key={e.id} className="hover:bg-zinc-800/30">
                          <td className="py-2.5 px-4 font-mono text-zinc-400 text-[11px] whitespace-nowrap">
                            {e.created_at ? e.created_at.slice(0, 19).replace("T", " ") : "N/D"}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-rose-400 uppercase tracking-wider text-[10px]">
                            {e.operazione || "N/D"}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-white max-w-[150px] truncate">
                            {e.film || "Generale"}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-zinc-400 text-[11px]">
                            {e.modello || "default"}
                          </td>
                          <td className="py-2.5 px-4 text-zinc-400 text-[11px]">
                            {e.utente || "anonimo"}
                          </td>
                          <td className="py-2.5 px-4 max-w-xs">
                            <div className="text-zinc-300">
                              {isExpanded ? (
                                <pre className="whitespace-pre-wrap font-mono text-[10px] bg-zinc-950 p-2 rounded border border-zinc-800 text-rose-300">
                                  {e.errore_dettaglio}
                                </pre>
                              ) : (
                                <span className="line-clamp-2 text-zinc-400 text-[11px]">
                                  {e.errore_dettaglio || "Nessun dettaglio"}
                                </span>
                              )}
                              {hasLongError && (
                                <button
                                  onClick={() => setExpandedErrorId(isExpanded ? null : e.id)}
                                  className="mt-1 text-[10px] text-amber-400 hover:underline flex items-center gap-0.5"
                                >
                                  {isExpanded ? (
                                    <>
                                      <span>Comprimi</span>
                                      <ChevronUp className="h-3 w-3" />
                                    </>
                                  ) : (
                                    <>
                                      <span>Mostra tutto</span>
                                      <ChevronDown className="h-3 w-3" />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <AdminPagination
                currentPage={page}
                totalItems={aiErrors.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[10, 15, 25, 50]}
                itemName="errori"
              />
            </>
          )}
        </div>
      )}

      {/* 2. CHIAMATE RIUSCITE */}
      {subTab === "calls" && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden shadow-xl">
          {recentCalls.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              Nessuna chiamata recente registrata.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950/40 text-zinc-400 font-semibold">
                      <th className="py-3 px-4">Data / Ora</th>
                      <th className="py-3 px-4">Modello</th>
                      <th className="py-3 px-4">Stato</th>
                      <th className="py-3 px-4">Tempo Risposta</th>
                      <th className="py-3 px-4">Token Stimati</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {paginatedCalls.map((c: any) => (
                      <tr key={c.id} className="hover:bg-zinc-800/30">
                        <td className="py-2.5 px-4 font-mono text-zinc-400 text-[11px]">
                          {c.data_chiamata ? c.data_chiamata.slice(0, 19).replace("T", " ") : "N/D"}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-white">
                          {c.modello || "sconosciuto"}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.stato === "fallita"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {c.stato === "fallita" ? (
                              <>
                                <AlertTriangle className="h-3 w-3" />
                                Fallita
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3" />
                                Riuscita
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-zinc-400 text-[11px]">
                          {c.tempo_risposta_ms ? `${c.tempo_risposta_ms} ms` : "N/D"}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-zinc-400 text-[11px]">
                          {c.token_utilizzati || "N/D"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <AdminPagination
                currentPage={page}
                totalItems={recentCalls.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[10, 15, 25, 50]}
                itemName="chiamate"
              />
            </>
          )}
        </div>
      )}

      {/* 3. LOG ACCESSI (CON SEZIONI & FILTRI PER REGISTRATI, OSPITI E TUTTI) */}
      {subTab === "access" && (
        <div className="space-y-4">
          {/* Barra Filtri: Tutti / Registrati / Ospiti */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAccessFilter("all")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  accessFilter === "all"
                    ? "bg-zinc-800 text-white border border-zinc-700 shadow-sm"
                    : "text-zinc-400 hover:text-white bg-zinc-950/40 border border-transparent"
                }`}
              >
                <Users className="h-3.5 w-3.5 text-zinc-400" />
                <span>Tutti gli Accessi</span>
                <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-300 border border-zinc-700/60 font-mono">
                  {rawAccess.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAccessFilter("registered")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  accessFilter === "registered"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                    : "text-zinc-400 hover:text-amber-300 bg-zinc-950/40 border border-transparent"
                }`}
              >
                <UserCheck className="h-3.5 w-3.5 text-amber-400" />
                <span>👤 Utenti Registrati</span>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300 border border-amber-500/20 font-mono">
                  {registeredCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAccessFilter("guest")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  accessFilter === "guest"
                    ? "bg-zinc-800 text-zinc-200 border border-zinc-600 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 bg-zinc-950/40 border border-transparent"
                }`}
              >
                <Ghost className="h-3.5 w-3.5 text-zinc-400" />
                <span>👻 Visite Ospiti</span>
                <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400 border border-zinc-800 font-mono">
                  {guestCount}
                </span>
              </button>
            </div>

            <div className="text-[11px] text-zinc-400 font-medium">
              Risultati filtrati: <strong className="text-white font-mono">{accessLogs.length}</strong>
            </div>
          </div>

          {/* Tabella accessi */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden shadow-xl">
            {accessLogs.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                Nessun accesso registrato per il filtro selezionato.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-950/40 text-zinc-400 font-semibold">
                        <th className="py-3 px-4">Data / Ora</th>
                        <th className="py-3 px-4">Visitatore / Username</th>
                        <th className="py-3 px-4 text-right">Tipologia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                      {paginatedAccess.map((a: any) => {
                        const isGuest = a.isGuest || a.tipo === "ospite";
                        return (
                          <tr key={a.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="py-2.5 px-4 font-mono text-zinc-400 text-[11px] whitespace-nowrap">
                              {a.created_at ? a.created_at.slice(0, 19).replace("T", " ") : "N/D"}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-white">
                              {isGuest ? (
                                <span className="inline-flex items-center gap-2 text-zinc-400 font-medium">
                                  <Ghost className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                                  <span>Visitatore Ospite (Anonimo)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2 text-amber-400 font-bold">
                                  <UserCheck className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                  <span>{a.username || "Utente Registrato"}</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {isGuest ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                                  Ospite
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  Registrato
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <AdminPagination
                  currentPage={page}
                  totalItems={accessLogs.length}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[10, 15, 25, 50]}
                  itemName="accessi"
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
