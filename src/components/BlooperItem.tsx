"use client";

import { useState } from "react";
import { Clock, Tag, ThumbsUp, ThumbsDown, CheckCircle, AlertTriangle, User } from "lucide-react";
import { Blooper } from "@/lib/types";
import { calculateAttendibilita } from "@/lib/utils";

interface BlooperItemProps {
  blooper: Blooper;
  onVote?: (blooperId: string, tipo: "conferma" | "contestazione") => Promise<void>;
  userLoggedIn?: boolean;
}

export default function BlooperItem({ blooper, onVote, userLoggedIn = false }: BlooperItemProps) {
  const [conferme, setConferme] = useState(blooper.conferme || 0);
  const [contestazioni, setContestazioni] = useState(blooper.contestazioni || 0);
  const [votoUtente, setVotoUtente] = useState<"conferma" | "contestazione" | null>(
    blooper.voto_utente || null
  );
  const [loading, setLoading] = useState(false);

  const attendibilita = calculateAttendibilita(conferme, contestazioni);

  const handleVote = async (tipo: "conferma" | "contestazione") => {
    if (!userLoggedIn) {
      alert("Accedi per votare e confermare l'attendibilità dei bloopers!");
      return;
    }

    if (loading) return;
    setLoading(true);

    const prevVoto = votoUtente;
    const prevConf = conferme;
    const prevCont = contestazioni;

    // Aggiornamento ottimistico
    if (votoUtente === tipo) {
      // Rimuove il voto
      setVotoUtente(null);
      if (tipo === "conferma") setConferme((c) => Math.max(0, c - 1));
      else setContestazioni((c) => Math.max(0, c - 1));
    } else {
      // Assegna nuovo voto
      if (prevVoto === "conferma") setConferme((c) => Math.max(0, c - 1));
      if (prevVoto === "contestazione") setContestazioni((c) => Math.max(0, c - 1));

      setVotoUtente(tipo);
      if (tipo === "conferma") setConferme((c) => c + 1);
      else setContestazioni((c) => c + 1);
    }

    try {
      if (onVote) {
        await onVote(blooper.id, tipo);
      } else {
        const res = await fetch("/api/bloopers/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ errore_id: blooper.id, tipo }),
        });
        if (!res.ok) throw new Error("Errore durante il voto");
      }
    } catch (err) {
      // Ripristino in caso di errore
      setVotoUtente(prevVoto);
      setConferme(prevConf);
      setContestazioni(prevCont);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Troupe o microfoni visibili":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      case "Anacronismi":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "Errori storici o fattuali":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-5 transition-all hover:border-zinc-700/80 shadow-md">
      {/* Header Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Minuto */}
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800/90 border border-zinc-700 px-2.5 py-1 text-xs font-mono font-bold text-zinc-200">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            {blooper.minuto || "00:00"}
          </span>

          {/* Categoria */}
          <span
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold ${getCategoryColor(
              blooper.categoria
            )}`}
          >
            <Tag className="h-3 w-3" />
            {blooper.categoria}
          </span>
        </div>

        {/* Badge Attendibilità */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${attendibilita.color}`}
        >
          {attendibilita.badge === "verificato" ? (
            <CheckCircle className="h-3.5 w-3.5" />
          ) : attendibilita.badge === "contestato" ? (
            <AlertTriangle className="h-3.5 w-3.5" />
          ) : null}
          {attendibilita.text} ({attendibilita.percent}%)
        </span>
      </div>

      {/* Descrizione */}
      <p className="text-sm text-zinc-200 leading-relaxed font-normal mb-4">
        {blooper.descrizione}
      </p>

      {/* Footer & Voting */}
      <div className="mt-auto pt-3 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="flex items-center gap-1.5 text-zinc-500">
          <User className="h-3.5 w-3.5" />
          <span>
            Autore: <strong className="text-zinc-400">{blooper.inserito_da || "IA (Sistema)"}</strong>
          </span>
        </div>

        {/* Pulsanti Voto */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleVote("conferma")}
            disabled={loading}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-semibold text-xs transition-colors ${
              votoUtente === "conferma"
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20"
                : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-emerald-400"
            }`}
            title="Conferma errore (👍)"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            <span>{conferme}</span>
          </button>

          <button
            onClick={() => handleVote("contestazione")}
            disabled={loading}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-semibold text-xs transition-colors ${
              votoUtente === "contestazione"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20"
                : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-amber-400"
            }`}
            title="Contesta errore (👎)"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            <span>{contestazioni}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
