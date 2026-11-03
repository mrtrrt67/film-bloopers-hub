"use client";

import { useState } from "react";
import { 
  Bot, 
  Clock, 
  Coins, 
  Film, 
  CheckCircle, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw,
  Sparkles,
  Info
} from "lucide-react";

export interface BatchLogEntry {
  id: string;
  started_at: string;
  ended_at?: string;
  duration_sec?: number;
  status: "success" | "completed_with_warnings" | "disabled" | "error" | string;
  status_label?: string;
  trigger?: string;
  target_env?: string;
  mode?: string;
  films_total_catalog?: number;
  films_scanned?: number;
  films_modified_count?: number;
  films_skipped_count?: number;
  bloopers_added?: number;
  trivia_added?: number;
  old_trivia_cleaned?: number;
  errors_count?: number;
  ai_calls_count?: number;
  estimated_tokens?: number;
  estimated_cost_eur?: number;
  model_primary?: string;
  notes?: string;
  modified_films?: Array<{
    id: number;
    titolo: string;
    anno?: number;
    bloopersAdded: number;
    triviaAdded: number;
  }>;
}

interface AdminBatchLogsTableProps {
  logs: BatchLogEntry[];
  loading?: boolean;
  onRefresh?: () => void;
  title?: string;
}

export default function AdminBatchLogsTable({
  logs = [],
  loading = false,
  onRefresh,
  title = "Registro Esecuzioni Batch Notturno (Daily Sync)",
}: AdminBatchLogsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalBloopers = logs.reduce((acc, l) => acc + (l.bloopers_added || 0), 0);
  const totalTrivia = logs.reduce((acc, l) => acc + (l.trivia_added || 0), 0);
  const totalTokens = logs.reduce((acc, l) => acc + (l.estimated_tokens || 0), 0);
  const totalFilmsModified = logs.reduce((acc, l) => acc + (l.films_modified_count || 0), 0);
  const lastRun = logs[0];

  return (
    <div className="space-y-4">
      {/* HEADER CARD CON METRICHE AGGREGATE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              {title}
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                {logs.length} esecuzioni
              </span>
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Storico attività, stato di avanzamento, token IA consumati e pellicole aggiornate.
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition active:scale-95 disabled:opacity-50"
            title="Aggiorna storico esecuzioni"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-amber-400" : ""}`} />
            <span>Aggiorna Log</span>
          </button>
        )}
      </div>

      {/* BOX METRICHE CHIAVE */}
      {logs.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center gap-3">
            <Clock className="h-4 w-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-zinc-500 font-medium">Ultima Attività</div>
              <div className="text-xs font-black text-white font-mono truncate">
                {lastRun?.started_at ? String(lastRun.started_at).slice(0, 16).replace("T", " ") : "N/D"}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center gap-3">
            <Film className="h-4 w-4 text-orange-400 shrink-0" />
            <div>
              <div className="text-[10px] text-zinc-500 font-medium">Film Modificati</div>
              <div className="text-xs font-black text-orange-400">
                {totalFilmsModified} pellicole
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center gap-3">
            <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] text-zinc-500 font-medium">Bloopers / Curiosità</div>
              <div className="text-xs font-black text-emerald-400">
                +{totalBloopers} B / +{totalTrivia} C
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center gap-3">
            <Coins className="h-4 w-4 text-yellow-400 shrink-0" />
            <div>
              <div className="text-[10px] text-zinc-500 font-medium">Token Consumati Totali</div>
              <div className="text-xs font-black text-yellow-400 font-mono">
                ~{totalTokens.toLocaleString("it-IT")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABELLA ESECUZIONI */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden shadow-xl">
        {logs.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
            <Bot className="h-8 w-8 text-zinc-700" />
            <span>Nessun log batch registrato. Le esecuzioni notturne appariranno qui.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/40 text-zinc-400 font-semibold">
                  <th className="py-3 px-4 whitespace-nowrap">Orario Attività</th>
                  <th className="py-3 px-4 whitespace-nowrap">Durata</th>
                  <th className="py-3 px-4 whitespace-nowrap">Esito</th>
                  <th className="py-3 px-4 whitespace-nowrap">Origine / Trigger</th>
                  <th className="py-3 px-4 whitespace-nowrap">Film Modificati</th>
                  <th className="py-3 px-4 whitespace-nowrap">Bloopers / Curiosità</th>
                  <th className="py-3 px-4 whitespace-nowrap">Token & Costo</th>
                  <th className="py-3 px-4 whitespace-nowrap">Modello IA</th>
                  <th className="py-3 px-4 min-w-[200px]">Informazioni & Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {logs.map((entry, index) => {
                  const entryKey = entry.id || String(index);
                  const isExpanded = expandedId === entryKey;
                  const isSuccess = entry.status === "success";
                  const isWarn = entry.status === "completed_with_warnings";
                  const isDisabled = entry.status === "disabled";
                  const modifiedList = entry.modified_films || [];

                  const durSec = entry.duration_sec || 0;
                  const durationFormatted = durSec >= 60
                    ? `${Math.floor(durSec / 60)}m ${durSec % 60}s`
                    : durSec > 0
                    ? `${durSec}s`
                    : "< 1s";

                  return (
                    <tr key={entryKey} className="hover:bg-zinc-800/30 transition-colors align-top">
                      {/* Orario Attività */}
                      <td className="py-3 px-4 font-mono text-zinc-400 text-[11px] whitespace-nowrap">
                        <div className="text-white font-medium">
                          {entry.started_at ? String(entry.started_at).slice(0, 10) : "N/D"}
                        </div>
                        <div className="text-zinc-500 text-[10px]">
                          {entry.started_at ? String(entry.started_at).slice(11, 19) : ""}
                        </div>
                      </td>

                      {/* Durata */}
                      <td className="py-3 px-4 font-mono text-zinc-300 text-[11px] whitespace-nowrap">
                        {durationFormatted}
                      </td>

                      {/* Esito */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isSuccess
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : isWarn
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : isDisabled
                              ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}
                        >
                          {isSuccess && <CheckCircle className="h-3 w-3" />}
                          {isWarn && <AlertTriangle className="h-3 w-3" />}
                          {isDisabled && <Info className="h-3 w-3" />}
                          {!isSuccess && !isWarn && !isDisabled && <AlertTriangle className="h-3 w-3" />}
                          {entry.status_label || (isSuccess ? "Riuscito" : isWarn ? "Con Avvisi" : isDisabled ? "Disattivato" : "Fallito")}
                        </span>
                      </td>

                      {/* Trigger */}
                      <td className="py-3 px-4 text-zinc-400 text-[11px] whitespace-nowrap">
                        <span className="font-medium text-zinc-200 block">
                          {entry.trigger || "Cron Notturno"}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {entry.target_env === "production" ? "Produzione" : (entry.target_env || "Default")}
                        </span>
                      </td>

                      {/* Film Modificati */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-white text-[11px]">
                            {entry.films_modified_count ?? 0}
                            <span className="text-zinc-500 font-normal ml-1">
                              / {entry.films_scanned ?? entry.films_total_catalog ?? 0} scansionati
                            </span>
                          </span>

                          {modifiedList.length > 0 && (
                            <>
                              <button
                                type="button"
                                onClick={() => setExpandedId(isExpanded ? null : entryKey)}
                                className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5 font-medium transition"
                              >
                                {isExpanded ? (
                                  <>
                                    <span>Nascondi dettagli</span>
                                    <ChevronUp className="h-3 w-3" />
                                  </>
                                ) : (
                                  <>
                                    <span>Vedi {modifiedList.length} pellicole</span>
                                    <ChevronDown className="h-3 w-3" />
                                  </>
                                )}
                              </button>

                              {isExpanded && (
                                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
                                  {modifiedList.map((f, fi) => (
                                    <div
                                      key={fi}
                                      className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-zinc-950/70 border border-zinc-800 text-[10px]"
                                    >
                                      <div className="flex items-center gap-1.5 truncate">
                                        <Film className="h-3 w-3 text-amber-400 shrink-0" />
                                        <span className="text-zinc-200 font-medium truncate" title={f.titolo}>
                                          {f.titolo} {f.anno ? `(${f.anno})` : ""}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0 font-mono">
                                        {f.bloopersAdded > 0 && (
                                          <span className="px-1.5 py-0.2 rounded bg-orange-500/15 text-orange-400 font-bold">
                                            +{f.bloopersAdded} B
                                          </span>
                                        )}
                                        {f.triviaAdded > 0 && (
                                          <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-bold">
                                            +{f.triviaAdded} C
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </td>

                      {/* Bloopers / Curiosità */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-orange-400 font-bold font-mono text-[11px]">
                            +{entry.bloopers_added ?? 0} bloopers
                          </span>
                          <span className="text-amber-300 font-bold font-mono text-[11px]">
                            +{entry.trivia_added ?? 0} curiosità
                          </span>
                          {(entry.old_trivia_cleaned ?? 0) > 0 && (
                            <span className="text-zinc-500 font-mono text-[10px]">
                              🧹 -{entry.old_trivia_cleaned} ripuliti
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Token Consumati */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-yellow-400 font-bold text-[11px]">
                            ~{(entry.estimated_tokens || 0).toLocaleString("it-IT")} tok
                          </span>
                          {entry.estimated_cost_eur != null && (
                            <span className="text-zinc-500 font-mono text-[10px]">
                              ≈ €{Number(entry.estimated_cost_eur).toFixed(4)}
                            </span>
                          )}
                          <span className="text-zinc-600 font-mono text-[10px]">
                            {entry.ai_calls_count ?? 0} chiamate
                          </span>
                        </div>
                      </td>

                      {/* Modello IA */}
                      <td className="py-3 px-4 font-mono text-zinc-400 text-[11px] whitespace-nowrap">
                        {entry.model_primary || "gemini-flash-lite"}
                      </td>

                      {/* Informazioni Varie / Note */}
                      <td className="py-3 px-4">
                        <p className="text-zinc-300 text-[11px] leading-relaxed line-clamp-3" title={entry.notes}>
                          {entry.notes || "Elaborazione batch completata regolarmente."}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

