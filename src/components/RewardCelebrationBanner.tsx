"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Trophy, Sparkles, X, ArrowRight, Award } from "lucide-react";

interface NotificationItem {
  id: string;
  tipo: string;
  titolo: string;
  messaggio: string;
  punti: number;
  film_titolo: string;
  motivo?: string;
  created_at: string;
  current_user_points: number;
}

export default function RewardCelebrationBanner() {
  const [activeNotification, setActiveNotification] = useState<NotificationItem | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkNotifications() {
      try {
        const res = await fetch("/api/user/notifications");
        if (!res.ok) return;

        const data = await res.json();
        const list: NotificationItem[] = data.notifications || [];

        // Filtra notifiche già viste salvate in localStorage
        const unread = list.filter((n) => {
          if (typeof window === "undefined") return true;
          return localStorage.getItem(`fbh_seen_reward_${n.id}`) !== "true";
        });

        if (isMounted && unread.length > 0) {
          const notif = unread[0];
          setActiveNotification(notif);
          setIsVisible(true);

          // Segna subito come visto sia in localStorage che sul server: compare una volta sola!
          try {
            localStorage.setItem(`fbh_seen_reward_${notif.id}`, "true");
          } catch (e) {
            console.error(e);
          }

          try {
            fetch("/api/user/notifications", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: notif.id }),
            });
          } catch (e) {
            console.error(e);
          }
        }
      } catch (err) {
        console.error("Errore verifica notifiche premi:", err);
      }
    }

    checkNotifications();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      setActiveNotification(null);
    }, 400);
  };

  if (!activeNotification || !isVisible) return null;

  return (
    <div className="relative z-40 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="relative overflow-hidden rounded-2xl border-2 border-amber-400/50 bg-gradient-to-r from-amber-950/60 via-zinc-950/95 to-amber-950/40 p-5 sm:p-6 shadow-2xl shadow-amber-500/10 backdrop-blur-xl">
        {/* Glow ambient background effects */}
        <div className="absolute -left-12 -top-12 h-36 w-36 rounded-full bg-amber-400/15 blur-2xl pointer-events-none" />
        <div className="absolute -right-12 -bottom-12 h-36 w-36 rounded-full bg-orange-500/15 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          {/* Colonna Sinistra: Icona e Messaggio */}
          <div className="flex items-start gap-4 sm:gap-5 flex-1">
            {/* Trofeo con luce pulsante */}
            <div className="relative flex h-13 w-13 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/30 via-amber-500/20 to-orange-500/30 border border-amber-400/60 text-amber-300 shadow-lg shadow-amber-500/20">
              <span className="absolute inline-flex h-full w-full rounded-2xl bg-amber-400 opacity-20 animate-ping" />
              <Trophy className="h-7 w-7 text-amber-300 drop-shadow-[0_2px_8px_rgba(251,191,36,0.5)]" />
            </div>

            <div className="space-y-1.5">
              {/* Badges festosi */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/50 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-amber-300">
                  <Sparkles className="h-3 w-3 text-amber-300" />
                  Segnalazione Approvata!
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-zinc-950 shadow-md shadow-amber-500/30">
                  +{activeNotification.punti} Punti Accreditati ⚡
                </span>
              </div>

              {/* Titolo e descrizione film */}
              <h4 className="text-sm sm:text-base font-extrabold text-white leading-tight">
                Grande occhio! L&apos;amministratore ha confermato la tua segnalazione per{" "}
                <span className="text-amber-300 underline underline-offset-2 decoration-amber-400/50">
                  {activeNotification.film_titolo}
                </span>
              </h4>

              {/* Dettagli accredito */}
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                {activeNotification.messaggio} Il tuo punteggio totale è salito a{" "}
                <strong className="text-amber-300 font-bold">{activeNotification.current_user_points} punti</strong>!
              </p>
            </div>
          </div>

          {/* Colonna Destra: Bottoni d'azione */}
          <div className="flex items-center gap-2.5 self-end md:self-center shrink-0 w-full sm:w-auto justify-end pt-2 md:pt-0 border-t border-zinc-800/80 md:border-t-0">
            <Link
              href="/classifica"
              onClick={handleDismiss}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-4 py-2 text-xs font-black text-zinc-950 shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all whitespace-nowrap"
            >
              <Award className="h-3.5 w-3.5" />
              <span>Vedi Classifica</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <button
              onClick={handleDismiss}
              className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition text-xs font-semibold"
              title="Chiudi notifica"
              aria-label="Chiudi notifica"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
