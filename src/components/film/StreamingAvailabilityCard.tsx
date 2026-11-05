import React from "react";
import Image from "next/image";
import { FilmStreamingInfo } from "@/lib/types";
import { Tv, Play, Disc3 } from "lucide-react";

interface StreamingAvailabilityCardProps {
  streaming?: FilmStreamingInfo | null;
  amazonUrl: string;
  filmTitle: string;
  amazonTag?: string;
  variant?: "sidebar" | "banner";
  dict?: any;
  locale?: string;
}

const COUNTRY_NAMES: Record<string, string> = {
  it: "Italia",
  en: "Global",
  es: "España",
  fr: "France",
  de: "Deutschland",
};

export function StreamingAvailabilityCard({
  streaming,
  amazonUrl,
  filmTitle,
  amazonTag = "filmbloopers-21",
  variant = "sidebar",
  dict,
  locale = "it",
}: StreamingAvailabilityCardProps) {
  const f = dict?.film || {};
  const country = COUNTRY_NAMES[locale] || "Italia";

  const isOnPrime = Boolean(streaming?.isOnPrimeVideo);
  const isPrimeFlatrate = Boolean(streaming?.isPrimeFlatrate);
  const isPrimeRentBuy = Boolean(streaming?.isPrimeRentBuy);
  const primeDirectUrl =
    streaming?.primeVideoDirectUrl ||
    `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(filmTitle)}&tag=${amazonTag}`;

  // Piattaforme in abbonamento terze (informative per SEO, senza link in uscita dispersivi)
  const otherFlatrate = (streaming?.flatrate || []).filter(
    (p) =>
      !p.name.toLowerCase().includes("prime") &&
      !p.name.toLowerCase().includes("amazon")
  );

  const hasAnyStreaming = isOnPrime || otherFlatrate.length > 0;

  // Render per la Sidebar Desktop
  if (variant === "sidebar") {
    return (
      <div className="w-full rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/95 to-zinc-950 p-3.5 shadow-xl backdrop-blur-sm">
        {/* Intestazione Sezione */}
        <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Tv className="h-3.5 w-3.5" />
            </span>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-tight">
                {f.whereToWatch || "Dove Vederlo"}
              </h3>
              <p className="text-[10px] text-zinc-400 font-medium">
                {f.availability || `Disponibilità in ${country}`}
              </p>
            </div>
          </div>
          <span className="rounded-md bg-zinc-800/80 border border-zinc-700/60 px-1.5 py-0.5 text-[9px] font-black text-zinc-400 uppercase tracking-wider">
            {f.streamingBadge || "Streaming"} {locale.toUpperCase()}
          </span>
        </div>

        {/* 1. HERO CTA: PRIME VIDEO (SE DISPONIBILE) */}
        {isOnPrime && (
          <div className="mb-3">
            <a
              href={primeDirectUrl}
              target="_blank"
              rel="sponsored noopener noreferrer"
              className="group relative flex items-center justify-between w-full rounded-xl p-2.5 bg-gradient-to-br from-[#00A8E1]/25 via-zinc-900 to-[#00A8E1]/10 border border-[#00A8E1]/50 hover:border-[#00A8E1] hover:shadow-[#00A8E1]/20 hover:shadow-lg transition-all shadow-md"
              title={`${f.watchOnPrime || "Guarda su Prime Video"}: ${filmTitle}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#00A8E1] text-zinc-950 shadow-sm">
                  <Play className="h-3.5 w-3.5 fill-current" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-black text-white group-hover:text-amber-300 transition-colors truncate">
                      {isPrimeFlatrate ? (f.watchOnPrime || "Guarda su Prime Video") : (f.availableOnPrime || "Disponibile su Prime Video")}
                    </p>
                  </div>
                  <p className="text-[10px] text-zinc-300 font-medium leading-tight">
                    {isPrimeFlatrate
                      ? (f.includedPrime || "Incluso con abbonamento Prime")
                      : isPrimeRentBuy
                      ? (f.rentBuyPrime || "Noleggio o Acquisto Digitale")
                      : (f.hdStreaming || "Streaming ad alta definizione")}
                  </p>
                </div>
              </div>

              <div className="shrink-0 pl-2">
                <span className="inline-flex items-center gap-1 rounded-lg bg-[#00A8E1]/20 border border-[#00A8E1]/40 px-2 py-1 text-[10px] font-black text-[#00A8E1] group-hover:bg-[#00A8E1] group-hover:text-zinc-950 transition-all">
                  <span>{f.launchStream || "Avvia"}</span>
                  <Play className="h-2.5 w-2.5 fill-current" />
                </span>
              </div>
            </a>
          </div>
        )}

        {/* 2. INFORMAZIONE SEO DI SERVIZIO PER ALTRE PIATTAFORME (NON CLICCABILI) */}
        {otherFlatrate.length > 0 && (
          <div className={isOnPrime ? "pt-2.5 border-t border-zinc-800/70 mb-3" : "mb-3"}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                {f.alsoAvailableOn || "Disponibile anche in abbonamento su:"}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {otherFlatrate.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-1 text-xs text-zinc-200 shadow-sm"
                  title={`${provider.name}`}
                >
                  {provider.logoUrl && (
                    <Image
                      src={provider.logoUrl}
                      alt={provider.name}
                      width={16}
                      height={16}
                      unoptimized
                      className="rounded-md object-cover shrink-0"
                    />
                  )}
                  <span className="text-[11px] font-semibold text-zinc-300">
                    {provider.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AVVISO SE NON È PRESENTE SU ALCUN SERVIZIO STREAMING */}
        {!hasAnyStreaming && (
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-2.5 text-center mb-3">
            <p className="text-[11px] text-zinc-400 leading-snug">
              {f.noStreamingAvailable || "Al momento non segnalato sui principali cataloghi di streaming."}
            </p>
          </div>
        )}

        {/* 3. EDIZIONE FISICA & LIBRO SU AMAZON (DISCRETO E PULITO) */}
        <div className="pt-2.5 border-t border-zinc-800/80">
          <a
            href={amazonUrl}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="flex items-center justify-between w-full rounded-xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-amber-500/50 p-2.5 transition-all text-left group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Disc3 className="h-3.5 w-3.5 group-hover:rotate-45 transition-transform" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-zinc-200 group-hover:text-amber-400 transition-colors truncate">
                  {f.physicalEdition || "Edizione Fisica o Libro"}
                </p>
                <p className="text-[9px] text-zinc-400 truncate">
                  {f.physicalEditionDesc || "DVD, Blu-ray da collezione o romanzo su Amazon"}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform shrink-0 pl-1">
              ↗
            </span>
          </a>
        </div>

        {/* Fonte Dati JustWatch */}
        {streaming?.justWatchLink && (
          <div className="mt-2 pt-2 border-t border-zinc-900 flex items-center justify-between text-[9px] text-zinc-600">
            <span>{f.justWatchVerification || "Dati verifica JustWatch"}</span>
            <span>{country}</span>
          </div>
        )}
      </div>
    );
  }

  // Render per Mobile Banner
  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/95 to-zinc-950 p-3 shadow-lg">
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-zinc-800/80">
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Tv className="h-3 w-3" />
          </span>
          <span className="text-xs font-black text-white uppercase tracking-tight">
            {f.whereToWatch || "Dove Vederlo"}
          </span>
        </div>
        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
          {country}
        </span>
      </div>

      {/* 1. HERO CTA MOBILE: PRIME VIDEO (SE DISPONIBILE) */}
      {isOnPrime && (
        <div className="mb-2">
          <a
            href={primeDirectUrl}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="flex items-center justify-between w-full rounded-xl p-2 bg-[#00A8E1]/20 border border-[#00A8E1]/40"
          >
            <div className="flex items-center gap-2">
              <Play className="h-3.5 w-3.5 text-[#00A8E1] fill-current" />
              <span className="text-xs font-bold text-white">
                {isPrimeFlatrate ? (f.watchOnPrime || "Guarda su Prime Video") : (f.availableOnPrime || "Disponibile su Prime Video")}
              </span>
            </div>
            <span className="text-[10px] font-black text-[#00A8E1]">
              {f.launchStream || "Avvia"} ▶
            </span>
          </a>
        </div>
      )}

      {/* 2. ALTRE PIATTAFORME MOBILE */}
      {otherFlatrate.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {otherFlatrate.map((provider) => (
            <span
              key={provider.id}
              className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300"
            >
              {provider.name}
            </span>
          ))}
        </div>
      )}

      {/* 3. AMAZON FISICO MOBILE */}
      <a
        href={amazonUrl}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="flex items-center justify-between text-xs text-zinc-400 hover:text-amber-400 pt-1.5 border-t border-zinc-800"
      >
        <span>{f.physicalEdition || "Edizione Fisica o Libro su Amazon"}</span>
        <span>↗</span>
      </a>
    </div>
  );
}
