"use client";

import { useState, useEffect } from "react";
import { 
  Globe, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  RefreshCw, 
  Key, 
  Layers, 
  Sparkles,
  Clock
} from "lucide-react";

export default function AdminIndexNowCard() {
  const [submitting, setSubmitting] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState<{
    totalCount: number;
    submittedCount: number;
    missingCount: number;
    lastSubmittedAt: string | null;
  }>({
    totalCount: 0,
    submittedCount: 0,
    missingCount: 0,
    lastSubmittedAt: null,
  });
  const [result, setResult] = useState<any>(null);
  const [customUrl, setCustomUrl] = useState("");

  const key = "b3106037cdfc4d729c7eac554ef4fb55";
  const keyUrl = `https://filmbloopers.online/${key}.txt`;

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await fetch("/api/admin/indexnow");
      if (res.ok) {
        const data = await res.json();
        setStats({
          totalCount: data.totalCount || 0,
          submittedCount: data.submittedCount || 0,
          missingCount: data.missingCount || 0,
          lastSubmittedAt: data.lastSubmittedAt || null,
        });
      }
    } catch (e) {
      console.warn("Errore fetch stats IndexNow:", e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSubmit = async (mode: "missing" | "all") => {
    try {
      setSubmitting(true);
      setResult(null);
      const res = await fetch("/api/admin/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      setResult(data);
      if (data.totalCount !== undefined) {
        setStats({
          totalCount: data.totalCount,
          submittedCount: data.submittedCount,
          missingCount: data.missingCount,
          lastSubmittedAt: data.lastSubmittedAt,
        });
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message || "Errore di connessione." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;

    try {
      setSubmitting(true);
      setResult(null);
      const res = await fetch("/api/admin/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [customUrl.trim()] }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) {
        setCustomUrl("");
        fetchStats();
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message || "Errore di connessione." });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "Nessun invio registrato";
    try {
      return new Date(isoStr).toLocaleString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl space-y-5">
      {/* Intestazione */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              Indicizzazione Istantanea IndexNow (Bing & Motori Partner)
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Invia i contenuti direttamente ai motori di ricerca per essere scansionati e indicizzati all&apos;istante.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            disabled={loadingStats || submitting}
            title="Aggiorna conteggi"
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-white transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingStats ? "animate-spin text-sky-400" : ""}`} />
          </button>
          <a
            href={keyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 text-[11px] font-mono text-zinc-300 transition"
          >
            <Key className="h-3 w-3 text-amber-400" />
            <span>File Chiave: {key.slice(0, 8)}...txt</span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        </div>
      </div>

      {/* Riquadri Metriche: Totali, Già Inviate, Mancanti */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4">
          <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-zinc-500" />
            Pagine Totali nel Sito
          </span>
          <p className="text-2xl font-black text-white mt-1">
            {loadingStats ? "..." : stats.totalCount}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Pagine statiche + tutte le schede film</p>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4">
          <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            Già Inviate a IndexNow
          </span>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            {loadingStats ? "..." : stats.submittedCount}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {formatDate(stats.lastSubmittedAt)}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4">
          <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-sky-400" />
            Nuove da Inviare (Mancanti)
          </span>
          <p className="text-2xl font-black text-sky-400 mt-1">
            {loadingStats ? "..." : stats.missingCount}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {stats.missingCount > 0 ? "Pagine non ancora notificate" : "Tutto il catalogo è allineato"}
          </p>
        </div>
      </div>

      {/* Azioni Principali */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Invio Selettivo / Completo */}
        <div className="rounded-xl bg-zinc-950/50 border border-zinc-800/80 p-4 space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-300">Gestione Invii Massivi</span>
            <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
              Puoi inviare solo le pagine mancanti (non ancora notificate a Bing) oppure forzare la ri-scansione dell&apos;intero catalogo.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              onClick={() => handleSubmit("missing")}
              disabled={submitting || loadingStats || stats.missingCount === 0}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 px-4 py-2.5 text-xs font-bold shadow-md shadow-sky-500/10 active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none"
            >
              <Send className={`h-3.5 w-3.5 ${submitting ? "animate-pulse" : ""}`} />
              <span>
                {submitting
                  ? "Invio in corso..."
                  : stats.missingCount === 0
                  ? "Nessuna mancante (0)"
                  : `Invia solo mancanti (${stats.missingCount})`}
              </span>
            </button>

            <button
              onClick={() => handleSubmit("all")}
              disabled={submitting || loadingStats}
              title="Forza l'invio di tutte le pagine, anche quelle già inviate in precedenza"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-3.5 py-2.5 text-xs font-bold border border-zinc-700 active:scale-95 transition disabled:opacity-50"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reinvia Tutte ({stats.totalCount})</span>
            </button>
          </div>
        </div>

        {/* Invio Singolo URL */}
        <form onSubmit={handleSubmitCustom} className="rounded-xl bg-zinc-950/50 border border-zinc-800/80 p-4 space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-300">Invio URL Singolo Specifico</span>
            <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
              Hai appena modificato una pagina specifica? Inserisci il link per richiederne la scansione prioritaria immediata.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://filmbloopers.online/film/..."
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              disabled={submitting || !customUrl.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 text-xs font-bold border border-zinc-700 active:scale-95 transition disabled:opacity-50"
            >
              <Send className="h-3 w-3" />
              <span>Invia</span>
            </button>
          </div>
        </form>
      </div>

      {/* Messaggio Risultato */}
      {result && (
        <div
          className={`rounded-xl p-4 border flex items-start gap-3 transition ${
            result.success
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="text-xs space-y-1">
            <p className="font-bold">{result.message}</p>
            {result.urlsCount !== undefined && (
              <p className="text-zinc-400 text-[11px]">
                URL inviati in questa chiamata: <strong className="text-white font-mono">{result.urlsCount}</strong> &bull; Codice HTTP: <strong className="text-white font-mono">{result.status}</strong>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
