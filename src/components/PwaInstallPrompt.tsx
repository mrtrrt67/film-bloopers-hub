"use client";

import { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare, Smartphone } from "lucide-react";

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Verifica se è già installato o aperto come PWA standalone
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return;

    // Verifica se l'utente ha già chiuso il banner di recente (ultimi 3 giorni)
    const dismissedAt = localStorage.getItem("fb_install_prompt_dismissed");
    if (dismissedAt) {
      const days = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (days < 3) return;
    }

    // Rileva iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    // Evento per Android Chrome / Chromium
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Su iOS mostra il banner dopo 3 secondi se non standalone
    if (isIosDevice && !standalone) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosGuide(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("fb_install_prompt_dismissed", Date.now().toString());
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <>
      {/* Banner discreto flottante in basso su mobile */}
      <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md sm:hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-zinc-900/95 p-3.5 shadow-2xl backdrop-blur-xl ring-1 ring-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 shadow-md shadow-orange-500/20">
              <Smartphone className="h-5 w-5 text-zinc-950" />
            </div>
            <div>
              <p className="text-xs font-black text-white">Installa l&apos;App</p>
              <p className="text-[11px] text-zinc-400">
                Aggiungi FilmBloopers alla schermata Home
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-black text-zinc-950 shadow-md transition-all active:scale-95"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Installa</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Chiudi"
              className="rounded-lg p-1 text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Guida Modale Istruzioni per iOS Safari */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-center shadow-2xl space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <PlusSquare className="h-6 w-6" />
            </div>
            <h3 className="text-base font-black text-white">
              Aggiungi alla schermata Home
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Su iPhone/iPad segui questi 2 semplici passaggi:
            </p>
            <div className="space-y-2.5 text-left text-xs bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800/80">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-zinc-950 font-black text-[11px]">
                  1
                </span>
                <span className="text-zinc-200 flex items-center gap-1.5">
                  Tocca il pulsante <Share className="h-4 w-4 text-amber-400 inline" /> (Condividi) nella barra in basso
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-zinc-950 font-black text-[11px]">
                  2
                </span>
                <span className="text-zinc-200">
                  Scorri e seleziona <strong>&ldquo;Aggiungi alla schermata Home&rdquo;</strong>
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition"
            >
              Ho capito
            </button>
          </div>
        </div>
      )}
    </>
  );
}
