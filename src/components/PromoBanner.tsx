"use client";

import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { formatHighlightedDateItalian } from "@/lib/utils";

interface PromoBannerProps {
  titolo?: string;
  testo?: string;
  badge?: string;
  scadenza?: string;
  visibile?: boolean;
}

export default function PromoBanner({
  titolo = "PROMO SPECIALE DI LANCIO STARTUP",
  testo = "Registrati o scala la classifica entro il {scadenza} per sbloccare subito l'accesso <b>Premium Lifetime gratuito</b> a vita!",
  badge = "Offerta a Tempo Limitato",
  scadenza = "2026-12-31",
  visibile = true,
}: PromoBannerProps) {
  if (!visibile) return null;

  const dataEvidenziata = formatHighlightedDateItalian(scadenza || "2026-12-31");

  let testoFormattato =
    testo ||
    "Registrati o scala la classifica entro il {scadenza} per sbloccare subito l'accesso <b>Premium Lifetime gratuito</b> a vita!";

  // 1. Sostituisce i segnaposto standard {scadenza} o {deadline}
  if (testoFormattato.includes("{scadenza}") || testoFormattato.includes("{deadline}")) {
    testoFormattato = testoFormattato
      .replace(/\{scadenza\}/g, dataEvidenziata)
      .replace(/\{deadline\}/g, dataEvidenziata);
  } else {
    // 2. Se nel testo era presente una data statica hardcoded (es. 2026-12-31 o DD/MM/YYYY), la rimpiazza con la data dinamica evidenziata
    testoFormattato = testoFormattato.replace(
      /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
      dataEvidenziata
    );
  }

  return (
    <div className="promo-banner-card relative overflow-hidden rounded-2xl border border-amber-500/35 bg-gradient-to-r from-amber-950/40 via-orange-950/20 to-zinc-950 p-5 sm:p-6 lg:py-6.5 lg:px-7 shadow-xl shadow-amber-500/5 mb-8">
      {/* Glow decorative element */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/35 text-amber-400 shadow-md shadow-amber-500/15">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-black tracking-wider text-amber-400 uppercase">
                {titolo}
              </span>
              <span className="rounded-md bg-amber-500/15 border border-amber-500/35 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-wide">
                {badge}
              </span>
            </div>
            <p
              className="text-sm text-zinc-300 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: testoFormattato }}
            />
          </div>
        </div>

        <Link
          href="/pricing"
          className="shrink-0 flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-5 py-2.5 text-xs font-black text-zinc-950 shadow-lg shadow-orange-500/20 hover:brightness-110 active:scale-95 transition-all whitespace-nowrap self-end sm:self-center"
        >
          <span>Scopri di più</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

