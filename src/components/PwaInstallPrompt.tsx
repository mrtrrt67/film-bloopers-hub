"use client";

import { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare, Smartphone, ExternalLink, ChevronDown } from "lucide-react";

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Registrazione Service Worker per abilitare PWA nativa su Chromium
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Silenzioso in caso di ambienti che non supportano SW
      });
    }

    // 2. Verifica se è già installato o aperto come PWA standalone
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return;

    // 3. Verifica se l'utente ha già chiuso il banner di recente (ultimi 2 giorni)
    const dismissedAt = localStorage.getItem("fb_install_prompt_dismissed");
    if (dismissedAt) {
      const days = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (days < 2) return;
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIosDevice);

    // Rileva se aperto dentro WebView/In-App Browser (Instagram, Facebook, TikTok, ecc.)
    const inApp = /instagram|fbav|fban|messenger|threads|tiktok|bytedance/i.test(ua);
    setIsInAppBrowser(inApp);

    // 4. Evento nativo Chromium per Android, Edge, Chrome Desktop
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Su dispositivi mobile (iOS o Android senza evento immediato), mostra il prompt dopo 3 secondi
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 3000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    // Se siamo su Chromium e l'evento nativo è pronto, avvia l'installazione nativa ad 1 clic!
    if (deferredPrompt && !isIOS && !isInAppBrowser) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setShowPrompt(false);
        }
        setDeferredPrompt(null);
        return;
      } catch (e) {
        console.warn("Errore avvio prompt nativo PWA:", e);
      }
    }

    // Su iOS o in-app browser, oppure su Android se deferredPrompt non è disponibile:
    // mostra la guida modale dettagliata
    setShowGuideModal(true);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowGuideModal(false);
    try {
      localStorage.setItem("fb_install_prompt_dismissed", Date.now().toString());
    } catch {}
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
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-black text-zinc-950 shadow-md transition-all active:scale-95"
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

      {/* Guida Modale Istruzioni Mobile */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-center shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <PlusSquare className="h-6 w-6" />
            </div>

            <h3 className="text-base font-black text-white">
              {isInAppBrowser
                ? "Apri nel Browser Principale"
                : isIOS
                ? "Installa su iPhone / iPad"
                : "Installa su Smartphone"}
            </h3>

            {isInAppBrowser ? (
              // Guida per chi apre da Instagram, Facebook o TikTok
              <div className="space-y-3 text-left text-xs bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800/80">
                <p className="text-zinc-300">
                  Stai visualizzando il sito all&apos;interno di <strong>Instagram o Facebook</strong>, che impediscono l&apos;installazione diretta.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-zinc-950 font-black text-[11px]">
                      1
                    </span>
                    <span className="text-zinc-200">
                      Tocca i <strong>tre puntini (⋯)</strong> in alto a destra
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-zinc-950 font-black text-[11px]">
                      2
                    </span>
                    <span className="text-zinc-200 flex items-center gap-1.5">
                      Scegli <ExternalLink className="h-3.5 w-3.5 text-amber-400 inline" /> <strong>&ldquo;Apri nel browser esterno&rdquo;</strong> (Safari o Chrome)
                    </span>
                  </div>
                </div>
              </div>
            ) : isIOS ? (
              // Guida dedicata per iOS Safari
              <>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Su iOS, Apple richiede di aggiungere l&apos;icona tramite la barra di Safari con questi 2 semplici passaggi:
                </p>
                <div className="space-y-2.5 text-left text-xs bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800/80">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-zinc-950 font-black text-[11px]">
                      1
                    </span>
                    <span className="text-zinc-200 flex items-center gap-1.5">
                      Tocca il pulsante <Share className="h-4 w-4 text-amber-400 inline shrink-0" /> (Condividi) nella barra inferiore di Safari
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-zinc-950 font-black text-[11px]">
                      2
                    </span>
                    <span className="text-zinc-200">
                      Scorri il menu e tocca <strong>&ldquo;Aggiungi alla schermata Home&rdquo;</strong>
                    </span>
                  </div>
                </div>
                {/* Freccia animata verso il basso che indica la barra di Safari */}
                <div className="flex flex-col items-center justify-center gap-1 text-[11px] text-amber-400 font-semibold animate-bounce pt-1">
                  <span>Il tasto Condividi è qui sotto</span>
                  <ChevronDown className="h-4 w-4" />
                </div>
              </>
            ) : (
              // Guida generica per Android senza prompt automatico
              <div className="space-y-2.5 text-left text-xs bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800/80">
                <p className="text-zinc-300">
                  Per installare l&apos;app su Android con Google Chrome:
                </p>
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-zinc-950 font-black text-[11px]">
                    1
                  </span>
                  <span className="text-zinc-200">
                    Tocca i <strong>tre puntini (⋮)</strong> in alto a destra in Chrome
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-zinc-950 font-black text-[11px]">
                    2
                  </span>
                  <span className="text-zinc-200">
                    Seleziona <strong>&ldquo;Installa app&rdquo;</strong> o <strong>&ldquo;Aggiungi a schermata Home&rdquo;</strong>
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-black text-zinc-950 transition shadow-md"
            >
              Ho capito
            </button>
          </div>
        </div>
      )}
    </>
  );
}
