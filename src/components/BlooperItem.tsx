"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, Tag, ThumbsUp, ThumbsDown, CheckCircle, AlertTriangle, User, Sparkles, ArrowRight } from "lucide-react";
import { Blooper } from "@/lib/types";
import { calculateAttendibilita, formatPublicAuthor } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import AuthModal from "./AuthModal";

interface BlooperItemProps {
  blooper: Blooper;
  onVote?: (blooperId: string | number, tipo: "conferma" | "contestazione", motivo?: string) => Promise<void>;
  userLoggedIn?: boolean;
}

export default function BlooperItem({ blooper, onVote, userLoggedIn }: BlooperItemProps) {
  const [conferme, setConferme] = useState(blooper.conferme || 0);
  const [contestazioni, setContestazioni] = useState(blooper.contestazioni || 0);
  const [votoUtente, setVotoUtente] = useState<"conferma" | "contestazione" | null>(
    blooper.voto_utente || null
  );
  const [loading, setLoading] = useState(false);
  const [showContestForm, setShowContestForm] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [contestReason, setContestReason] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(userLoggedIn));

  useEffect(() => {
    if (userLoggedIn !== undefined) {
      setIsLoggedIn(userLoggedIn);
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: { data: any }) => {
      if (data?.user) setIsLoggedIn(true);
    });
  }, [userLoggedIn]);

  const attendibilita = calculateAttendibilita(conferme, contestazioni);

  const handleVote = async (tipo: "conferma" | "contestazione", motivo?: string): Promise<boolean> => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return false;
    }

    if (loading) return false;
    setLoading(true);

    const prevVoto = votoUtente;
    const prevConf = conferme;
    const prevCont = contestazioni;

    // Aggiornamento ottimistico
    if (votoUtente === tipo && !motivo) {
      // Rimuove il voto
      setVotoUtente(null);
      if (tipo === "conferma") setConferme((c) => Math.max(0, c - 1));
      else setContestazioni((c) => Math.max(0, c - 1));
    } else {
      // Assegna nuovo voto o aggiorna
      if (prevVoto === "conferma") setConferme((c) => Math.max(0, c - 1));
      if (prevVoto === "contestazione") setContestazioni((c) => Math.max(0, c - 1));

      setVotoUtente(tipo);
      if (tipo === "conferma") setConferme((c) => c + 1);
      else setContestazioni((c) => c + 1);
    }

    try {
      if (onVote) {
        await onVote(blooper.id, tipo, motivo);
      } else {
        const res = await fetch("/api/bloopers/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ errore_id: blooper.id, tipo, motivo }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (res.status === 403 && errData.requires_premium) {
            setShowPremiumModal(true);
            setVotoUtente(prevVoto);
            setConferme(prevConf);
            setContestazioni(prevCont);
            return false;
          }
          throw new Error(errData.error || "Errore durante il voto");
        }
        const json = await res.json();
        if (json.conferme !== undefined) setConferme(json.conferme);
        if (json.contestazioni !== undefined) setContestazioni(json.contestazioni);
        if (json.tipo !== undefined) setVotoUtente(json.tipo);
      }
      return true;
    } catch (err: any) {
      // Ripristino in caso di errore
      setVotoUtente(prevVoto);
      setConferme(prevConf);
      setContestazioni(prevCont);
      if (!showPremiumModal) {
        alert(err?.message || "Impossibile registrare il voto.");
      }
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleDislikeButtonClick = () => {
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }

    if (votoUtente === "contestazione") {
      // Se già contestato, cliccando di nuovo rimuove la contestazione
      handleVote("contestazione");
      setShowContestForm(false);
    } else {
      // Apre il box per inserire la motivazione
      setShowContestForm((prev) => !prev);
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

      {/* Box Inserimento Motivazione Contestazione (Dislike) */}
      {showContestForm && (
        <div className="mb-4 rounded-xl border border-rose-500/40 bg-zinc-950 p-4 space-y-3 animate-in fade-in shadow-lg">
          <div className="flex items-center justify-between text-xs font-bold text-rose-300">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              Motiva la contestazione dell&apos;errore
            </span>
            <button
              type="button"
              onClick={() => setShowContestForm(false)}
              className="text-zinc-400 hover:text-white text-xs px-2 py-0.5 rounded hover:bg-zinc-800 transition"
            >
              ✕ Chiudi
            </button>
          </div>

          {/* Banner Punti & Ricompensa */}
          <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-950 border border-amber-500/30 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Ricompensa per segnalazione valida:</span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-normal">
              Se la tua contestazione corregge il blooper oppure <strong className="text-white">smaschera un errore inesistente</strong> portando alla sua rimozione, lo staff ti accredita <strong className="text-amber-300">+10 Punti</strong> (<strong className="text-amber-300">+20 Punti 2x</strong> con Piano Annuale/Lifetime) per scalare la classifica e sbloccare mesi Premium gratuiti!
            </p>
          </div>

          <p className="text-[11px] text-zinc-400 leading-normal">
            Spiega brevemente perché ritieni questo errore non attendibile (es. minuto errato, effetto speciale intenzionale, anacronismo inesistente, ecc.):
          </p>
          <textarea
            value={contestReason}
            onChange={(e) => setContestReason(e.target.value)}
            placeholder="Scrivi qui la motivazione del dislike / contestazione..."
            rows={2}
            className="w-full rounded-lg bg-zinc-900 border border-zinc-700 p-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-rose-400"
          />
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowContestForm(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800 transition"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={async () => {
                const reason = contestReason.trim();
                if (!reason) {
                  alert("Inserisci una breve motivazione per la tua contestazione.");
                  return;
                }
                const ok = await handleVote("contestazione", reason);
                if (ok) {
                  setShowContestForm(false);
                  setContestReason("");
                }
              }}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition shadow disabled:opacity-50"
            >
              Invia Contestazione (👎)
            </button>
          </div>
        </div>
      )}

      {/* Footer & Voting */}
      <div className="mt-auto pt-3 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="flex items-center gap-1.5 text-zinc-500">
          <User className="h-3.5 w-3.5" />
          <span>
            Autore: <strong className="text-zinc-300 font-semibold">{formatPublicAuthor(blooper.inserito_da, blooper.provenienza)}</strong>
          </span>
        </div>

        {/* Pulsanti Voto (Touch Target Ottimizzato per Smartphone) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleVote("conferma")}
            disabled={loading}
            className={`flex items-center gap-1.5 rounded-lg border min-h-[38px] sm:min-h-[32px] px-3 sm:px-2.5 py-1.5 sm:py-1 font-semibold text-xs transition-all touch-manipulation active:scale-95 ${
              votoUtente === "conferma"
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20"
                : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-emerald-400"
            }`}
            title="Conferma errore (👍)"
          >
            <ThumbsUp className="h-4 w-4 sm:h-3.5 sm:sm-3.5 text-emerald-400" />
            <span>{conferme}</span>
          </button>

          <button
            type="button"
            onClick={handleDislikeButtonClick}
            disabled={loading}
            className={`flex items-center gap-1.5 rounded-lg border min-h-[38px] sm:min-h-[32px] px-3 sm:px-2.5 py-1.5 sm:py-1 font-semibold text-xs transition-all touch-manipulation active:scale-95 ${
              votoUtente === "contestazione"
                ? "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-500/20"
                : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-rose-400"
            }`}
            title="Contesta errore (👎)"
          >
            <ThumbsDown className="h-4 w-4 sm:h-3.5 sm:sm-3.5 text-rose-400" />
            <span>{contestazioni}</span>
          </button>
        </div>
      </div>

      {/* Modal Richiesta Premium per Votazione */}
      {showPremiumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 p-6 shadow-2xl text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">Funzionalità Riservata ai Piani Premium</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                La votazione dell&apos;attendibilità e la contestazione degli errori sono riservate ai membri della community con un piano Premium attivo.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 text-xs text-left text-zinc-300 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <span>⭐ Con Premium sblocchi:</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                • Votazione & contestazione illimitata<br />
                • Badge VIP visibile nella community<br />
                • Generazioni IA illimitate e partecipazione alla classifica<br />
                • Piani a partire da soli 0,99€ (disdici con 1 clic)
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPremiumModal(false)}
                className="w-1/2 rounded-xl border border-zinc-800 px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-white transition"
              >
                Chiudi
              </button>
              <Link
                href="/pricing"
                className="w-1/2 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-xs font-bold text-zinc-950 shadow-md shadow-amber-500/20 hover:brightness-110 transition"
              >
                <span>Vedi Piani</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modal di Login/Registrazione */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setIsLoggedIn(true)}
      />
    </div>
  );
}
