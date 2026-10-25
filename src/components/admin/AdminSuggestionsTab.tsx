"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Trash2, Mail, Calendar } from "lucide-react";

export default function AdminSuggestionsTab() {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/suggestions");
      if (res.ok) {
        const json = await res.json();
        setSuggestions(json.suggestions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const handleDelete = async (id: number | string) => {
    if (!confirm("Eliminare questo feedback?")) return;
    try {
      const res = await fetch(`/api/admin/suggestions?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setSuggestions((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-xl">
        <h3 className="text-base font-black text-white flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-amber-400" />
          Suggerimenti & Feedback della Community ({suggestions.length})
        </h3>
        <p className="text-xs text-zinc-400 mt-0.5">
          Messaggi, richieste di nuovi film e consigli inviati dagli utenti.
        </p>
      </div>

      {suggestions.length === 0 ? (
        <div className="py-12 text-center text-zinc-500 text-xs rounded-2xl border border-zinc-800 bg-zinc-900/40">
          Nessun messaggio o suggerimento ricevuto al momento.
        </div>
      ) : (
        <div className="space-y-3">
          {[...suggestions]
            .sort((a, b) => {
              const aPri = (a.messaggio || "").startsWith("[PRIORITARIO");
              const bPri = (b.messaggio || "").startsWith("[PRIORITARIO");
              if (aPri && !bPri) return -1;
              if (!aPri && bPri) return 1;
              return 0;
            })
            .map((s) => {
              const isPriority = (s.messaggio || "").startsWith("[PRIORITARIO");
              return (
                <div
                  key={s.id}
                  className={`flex items-start justify-between gap-4 rounded-2xl p-4 transition ${
                    isPriority
                      ? "border-2 border-amber-500/80 bg-gradient-to-r from-amber-950/20 via-zinc-900/80 to-zinc-900/60 shadow-lg shadow-amber-500/10"
                      : "border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    {isPriority && (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-300">
                        ⚡ Supporto Prioritario (Piano Annuale/Lifetime)
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="flex items-center gap-1.5 font-bold text-amber-400">
                        <Mail className="h-3.5 w-3.5" />
                        {s.email || "Anonimo"}
                      </span>
                      <span className="flex items-center gap-1 text-zinc-500 font-mono text-[11px]">
                        <Calendar className="h-3 w-3" />
                        {s.created_at ? s.created_at.slice(0, 16).replace("T", " ") : "N/D"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-200 leading-relaxed bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                      {s.messaggio}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                    title="Elimina feedback"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
