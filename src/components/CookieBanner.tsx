"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, ShieldCheck, Check, X, ChevronDown, ChevronUp } from "lucide-react";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export default function CookieBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  useEffect(() => {
    try {
      const consent = localStorage.getItem("fbh_cookie_consent");
      if (!consent) {
        // Mostra il banner dopo 1 secondo se l'utente non ha mai espresso preferenze
        const timer = setTimeout(() => setIsOpen(true), 800);
        return () => clearTimeout(timer);
      } else {
        setAnalyticsEnabled(consent === "accepted");
      }
    } catch {}

    // Ascolta eventi personalizzati per riaprire il banner (es. dal footer o cookie policy)
    const handleReopen = () => {
      setIsOpen(true);
      setShowDetails(true);
    };

    window.addEventListener("open-cookie-banner", handleReopen);
    return () => window.removeEventListener("open-cookie-banner", handleReopen);
  }, []);

  const updateGoogleConsent = (granted: boolean) => {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("consent", "update", {
        analytics_storage: granted ? "granted" : "denied",
      });
    }
  };

  const handleAcceptAll = () => {
    try {
      localStorage.setItem("fbh_cookie_consent", "accepted");
    } catch {}
    updateGoogleConsent(true);
    setAnalyticsEnabled(true);
    setIsOpen(false);
  };

  const handleRejectAll = () => {
    try {
      localStorage.setItem("fbh_cookie_consent", "rejected");
    } catch {}
    updateGoogleConsent(false);
    setAnalyticsEnabled(false);
    setIsOpen(false);
  };

  const handleSaveCustom = () => {
    try {
      localStorage.setItem("fbh_cookie_consent", analyticsEnabled ? "accepted" : "rejected");
    } catch {}
    updateGoogleConsent(analyticsEnabled);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Gestione preferenze cookie"
      className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-lg z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/95 p-5 shadow-2xl backdrop-blur-xl ring-1 ring-zinc-700/50 space-y-4">
        {/* Intestazione */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Cookie className="h-5 w-5" />
          </div>
          <div className="space-y-1 pr-2">
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              Informativa e Preferenze Cookie
              <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                GDPR
              </span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Utilizziamo cookie tecnici essenziali per il funzionamento del sito e cookie analitici (Google Analytics) in forma aggregata per migliorare i contenuti. Puoi accettare tutti i cookie, rifiutare quelli non necessari o personalizzare le tue scelte.
            </p>
          </div>
        </div>

        {/* Dettagli espandibili / Personalizzazione */}
        {showDetails && (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 space-y-3 text-xs animate-in fade-in duration-200">
            {/* Tecnici (obbligatori) */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="space-y-0.5 pr-2">
                <span className="font-bold text-white flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Cookie Tecnici & di Sessione
                </span>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Indispensabili per autenticazione (Supabase), sicurezza transazioni e funzionamento base.
                </p>
              </div>
              <span className="shrink-0 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                Sempre Attivi
              </span>
            </div>

            {/* Analitici (Google Analytics) */}
            <div className="flex items-center justify-between pt-1">
              <div className="space-y-0.5 pr-2">
                <span className="font-bold text-white flex items-center gap-1">
                  <Cookie className="h-3.5 w-3.5 text-amber-400" /> Cookie Statistici & Analitici (GA4)
                </span>
                <p className="text-[11px] text-zinc-400 leading-tight">
                  Ci aiutano a misurare il traffico e le pagine più lette nel rispetto della tua privacy.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={analyticsEnabled}
                  onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>
        )}

        {/* Link Cookie Policy & Toggle Dettagli */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400">
          <Link
            href="/cookie"
            className="underline underline-offset-2 hover:text-amber-400 transition-colors"
          >
            Leggi la Cookie Policy completa
          </Link>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-zinc-300 hover:text-white font-medium"
          >
            {showDetails ? (
              <>
                <span>Nascondi dettagli</span>
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <span>Personalizza scelte</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>

        {/* Bottoni Azione */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
          {showDetails ? (
            <>
              <button
                type="button"
                onClick={handleSaveCustom}
                className="w-full sm:flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-2 text-xs font-bold text-zinc-950 shadow-md shadow-amber-500/20 transition active:scale-98"
              >
                Salva preferenze
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="w-full sm:w-auto rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 transition"
              >
                Accetta tutti
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="w-full sm:flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-black text-zinc-950 shadow-lg shadow-amber-500/20 transition active:scale-98"
              >
                Accetta tutti
              </button>
              <button
                type="button"
                onClick={handleRejectAll}
                className="w-full sm:flex-1 rounded-xl border border-zinc-700 bg-zinc-900/90 hover:bg-zinc-800 px-3.5 py-2.5 text-xs font-semibold text-zinc-200 transition active:scale-98"
              >
                Solo necessari
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

