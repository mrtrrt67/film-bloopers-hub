"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, ArrowRight, ShieldCheck, CheckCircle2, PartyPopper, AlertCircle } from "lucide-react";
import { PRICING_PLANS } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/client";
import AuthModal from "@/components/AuthModal";
import { useTranslation } from "@/i18n/client";
import { getLocalizedPath } from "@/i18n";

function PricingContent() {
  const { dict, locale } = useTranslation();
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get("success") === "true";
  const isCanceled = searchParams.get("canceled") === "true";

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
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

  const getPlanDetails = (planId: string) => {
    const p = dict.pricing;
    switch (planId) {
      case "free":
        return {
          name: p.freePlanName,
          period: p.freePeriod,
          description: p.freeDesc,
          features: [
            { name: p.f_searches_free, included: true },
            { name: p.f_view_bloopers, included: true },
            { name: p.f_submit_errors, included: true },
            { name: p.f_voting, included: false },
            { name: p.f_leaderboard, included: false },
            { name: p.f_unlimited_ai, included: false },
          ],
        };
      case "mensile":
        return {
          name: p.monthlyPlanName,
          period: p.monthlyPeriod,
          description: p.monthlyDesc,
          features: [
            { name: p.f_unlimited_ai, included: true },
            { name: p.f_voting, included: true },
            { name: p.f_leaderboard, included: true },
            { name: p.f_leaderboard, included: true },
            { name: p.f_badge_vip, included: true },
            { name: p.f_cancel_anytime, included: true },
          ],
        };
      case "annuale":
        return {
          name: p.yearlyPlanName,
          period: p.yearlyPeriod,
          description: p.yearlyDesc,
          features: [
            { name: p.f_unlimited_ai, included: true },
            { name: p.f_voting, included: true },
            { name: p.f_leaderboard, included: true },
            { name: p.f_badge_vip, included: true },
            { name: p.f_future_updates, included: true },
          ],
        };
      case "lifetime-promo":
        return {
          name: "Lifetime Promo",
          period: p.lifetimePeriod,
          description: p.lifetimeDesc,
          features: [
            { name: p.f_unlimited_ai, included: true },
            { name: p.f_cancel_anytime, included: true },
            { name: p.f_future_updates, included: true },
            { name: p.f_badge_legend, included: true },
            { name: p.bestValueBadge, included: true },
          ],
        };
      case "lifetime-standard":
        return {
          name: p.lifetimePlanName,
          period: p.lifetimePeriod,
          description: p.lifetimeDesc,
          features: [
            { name: p.f_unlimited_ai, included: true },
            { name: p.f_cancel_anytime, included: true },
            { name: p.f_future_updates, included: true },
            { name: p.f_badge_legend, included: true },
          ],
        };
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Banner Successo Post-Checkout Stripe */}
      {isSuccess && (
        <div className="mb-8 rounded-2xl border border-emerald-500/50 bg-emerald-950/40 p-5 flex items-start gap-4 shadow-xl animate-in fade-in slide-in-from-top-4">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
            <PartyPopper className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-300">
              {dict.pricing.successTitle}
            </h3>
            <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
              {dict.pricing.successDesc}
            </p>
          </div>
        </div>
      )}

      {/* Banner Annullamento Checkout */}
      {isCanceled && (
        <div className="mb-8 rounded-2xl border border-zinc-700 bg-zinc-900/80 p-4 flex items-center gap-3 text-xs text-zinc-300">
          <AlertCircle className="h-5 w-5 text-zinc-400 shrink-0" />
          <span>{dict.pricing.cancelTitle}</span>
        </div>
      )}

      {/* Intestazione */}
      <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-10">
        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1 text-xs font-bold text-emerald-400 mb-3">
          {dict.pricing.badge}
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          {dict.pricing.title}
        </h1>
        <p className="text-sm sm:text-base text-zinc-300 mt-3 leading-relaxed">
          {dict.pricing.subtitle}
        </p>
      </div>

      {/* Banner Abbonamento Attivo (Disdici con 1 Clic nel portale Stripe) */}
      {isUserSubscribed && (userSub === "mensile" || userSub === "annuale") && (
        <div className="mb-10 rounded-2xl border-2 border-purple-500/50 bg-gradient-to-r from-purple-950/40 via-zinc-900 to-zinc-950 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 text-purple-300 px-3 py-0.5 text-xs font-bold border border-purple-500/30">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>
                {dict.pricing.activeSubTitle.replace("{plan}", userSub === "annuale" ? dict.pricing.yearlyPlanName : dict.pricing.monthlyPlanName)}
              </span>
            </div>
            <h3 className="text-base font-bold text-white">{dict.pricing.manageBillingTitle}</h3>
            <p className="text-xs text-zinc-400">
              {dict.pricing.manageBillingDesc}
            </p>
          </div>
          <button
            onClick={handleManageBilling}
            disabled={openingPortal}
            className="shrink-0 flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 text-xs font-bold transition shadow-lg shadow-purple-500/20 active:scale-95"
          >
            <span>{openingPortal ? dict.pricing.openingPortal : dict.pricing.openPortal}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Grid Piani */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4.5 2xl:gap-6 items-stretch">
        {PRICING_PLANS.map((plan) => {
          const isPromo = plan.id === "lifetime-promo";
          const isAnnuale = plan.id === "annuale";
          const isCurrentPlan =
            (plan.id === "free" && (!isUserSubscribed || !userSub || userSub === "nessuno")) ||
            (isUserSubscribed && userSub === plan.id) ||
            (isUserSubscribed && userSub === "lifetime" && (plan.id === "lifetime-promo" || plan.id === "lifetime-standard"));

          const localized = getPlanDetails(plan.id);
          const planName = localized?.name || plan.name;
          const planDesc = localized?.description || plan.description;
          const planPeriod = localized?.period || plan.period;
          const planFeatures = localized?.features || plan.features;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-2xl p-5 xl:p-4 2xl:p-6 transition-all ${
                isPromo
                  ? "border-2 border-amber-500 bg-gradient-to-b from-amber-950/40 via-zinc-900 to-zinc-950 shadow-2xl shadow-amber-500/10 scale-[1.02]"
                  : isAnnuale
                  ? "border-2 border-purple-500/60 bg-gradient-to-b from-purple-950/30 via-zinc-900 to-zinc-950"
                  : "border border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
              }`}
            >
              {/* Badge in evidenza */}
              {isPromo && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-zinc-950 shadow-md whitespace-nowrap">
                  {dict.pricing.bestValueBadge || "Promo"}
                </div>
              )}
              {isAnnuale && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-purple-500 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-md whitespace-nowrap">
                  {dict.pricing.popularBadge}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1 gap-1">
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">{planName}</h3>
                  {isCurrentPlan && (
                    <span className="rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 whitespace-nowrap shrink-0">
                      {dict.pricing.currentPlan}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 min-h-[36px] mb-4">{planDesc}</p>

                <div className="flex items-baseline flex-nowrap gap-1.5 mb-5 whitespace-nowrap">
                  <span className="text-xl sm:text-2xl xl:text-[1.35rem] 2xl:text-2xl font-black text-white whitespace-nowrap tracking-tight shrink-0">
                    {plan.price.replace(/\s+/g, "\u00A0")}
                  </span>
                  <span className="text-[11px] 2xl:text-xs text-zinc-400 font-medium whitespace-nowrap shrink-0">
                    / {planPeriod}
                  </span>
                </div>

                {/* Features List */}
                <div className="space-y-2.5 mb-6 text-xs border-t border-zinc-800 pt-4">
                  {planFeatures.map((f, i) => (
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
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-2.5 px-3 text-xs font-bold text-zinc-400 cursor-default whitespace-nowrap"
                >
                  {isCurrentPlan ? dict.pricing.currentPlan : dict.pricing.freeButton}
                </button>
              ) : isCurrentPlan && (userSub === "mensile" || userSub === "annuale") ? (
                <button
                  onClick={handleManageBilling}
                  disabled={openingPortal}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-purple-500/50 bg-purple-500/20 py-2.5 px-3 text-xs font-bold text-purple-300 hover:bg-purple-500/30 transition shadow whitespace-nowrap"
                >
                  <span>{openingPortal ? dict.pricing.openingPortal : dict.pricing.openPortal}</span>
                </button>
              ) : (
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={loadingPlan === plan.id}
                  className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 text-xs font-bold transition-all shadow-md whitespace-nowrap ${
                    isPromo
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 hover:brightness-110 shadow-amber-500/20"
                      : isAnnuale
                      ? "bg-purple-600 text-white hover:bg-purple-500 shadow-purple-500/20"
                      : "bg-zinc-800 text-white hover:bg-zinc-700"
                  }`}
                >
                  {loadingPlan === plan.id ? (
                    "..."
                  ) : (
                    <>
                      <span>
                        {plan.id === "free"
                          ? dict.pricing.freeButton
                          : plan.id === "mensile"
                          ? dict.pricing.monthlyButton
                          : plan.id === "annuale"
                          ? dict.pricing.yearlyButton
                          : dict.pricing.lifetimeButton}
                      </span>
                      <ArrowRight className="h-3 w-3 shrink-0" />
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Note Legali e Trasparenza Contrattuale */}
      <div className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3 text-xs text-zinc-400">
        <div className="flex items-center gap-2 text-zinc-200 font-bold">
          <ShieldCheck className="h-4 w-4 text-amber-400" />
          <span>{dict.pricing.guaranteeTitle}</span>
        </div>
        <p className="leading-relaxed">
          {dict.pricing.guaranteeDesc}
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] text-zinc-400 border-t border-zinc-800/80">
          <span>{dict.footer?.quickLinks || "Documenti legali"}:</span>
          <Link href={getLocalizedPath("/termini", locale)} className="text-amber-400 hover:underline">
            {dict.footer?.terms || "Termini e Condizioni"}
          </Link>
          <span>•</span>
          <Link href={getLocalizedPath("/privacy", locale)} className="text-amber-400 hover:underline">
            {dict.footer?.privacy || "Informativa Privacy"}
          </Link>
          <span>•</span>
          <Link href={getLocalizedPath("/note-legali", locale)} className="text-amber-400 hover:underline">
            {dict.footer?.legal || "Note Legali"}
          </Link>
        </div>
      </div>

      {/* Auth Modal per visitatori */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center text-zinc-500">
          ...
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
