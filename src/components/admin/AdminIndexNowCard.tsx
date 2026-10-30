"use client";

import { useState } from "react";
import { Globe, Send, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw, Key } from "lucide-react";

export default function AdminIndexNowCard() {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [customUrl, setCustomUrl] = useState("");

  const key = "b3106037cdfc4d729c7eac554ef4fb55";
  const keyUrl = `https://filmbloopers.online/${key}.txt`;

  const handleSubmitAll = async () => {
    try {
      setSubmitting(true);
      setResult(null);
      const res = await fetch("/api/admin/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      setResult(data);
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
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message || "Errore di connessione." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl space-y-5">
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
              Protocollo aperto per notificare istantaneamente a Microsoft Bing, Yandex, Seznam e Naver l&apos;aggiornamento dei contenuti.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Info & Azioni */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Invio in blocco Sitemap */}
        <div className="rounded-xl bg-zinc-950/50 border border-zinc-800/80 p-4 space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-300">Invio Completo del Catalogo</span>
            <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
              Estrae tutte le pagine del sito (homepage, catalogo, pricing, schede film) e le sottopone all&apos;API IndexNow in un unico lotto.
            </p>
          </div>

          <button
            onClick={handleSubmitAll}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 px-4 py-2.5 text-xs font-bold shadow-md shadow-sky-500/10 active:scale-95 transition disabled:opacity-50"
          >
            <Send className={`h-3.5 w-3.5 ${submitting ? "animate-pulse" : ""}`} />
            <span>{submitting ? "Invio in corso..." : "Invia Tutte le Pagine a Bing / IndexNow"}</span>
          </button>
        </div>

        {/* Invio Singolo URL */}
        <form onSubmit={handleSubmitCustom} className="rounded-xl bg-zinc-950/50 border border-zinc-800/80 p-4 space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-300">Invio URL Singolo Specifico</span>
            <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
              Hai appena modificato o aggiunto una pagina specifica? Inserisci l&apos;indirizzo per notificarlo all&apos;istante.
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
                URL elaborate: <strong className="text-white font-mono">{result.urlsCount}</strong> &bull; Codice di risposta HTTP: <strong className="text-white font-mono">{result.status}</strong>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

