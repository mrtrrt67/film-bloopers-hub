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
  ChevronUp
} from "lucide-react";
import AdminPagination from "./AdminPagination";

export default function AdminLogsTab() {
  const [subTab, setSubTab] = useState<"errors" | "calls" | "access">("errors");
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
      const res = await fetch("/api/admin/logs?limit=300");
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
  }, [subTab, filterText]);

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

  const accessLogs = (data.recentAccess || []).filter((a: any) => {
    if (!filterText.trim()) return true;
    const term = filterText.toLowerCase();
    return (a.tipo || "").toLowerCase().includes(term);
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
            Accessi ({data.recentAccess?.length || 0})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Filtra per film, modello..."
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
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            Aggiorna
          </button>
        </div>
      </div>

      {/* 1. LOG ERRORI IA */}
      {subTab === "errors" && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden shadow-xl">
          {aiErrors.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              Nessun errore IA registrato di recente 🎉
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950/40 text-zinc-400 font-semibold">
                      <th className="py-3 px-4">Data / Ora</th>
                      <th className="py-3 px-4">Utente</th>
                      <th className="py-3 px-4">Film</th>
                      <th className="py-3 px-4">Modello IA</th>
                      <th className="py-3 px-4">Errore / Dettaglio Tecnico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {paginatedErrors.map((err: any) => {
                      const isExpanded = expandedErrorId === err.id;
                      const dateStr = err.created_at ? err.created_at.slice(0, 16).replace("T", " ") : "N/D";
                      return (
                        <tr key={err.id} className="hover:bg-zinc-800/30">
                          <td className="py-3 px-4 font-mono text-zinc-400 whitespace-nowrap text-[11px]">
                            {dateStr}
                          </td>
                          <td className="py-3 px-4 text-zinc-400 text-[11px]">
                            {err.utente || "Ospite"}
                          </td>
                          <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                            {err.film || "N/D"}
                          </td>
                          <td className="py-3 px-4 font-mono text-amber-400 whitespace-nowrap">
                            {err.modello || "default"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-mono text-rose-300 text-[11px] break-all">
                                {isExpanded
                                  ? err.errore_dettaglio
                                  : (err.errore_dettaglio || "").slice(0, 90) +
                                    ((err.errore_dettaglio || "").length > 90 ? "..." : "")}
                              </span>
                              {(err.errore_dettaglio || "").length > 90 && (
                                <button
                                  onClick={() => setExpandedErrorId(isExpanded ? null : err.id)}
                                  className="text-zinc-500 hover:text-white shrink-0 p-1"
                                >
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
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
                itemName="errori IA"
              />
            </>
          )}
        </div>
      )}

      {/* 2. CHIAMATE IA RIUSCITE */}
      {subTab === "calls" && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden shadow-xl">
          {recentCalls.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              Nessuna chiamata IA recente registrata.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950/40 text-zinc-400 font-semibold">
                      <th className="py-3 px-4">Data / Ora</th>
                      <th className="py-3 px-4">Modello Utilizzato</th>
                      <th className="py-3 px-4 text-right">Tempo di Esecuzione</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300 font-mono">
                    {paginatedCalls.map((c: any) => (
                      <tr key={c.id} className="hover:bg-zinc-800/30">
                        <td className="py-2.5 px-4 text-zinc-400 text-[11px]">
                          {c.data_chiamata ? c.data_chiamata.slice(0, 19).replace("T", " ") : "N/D"}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-amber-400 font-sans">
                          {c.modello}
                        </td>
                        <td className="py-2.5 px-4 text-right text-emerald-400">
                          {c.tempo_esecuzione ? `${c.tempo_esecuzione}s` : "N/D"}
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
                itemName="chiamate IA"
              />
            </>
          )}
        </div>
      )}

      {/* 3. LOG ACCESSI */}
      {subTab === "access" && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden shadow-xl">
          {accessLogs.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              Nessun accesso registrato.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950/40 text-zinc-400 font-semibold">
                      <th className="py-3 px-4">Data / Ora</th>
                      <th className="py-3 px-4">Tipo Visita</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {paginatedAccess.map((a: any) => (
                      <tr key={a.id} className="hover:bg-zinc-800/30">
                        <td className="py-2.5 px-4 font-mono text-zinc-400 text-[11px]">
                          {a.created_at ? a.created_at.slice(0, 19).replace("T", " ") : "N/D"}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-white capitalize">
                          {a.tipo === "ospite" ? "👻 Visita Ospite" : "👤 Utente Registrato"}
                        </td>
                      </tr>
                    ))}
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
      )}
    </div>
  );
}
