"use client";

import { useState } from "react";
import { Check, Sparkles, Zap, Shield, ArrowRight } from "lucide-react";
import { PRICING_PLANS } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/client";

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const supabase = createClient();

  const handleSelectPlan = async (planId: string) => {
    if (planId === "free") return;

    setLoadingPlan(planId);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert("Devi registrarti o effettuare l'accesso prima di abbonarti.");
        return;
      }

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

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Intestazione */}
      <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-14">
        <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3.5 py-1 text-xs font-bold text-amber-400 mb-3">
          Sblocca l&apos;Esperienza Completa
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Scegli il Tuo Piano Ideale
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 mt-3 leading-relaxed">
          Nessuna sorpresa. Ricerche e bloopers illimitati generati dall&apos;IA, partecipazione alla community, classifiche e accesso a vita a partire da soli 0,99€.
        </p>
      </div>

      {/* Grid Piani */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 items-stretch">
        {PRICING_PLANS.map((plan) => {
          const isPromo = plan.id === "lifetime-promo";
          const isAnnuale = plan.id === "annuale";

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-2xl p-6 transition-all ${
                isPromo
                  ? "border-2 border-amber-500 bg-gradient-to-b from-amber-950/40 via-zinc-900 to-zinc-950 shadow-2xl shadow-amber-500/10 scale-[1.02]"
                  : isAnnuale
                  ? "border-2 border-purple-500/60 bg-gradient-to-b from-purple-950/30 via-zinc-900 to-zinc-950"
                  : "border border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
              }`}
            >
              {/* Badge in evidenza */}
              {isPromo && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-zinc-950 shadow-md">
                  Offerta di Lancio
                </div>
              )}
              {isAnnuale && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-purple-500 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
                  Più Popolare
                </div>
              )}

              <div>
                <h3 className="text-base font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-xs text-zinc-400 min-h-[36px] mb-4">{plan.description}</p>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-black text-white">{plan.price}</span>
                  <span className="text-xs text-zinc-400 font-medium">/ {plan.period}</span>
                </div>

                {/* Features List */}
                <div className="space-y-2.5 mb-6 text-xs border-t border-zinc-800 pt-4">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check
                        className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${
                          f.included ? "text-amber-400" : "text-zinc-600"
                        }`}
                      />
                      <span className={f.included ? "text-zinc-300" : "text-zinc-500 line-through"}>
                        {f.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              {plan.id === "free" ? (
                <button
                  disabled
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-2.5 text-xs font-bold text-zinc-400 cursor-default"
                >
                  Piano Attuale
                </button>
              ) : (
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={loadingPlan === plan.id}
                  className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all shadow-md ${
                    isPromo
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 hover:brightness-110 shadow-amber-500/20"
                      : isAnnuale
                      ? "bg-purple-600 text-white hover:bg-purple-500 shadow-purple-500/20"
                      : "bg-zinc-800 text-white hover:bg-zinc-700"
                  }`}
                >
                  {loadingPlan === plan.id ? (
                    "Reindirizzamento..."
                  ) : (
                    <>
                      <span>{isPromo ? "Acquista Promo" : `Scegli ${plan.name}`}</span>
                      <ArrowRight className="h-3 w-3" />
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
