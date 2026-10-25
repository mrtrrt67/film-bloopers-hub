"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Check,
  Sparkles,
  Zap,
  Shield,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Minus,
  Crown,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ExternalLink
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AuthModal from "@/components/AuthModal";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"mensile" | "annuale">("annuale");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [showFullComparison, setShowFullComparison] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }: { data: any }) => {
      const u = data?.user || null;
      setUser(u);
      if (u) {
        try {
          const { data: prof } = await supabase
            .from("profiles")
            .select("tier, tipo_abbonamento, data_scadenza, punti")
            .eq("id", u.id)
            .maybeSingle();
          if (prof) setUserProfile(prof);
        } catch (e) {
          console.error(e);
        }
      }
    });
  }, []);

  const handleManageBilling = async () => {
    setOpeningPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Impossibile aprire il portale Stripe in questo momento.");
      }
    } catch (err) {
      console.error(err);
      alert("Si è verificato un errore di connessione.");
    } finally {
      setOpeningPortal(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    if (planId === "free") return;

    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Impossibile avviare il checkout Stripe.");
      }
    } catch (err) {
      console.error(err);
      alert("Si è verificato un errore di connessione.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const isUserSubscribed = userProfile?.tier === "premium";
  const userSub = userProfile?.tipo_abbonamento;

  // Caratteristiche per la tabella comparativa completa
  const comparisonSections = [
    {
      category: "Esplorazione & Ricerca",
      features: [
        {
          name: "Ricerche film giornaliere",
          free: "15 al giorno",
          sub: "Illimitate",
          lifetime: "Illimitate",
        },
        {
          name: "Consultazione archivio bloopers e schede",
          free: true,
          sub: true,
          lifetime: true,
        },
        {
          name: "Importazione nuovi film da catalogo TMDB",
          free: true,
          sub: true,
          lifetime: true,
        },
        {
          name: "Filtri avanzati per categoria e minuto",
          free: true,
          sub: true,
          lifetime: true,
        },
      ],
    },
    {
      category: "Intelligenza Artificiale (Google Gemini)",
      features: [
        {
          name: "Generazione bloopers con IA",
          free: false,
          sub: "Illimitata",
          lifetime: "Illimitata",
        },
        {
          name: "Analisi accurata del minutaggio e del ciak",
          free: false,
          sub: true,
          lifetime: true,
        },
      ],
    },
    {
      category: "Community, Votazioni & Classifiche",
      features: [
        {
          name: "Votazione attendibilità bloopers (conferma)",
          free: false,
          sub: true,
          lifetime: true,
        },
        {
          name: "Contestazione motivata degli errori",
          free: false,
          sub: true,
          lifetime: true,
        },
        {
          name: "Partecipazione alla Classifica Cacciatori",
          free: false,
          sub: true,
          lifetime: true,
        },
        {
          name: "Sblocco automatico premi (+1 mese ogni 50 pt)",
          free: false,
          sub: true,
          lifetime: true,
        },
      ],
    },
    {
      category: "Privilegi Esclusivi & Supporto",
      features: [
        {
          name: "Badge profilo pubblico nella community",
          free: "—",
          sub: "⭐ VIP",
          lifetime: "👑 Leggenda",
        },
        {
          name: "Moltiplicatore punti sulle segnalazioni",
          free: "1x",
          sub: billingCycle === "annuale" ? "2x (Punti Doppi)" : "1x",
          lifetime: "2x (Punti Doppi)",
        },
        {
          name: "Supporto e revisione prioritaria",
          free: "Standard",
          sub: billingCycle === "annuale" ? "Prioritario ⚡" : "Standard",
          lifetime: "Prioritario ⚡",
        },
      ],
    },
    {
      category: "Flessibilità & Condizioni",
      features: [
        {
          name: "Tipo di pagamento",
          free: "Gratis per sempre",
          sub: "Ricorrente (Mese o Anno)",
          lifetime: "Una tantum (Nessun rinnovo)",
        },
        {
          name: "Disdetta autonoma con 1 clic in qualsiasi momento",
          free: "—",
          sub: true,
          lifetime: "Non necessaria",
        },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Intestazione Leggera e Accattivante */}
      <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3.5 py-1 text-xs font-semibold text-amber-400 mb-3">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Trasparenza Totale • Nessun Vincolo</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Piani Semplici e Flessibili
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 mt-3 leading-relaxed">
          Tutto ciò che serve per scoprire, votare e analizzare i bloopers con l&apos;IA. Disdici in qualsiasi momento con un solo clic.
        </p>
      </div>

      {/* Banner Abbonamento Attivo Snello & Non Invasivo */}
      {isUserSubscribed && (userSub === "mensile" || userSub === "annuale" || userSub === "lifetime") && (
        <div className="mb-8 rounded-xl border border-purple-500/30 bg-purple-950/20 px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <p className="text-zinc-300">
              Hai un piano attivo:{" "}
              <strong className="text-white capitalize font-bold">
                {userSub === "lifetime" ? "Lifetime a Vita" : `Piano ${userSub}`}
              </strong>
              {userSub !== "lifetime" && (
                <span className="text-zinc-400 hidden md:inline">
                  {" "}• Rinnovo automatico gestibile in completa autonomia
                </span>
              )}
            </p>
          </div>
          {userSub !== "lifetime" && (
            <button
              onClick={handleManageBilling}
              disabled={openingPortal}
              className="shrink-0 flex items-center gap-1.5 font-bold text-purple-300 hover:text-purple-200 transition underline underline-offset-4"
            >
              <span>{openingPortal ? "Apertura..." : "Gestisci o Disdici (1 Clic)"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Selettore Flessibile Fatturazione (Mensile vs Annuale) */}
      <div className="flex items-center justify-center mb-10">
        <div className="inline-flex items-center rounded-xl bg-zinc-900 border border-zinc-800 p-1 shadow-inner">
          <button
            type="button"
            onClick={() => setBillingCycle("mensile")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              billingCycle === "mensile"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Fatturazione Mensile
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("annuale")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              billingCycle === "annuale"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 shadow-md font-black"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>Fatturazione Annuale</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] uppercase font-bold tracking-tight ${
                billingCycle === "annuale"
                  ? "bg-zinc-950 text-amber-300"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              }`}
            >
              -17% (2 Mesi Gratis)
            </span>
          </button>
        </div>
      </div>

      {/* 3 CARD PULITE, ARIOSE E PROPORZIONATE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch mb-16">
        {/* CARD 1: FREE */}
        <div className="relative flex flex-col justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 sm:p-7 backdrop-blur-sm transition-all hover:border-zinc-700/80">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white">Free</h2>
              {(!isUserSubscribed || userSub === "nessuno") && (
                <span className="rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-semibold px-2 py-0.5">
                  Attuale
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Per curiosi e appassionati occasionali di cinema.
            </p>

            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-black text-white">0,00 €</span>
              <span className="text-xs text-zinc-500 font-medium">/ per sempre</span>
            </div>

            <div className="space-y-3 text-xs border-t border-zinc-800/80 pt-5 mb-8">
              <div className="flex items-center gap-2.5 text-zinc-300">
                <Check className="h-4 w-4 text-zinc-400 shrink-0" />
                <span>15 ricerche al giorno</span>
              </div>
              <div className="flex items-center gap-2.5 text-zinc-300">
                <Check className="h-4 w-4 text-zinc-400 shrink-0" />
                <span>Lettura completa bloopers e cast TMDB</span>
              </div>
              <div className="flex items-center gap-2.5 text-zinc-300">
                <Check className="h-4 w-4 text-zinc-400 shrink-0" />
                <span>Invio segnalazione errori per moderazione</span>
              </div>
              <div className="flex items-center gap-2.5 text-zinc-500">
                <Minus className="h-4 w-4 text-zinc-700 shrink-0" />
                <span>Votazioni e classifiche escluse</span>
              </div>
            </div>
          </div>

          <button
            disabled
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/40 py-3 text-xs font-bold text-zinc-500 cursor-default"
          >
            {(!isUserSubscribed || userSub === "nessuno") ? "Piano Attuale" : "Incluso"}
          </button>
        </div>

        {/* CARD 2: ABBONAMENTO PREMIUM (MENSILE O ANNUALE) */}
        <div className="relative flex flex-col justify-between rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-500/10 via-zinc-900/60 to-zinc-950 p-6 sm:p-7 shadow-xl shadow-amber-500/5 transition-all scale-[1.01]">
          {/* Badge Scelto */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-zinc-950 shadow-md">
            ⭐ Più Popolare
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white">
                {billingCycle === "annuale" ? "Premium Annuale" : "Premium Mensile"}
              </h2>
              {isUserSubscribed && userSub === billingCycle && (
                <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5">
                  Attivo
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-300 mb-6 leading-relaxed">
              {billingCycle === "annuale"
                ? "Il piano più conveniente per i veri cacciatori della community."
                : "Accesso totale a tutte le funzionalità della community."}
            </p>

            <div className="flex items-baseline gap-1.5 mb-6">
              <span className="text-4xl font-black text-white">
                {billingCycle === "annuale" ? "9,99 €" : "0,99 €"}
              </span>
              <span className="text-xs text-zinc-400 font-medium">
                {billingCycle === "annuale" ? "/ all'anno" : "/ al mese"}
              </span>
              {billingCycle === "annuale" && (
                <span className="text-[11px] font-bold text-emerald-400 ml-1">
                  (0,83€/mese)
                </span>
              )}
            </div>

            <div className="space-y-3 text-xs border-t border-zinc-800/80 pt-5 mb-8">
              <div className="flex items-center gap-2.5 text-zinc-200">
                <Check className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="font-semibold">Ricerche e generazioni IA illimitate</span>
              </div>
              <div className="flex items-center gap-2.5 text-zinc-200">
                <Check className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Votazione e contestazione bloopers</span>
              </div>
              <div className="flex items-center gap-2.5 text-zinc-200">
                <Check className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Classifica, sblocco premi e badge ⭐ VIP</span>
              </div>
              {billingCycle === "annuale" && (
                <div className="flex items-center gap-2.5 text-amber-300 font-bold">
                  <Check className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Punti Doppi (2x) + Supporto prioritario</span>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-zinc-400 text-[11px]">
                <Check className="h-4 w-4 text-zinc-500 shrink-0" />
                <span>Disdici in qualsiasi momento con 1 clic</span>
              </div>
            </div>
          </div>

          {isUserSubscribed && (userSub === "mensile" || userSub === "annuale") ? (
            <button
              onClick={handleManageBilling}
              disabled={openingPortal}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-purple-500/50 bg-purple-500/20 py-3 text-xs font-bold text-purple-200 hover:bg-purple-500/30 transition shadow-md"
            >
              <span>{openingPortal ? "Apertura..." : "Gestisci o Disdici (1 Clic)"}</span>
            </button>
          ) : (
            <button
              onClick={() => handleSelectPlan(billingCycle)}
              disabled={loadingPlan === billingCycle}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-xs font-black text-zinc-950 shadow-lg shadow-orange-500/20 hover:brightness-110 active:scale-98 transition"
            >
              {loadingPlan === billingCycle ? (
                "Reindirizzamento..."
              ) : (
                <>
                  <span>
                    {billingCycle === "annuale"
                      ? "Attiva Annuale (9,99€)"
                      : "Attiva Mensile (0,99€)"}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          )}
        </div>

        {/* CARD 3: LIFETIME PROMO (ACCESSO A VITA) */}
        <div className="relative flex flex-col justify-between rounded-2xl border border-purple-500/40 bg-gradient-to-b from-purple-950/20 via-zinc-900/40 to-zinc-950 p-6 sm:p-7 backdrop-blur-sm transition-all hover:border-purple-500/60">
          {/* Badge Offerta Lancio */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 px-3.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
            👑 Offerta di Lancio -50%
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white">Lifetime Pass</h2>
              {isUserSubscribed && userSub === "lifetime" && (
                <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5">
                  Attivo
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              Un solo pagamento, nessun rinnovo. Accesso completo per sempre.
            </p>

            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-4xl font-black text-white">9,99 €</span>
              <span className="text-base text-zinc-500 line-through">19,99 €</span>
              <span className="text-xs text-zinc-400 font-medium">/ una tantum</span>
            </div>

            <div className="space-y-3 text-xs border-t border-zinc-800/80 pt-5 mb-8">
              <div className="flex items-center gap-2.5 text-zinc-200">
                <Check className="h-4 w-4 text-purple-400 shrink-0" />
                <span className="font-semibold">Accesso Premium per sempre a vita</span>
              </div>
              <div className="flex items-center gap-2.5 text-zinc-200">
                <Check className="h-4 w-4 text-purple-400 shrink-0" />
                <span>Nessun costo mensile né rinnovo futuro</span>
              </div>
              <div className="flex items-center gap-2.5 text-zinc-200">
                <Check className="h-4 w-4 text-purple-400 shrink-0" />
                <span>Grado esclusivo 👑 Leggenda nella community</span>
              </div>
              <div className="flex items-center gap-2.5 text-purple-300 font-bold">
                <Check className="h-4 w-4 text-purple-400 shrink-0" />
                <span>Punti doppi (2x) + Supporto prioritario</span>
              </div>
              <div className="flex items-center gap-2.5 text-zinc-400 text-[11px]">
                <Check className="h-4 w-4 text-zinc-500 shrink-0" />
                <span>Include tutte le future funzionalità del sito</span>
              </div>
            </div>
          </div>

          {isUserSubscribed && userSub === "lifetime" ? (
            <button
              disabled
              className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-3 text-xs font-bold text-emerald-400 cursor-default"
            >
              Piano a Vita Attivo
            </button>
          ) : (
            <button
              onClick={() => handleSelectPlan("lifetime-promo")}
              disabled={loadingPlan === "lifetime-promo"}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-purple-600 text-white py-3 text-xs font-bold transition shadow-md active:scale-98"
            >
              {loadingPlan === "lifetime-promo" ? (
                "Reindirizzamento..."
              ) : (
                <>
                  <span>Ottieni Pass a Vita (9,99€)</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* TABELLA COMPARATIVA DELLE FUNZIONALITÀ (LAYOUT TRASPARENTE & ORDINATO) */}
      <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/60 p-6 sm:p-10 mb-16 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <h3 className="text-xl font-black text-white">Confronto Completo delle Funzionalità</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Panoramica dettagliata delle caratteristiche incluse in ciascun piano.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowFullComparison((prev) => !prev)}
            className="self-start sm:self-auto flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition"
          >
            <span>{showFullComparison ? "Comprimi Tabella" : "Espandi Tabella"}</span>
            {showFullComparison ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {showFullComparison && (
          <div className="overflow-x-auto pt-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="py-3 pr-4 font-bold uppercase tracking-wider text-[11px] w-2/5">
                    Funzionalità
                  </th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-center w-1/5">
                    Free
                  </th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-center w-1/5 text-amber-400">
                    Premium ({billingCycle === "annuale" ? "Annuale" : "Mensile"})
                  </th>
                  <th className="py-3 pl-3 font-bold uppercase tracking-wider text-[11px] text-center w-1/5 text-purple-400">
                    Lifetime Pass
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {comparisonSections.map((sec, sIdx) => (
                  <tr key={`sec-${sIdx}`} className="contents">
                    <tr className="bg-zinc-900/40">
                      <td colSpan={4} className="py-2.5 px-3 font-bold text-zinc-300 text-[11px] uppercase tracking-wider">
                        {sec.category}
                      </td>
                    </tr>
                    {sec.features.map((feat, fIdx) => (
                      <tr key={`feat-${sIdx}-${fIdx}`} className="hover:bg-zinc-900/20 transition-colors">
                        <td className="py-3 pr-4 text-zinc-300 font-medium">
                          {feat.name}
                        </td>
                        <td className="py-3 px-3 text-center text-zinc-400">
                          {typeof feat.free === "boolean" ? (
                            feat.free ? (
                              <Check className="h-4 w-4 text-emerald-400 mx-auto" />
                            ) : (
                              <Minus className="h-4 w-4 text-zinc-700 mx-auto" />
                            )
                          ) : (
                            feat.free
                          )}
                        </td>
                        <td className="py-3 px-3 text-center text-zinc-200 font-semibold bg-amber-500/[0.02]">
                          {typeof feat.sub === "boolean" ? (
                            feat.sub ? (
                              <Check className="h-4 w-4 text-amber-400 mx-auto" />
                            ) : (
                              <Minus className="h-4 w-4 text-zinc-700 mx-auto" />
                            )
                          ) : (
                            feat.sub
                          )}
                        </td>
                        <td className="py-3 pl-3 text-center text-zinc-200 font-semibold bg-purple-500/[0.02]">
                          {typeof feat.lifetime === "boolean" ? (
                            feat.lifetime ? (
                              <Check className="h-4 w-4 text-purple-400 mx-auto" />
                            ) : (
                              <Minus className="h-4 w-4 text-zinc-700 mx-auto" />
                            )
                          ) : (
                            feat.lifetime
                          )}
                        </td>
                      </tr>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Box Sicurezza e Trasparenza Contrattuale */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-6 space-y-3 text-xs text-zinc-400">
        <div className="flex items-center gap-2 text-zinc-200 font-bold">
          <ShieldCheck className="h-4 w-4 text-amber-400" />
          <span>Sicurezza dei Pagamenti & Flessibilità Contrattuale</span>
        </div>
        <p className="leading-relaxed">
          <strong>Elaborazione Stripe Ufficiale:</strong> Tutte le transazioni sono crittografate end-to-end con standard bancari PCI-DSS Livello 1 da <strong>Stripe Inc.</strong>. Nessun dato di pagamento viene mai memorizzato sui nostri server.
        </p>
        <p className="leading-relaxed">
          <strong>Disdetta 1-Clic:</strong> L&apos;abbonamento può essere revocato in qualsiasi momento con un solo click dal portale clienti Stripe, mantenendo l&apos;accesso a tutte le funzionalità fino alla fine del periodo già saldato.
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] text-zinc-500 border-t border-zinc-800">
          <span>Consulta i documenti legali:</span>
          <Link href="/termini" className="text-amber-400 hover:underline">Termini di Servizio</Link>
          <span>•</span>
          <Link href="/privacy" className="text-amber-400 hover:underline">Privacy Policy</Link>
          <span>•</span>
          <Link href="/note-legali" className="text-amber-400 hover:underline">Note Legali</Link>
        </div>
      </div>

      {/* Auth Modal per visitatori non registrati */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
