import React from "react";
import Image from "next/image";
import { FilmStreamingInfo } from "@/lib/types";
import { Tv, Play, Disc3, ExternalLink } from "lucide-react";

interface StreamingAvailabilityCardProps {
  streaming?: FilmStreamingInfo | null;
  amazonUrl: string;
  filmTitle: string;
  amazonTag?: string;
  variant?: "sidebar" | "banner";
}

export function StreamingAvailabilityCard({
  streaming,
  amazonUrl,
  filmTitle,
  amazonTag = "filmbloopers-21",
  variant = "sidebar",
}: StreamingAvailabilityCardProps) {
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
                Dove Vederlo
              </h3>
              <p className="text-[10px] text-zinc-400 font-medium">
                Disponibilità in Italia
              </p>
            </div>
          </div>
          <span className="rounded-md bg-zinc-800/80 border border-zinc-700/60 px-1.5 py-0.5 text-[9px] font-black text-zinc-400 uppercase tracking-wider">
            Streaming IT
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
              title={`Guarda ${filmTitle} su Prime Video`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#00A8E1] text-zinc-950 shadow-sm">
                  <Play className="h-3.5 w-3.5 fill-current" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-black text-white group-hover:text-amber-300 transition-colors truncate">
                      {isPrimeFlatrate ? "Guarda su Prime Video" : "Disponibile su Prime Video"}
                    </p>
                  </div>
                  <p className="text-[10px] text-zinc-300 font-medium leading-tight">
                    {isPrimeFlatrate
                      ? "Incluso con abbonamento Prime"
                      : isPrimeRentBuy
                      ? "Noleggio o Acquisto Digitale"
                      : "Streaming ad alta definizione"}
                  </p>
                </div>
              </div>

              <div className="shrink-0 pl-2">
                <span className="inline-flex items-center gap-1 rounded-lg bg-[#00A8E1]/20 border border-[#00A8E1]/40 px-2 py-1 text-[10px] font-black text-[#00A8E1] group-hover:bg-[#00A8E1] group-hover:text-zinc-950 transition-all">
                  <span>Avvia</span>
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
                Disponibile anche in abbonamento su:
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {otherFlatrate.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-1 text-xs text-zinc-200 shadow-sm"
                  title={`Disponibile con abbonamento su ${provider.name}`}
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
              Al momento non segnalato sui principali cataloghi di streaming in Italia.
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
                  Edizione Fisica o Libro
                </p>
                <p className="text-[9px] text-zinc-400 truncate">
                  DVD, Blu-ray da collezione o romanzo su Amazon
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
            <span>Dati verifica JustWatch</span>
            <span>Italia</span>
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
            Dove Vederlo
          </span>
        </div>
        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
          Italia
        </span>
      </div>

      {/* 1. HERO CTA MOBILE: PRIME VIDEO (SE DISPONIBILE) */}
      {isOnPrime && (
        <a
          href={primeDirectUrl}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="group relative flex items-center justify-between w-full rounded-xl p-2.5 bg-gradient-to-r from-[#00A8E1]/25 via-zinc-900 to-[#00A8E1]/10 border border-[#00A8E1]/50 shadow-md mb-2"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#00A8E1] text-zinc-950">
              <Play className="h-4 w-4 fill-current" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black text-white truncate">
                {isPrimeFlatrate ? "Guarda su Prime Video" : "Disponibile su Prime Video"}
              </p>
              <p className="text-[10px] text-zinc-300 font-medium truncate">
                {isPrimeFlatrate
                  ? "Incluso con Prime • Avvia il film"
                  : "Noleggio / Acquisto Digitale"}
              </p>
            </div>
          </div>

          <div className="shrink-0 pl-2">
            <span className="inline-flex items-center justify-center h-6 px-2 rounded-lg bg-[#00A8E1]/20 border border-[#00A8E1]/40 text-[10px] font-bold text-[#00A8E1]">
              Avvia ↗
            </span>
          </div>
        </a>
      )}

      {/* 2. INFO SEO ALTRE PIATTAFORME SU MOBILE */}
      {otherFlatrate.length > 0 && (
        <div className={isOnPrime ? "pt-2 border-t border-zinc-800/60 mb-2" : "mb-2"}>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Disponibile anche in abbonamento su:</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {otherFlatrate.map((provider) => (
              <span
                key={provider.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-850 border border-zinc-750 px-2 py-0.5 text-[11px] font-medium text-zinc-200"
              >
                {provider.logoUrl && (
                  <Image
                    src={provider.logoUrl}
                    alt={provider.name}
                    width={14}
                    height={14}
                    unoptimized
                    className="rounded-md object-cover shrink-0"
                  />
                )}
                <span>{provider.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AVVISO NESSUN CATALOGO */}
      {!hasAnyStreaming && (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-2 text-center mb-2">
          <p className="text-[11px] text-zinc-400 leading-snug">
            Al momento non segnalato sui cataloghi streaming in Italia.
          </p>
        </div>
      )}

      {/* 3. OPZIONE DISCO FISICO O LIBRO AMAZON SU MOBILE */}
      <div className="pt-2 border-t border-zinc-800/60">
        <a
          href={amazonUrl}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="flex items-center justify-between w-full rounded-xl bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-[10px] text-zinc-300 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-1.5 truncate">
            <Disc3 className="h-3 w-3 text-amber-400 shrink-0" />
            <span className="truncate">Edizione Fisica (DVD / Blu-ray) o Libro su Amazon</span>
          </span>
          <span className="text-amber-400 shrink-0 pl-1 font-bold">↗</span>
        </a>
      </div>
    </div>
  );
}
