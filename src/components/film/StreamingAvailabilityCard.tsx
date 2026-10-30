import React from "react";
import Image from "next/image";
import { FilmStreamingInfo, WatchProviderItem } from "@/lib/types";
import { Tv, Play, Disc3, ExternalLink, Sparkles, CheckCircle2 } from "lucide-react";

interface StreamingAvailabilityCardProps {
  streaming?: FilmStreamingInfo | null;
  amazonUrl: string;
  filmTitle: string;
  amazonTag?: string;
  variant?: "sidebar" | "banner";
}

/**
 * Genera il link diretto e ufficiale alla pagina/app del provider per avviare il film.
 */
export function getPlatformWatchUrl(
  name: string,
  title: string,
  amazonTag = "filmbloopers-21"
): string {
  const lower = name.toLowerCase();
  const q = encodeURIComponent(title);

  // Prime Video: link diretto al catalogo streaming di primevideo.com
  if (lower.includes("prime") || lower.includes("amazon")) {
    return `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${q}&tag=${amazonTag}`;
  }
  // Paramount+
  if (lower.includes("paramount")) {
    return `https://www.paramountplus.com/it/search/?q=${q}`;
  }
  // Netflix
  if (lower.includes("netflix")) {
    return `https://www.netflix.com/search?q=${q}`;
  }
  // Disney+
  if (lower.includes("disney")) {
    return `https://www.disneyplus.com/search?q=${q}`;
  }
  // Apple TV
  if (lower.includes("apple")) {
    return `https://tv.apple.com/it/search?term=${q}`;
  }
  // Now TV
  if (lower.includes("now")) {
    return `https://www.nowtv.it/search?q=${q}`;
  }
  // RaiPlay
  if (lower.includes("rai")) {
    return `https://www.raiplay.it/ricerca.html?q=${q}`;
  }
  // Mediaset Infinity
  if (lower.includes("infinity") || lower.includes("mediaset")) {
    return `https://mediasetinfinity.mediaset.it/search?q=${q}`;
  }
  // Rakuten TV
  if (lower.includes("rakuten")) {
    return `https://rakuten.tv/it/search?q=${q}`;
  }
  // Google Play Film
  if (lower.includes("google")) {
    return `https://play.google.com/store/search?q=${q}&c=movies`;
  }
  // Fallback
  return `https://www.google.com/search?q=${encodeURIComponent(`${name} ${title} streaming italia`)}`;
}

/**
 * Restituisce lo stile visivo di brand specifico per ciascun servizio streaming.
 */
function getProviderBrandStyle(name: string): {
  container: string;
  badge: string;
  badgeText: string;
} {
  const lower = name.toLowerCase();

  if (lower.includes("prime") || lower.includes("amazon")) {
    return {
      container:
        "bg-gradient-to-br from-[#00A8E1]/25 via-zinc-900 to-[#00A8E1]/10 border-[#00A8E1]/50 hover:border-[#00A8E1] hover:shadow-[#00A8E1]/20",
      badge: "bg-[#00A8E1] text-zinc-950",
      badgeText: "Prime Video",
    };
  }
  if (lower.includes("paramount")) {
    return {
      container:
        "bg-gradient-to-br from-[#0064FF]/25 via-zinc-900 to-[#0064FF]/10 border-[#0064FF]/50 hover:border-[#0064FF] hover:shadow-[#0064FF]/20",
      badge: "bg-[#0064FF] text-white",
      badgeText: "Paramount+",
    };
  }
  if (lower.includes("netflix")) {
    return {
      container:
        "bg-gradient-to-br from-red-600/20 via-zinc-900 to-red-600/10 border-red-600/50 hover:border-red-500 hover:shadow-red-600/20",
      badge: "bg-red-600 text-white",
      badgeText: "Netflix",
    };
  }
  if (lower.includes("disney")) {
    return {
      container:
        "bg-gradient-to-br from-blue-700/25 via-zinc-900 to-blue-600/10 border-blue-600/50 hover:border-blue-400 hover:shadow-blue-600/20",
      badge: "bg-blue-600 text-white",
      badgeText: "Disney+",
    };
  }
  if (lower.includes("apple")) {
    return {
      container:
        "bg-gradient-to-br from-zinc-700/25 via-zinc-900 to-zinc-800/20 border-zinc-600/50 hover:border-zinc-400 hover:shadow-zinc-600/20",
      badge: "bg-zinc-200 text-zinc-950",
      badgeText: "Apple TV",
    };
  }

  return {
    container:
      "bg-zinc-900/90 border-zinc-800 hover:border-amber-500/50 hover:shadow-amber-500/10",
    badge: "bg-zinc-800 text-zinc-200",
    badgeText: name,
  };
}

export function StreamingAvailabilityCard({
  streaming,
  amazonUrl,
  filmTitle,
  amazonTag = "filmbloopers-21",
  variant = "sidebar",
}: StreamingAvailabilityCardProps) {
  const flatrate = streaming?.flatrate || [];
  const rentOrBuy = streaming?.rentOrBuy || [];
  const hasFlatrate = flatrate.length > 0;
  const hasRentBuy = rentOrBuy.length > 0;
  const hasAny = hasFlatrate || hasRentBuy;

  // Render per la Sidebar Desktop
  if (variant === "sidebar") {
    return (
      <div className="w-full rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/95 to-zinc-950 p-4 shadow-xl backdrop-blur-sm">
        {/* Intestazione Sezione */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Tv className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-tight">
                Dove Vederlo
              </h3>
              <p className="text-[10px] text-zinc-400 font-medium">
                Piattaforme ufficiali in Italia
              </p>
            </div>
          </div>
          {streaming?.justWatchLink && (
            <span className="rounded-md bg-zinc-800/80 border border-zinc-700/60 px-1.5 py-0.5 text-[9px] font-black text-zinc-400 uppercase tracking-wider">
              JustWatch IT
            </span>
          )}
        </div>

        {/* 1. SEZIONE STREAMING (INCLUSO CON ABBONAMENTO) */}
        {hasFlatrate && (
          <div className="mb-3.5">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                Streaming (Incluso con Abbonamento)
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {flatrate.map((provider) => {
                const watchUrl = getPlatformWatchUrl(
                  provider.name,
                  filmTitle,
                  amazonTag
                );
                const brand = getProviderBrandStyle(provider.name);
                const isPrime =
                  provider.name.toLowerCase().includes("prime") ||
                  provider.name.toLowerCase().includes("amazon");

                return (
                  <a
                    key={provider.id}
                    href={watchUrl}
                    target="_blank"
                    rel={isPrime ? "sponsored noopener noreferrer" : "noopener noreferrer"}
                    className={`group relative flex items-center justify-between w-full rounded-xl p-2.5 border transition-all shadow-md hover:shadow-lg ${brand.container}`}
                    title={`Avvia ${filmTitle} su ${provider.name}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {provider.logoUrl ? (
                        <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-white/10 shadow-sm">
                          <Image
                            src={provider.logoUrl}
                            alt={provider.name}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-200">
                          <Play className="h-3.5 w-3.5 fill-current" />
                        </span>
                      )}

                      <div className="min-w-0">
                        <p className="text-xs font-black text-white group-hover:text-amber-300 transition-colors truncate">
                          {isPrime ? "Guarda su Prime Video" : provider.name}
                        </p>
                        <p className="text-[10px] text-zinc-300/80 font-medium leading-tight">
                          {isPrime ? "Incluso con Prime • Avvia il film" : "Incluso • Avvia lo streaming"}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 pl-2">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 group-hover:bg-amber-400 group-hover:text-zinc-950 px-2 py-1 text-[10px] font-bold text-white transition-all">
                        <span>Guarda</span>
                        <Play className="h-2.5 w-2.5 fill-current" />
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. SEZIONE NOLEGGIO O ACQUISTO (RENT / BUY) */}
        {hasRentBuy && (
          <div className={hasFlatrate ? "pt-3 border-t border-zinc-800/80" : ""}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                Noleggio o Acquisto Digitale
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {rentOrBuy.map((provider) => {
                const watchUrl = getPlatformWatchUrl(
                  provider.name,
                  filmTitle,
                  amazonTag
                );
                const brand = getProviderBrandStyle(provider.name);
                const isPrime =
                  provider.name.toLowerCase().includes("prime") ||
                  provider.name.toLowerCase().includes("amazon");

                return (
                  <a
                    key={provider.id}
                    href={watchUrl}
                    target="_blank"
                    rel={isPrime ? "sponsored noopener noreferrer" : "noopener noreferrer"}
                    className={`group relative flex items-center justify-between w-full rounded-xl p-2.5 border transition-all shadow-md ${brand.container}`}
                    title={`Noleggia o acquista ${filmTitle} su ${provider.name}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {provider.logoUrl ? (
                        <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-lg border border-white/10 shadow-sm">
                          <Image
                            src={provider.logoUrl}
                            alt={provider.name}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-200">
                          <Play className="h-3 w-3 fill-current" />
                        </span>
                      )}

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-200 group-hover:text-amber-300 transition-colors truncate">
                          {isPrime ? "Prime Video (Noleggio / Buy)" : provider.name}
                        </p>
                        <p className="text-[10px] text-zinc-400 leading-tight">
                          Noleggia o acquista subito
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 pl-2">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-800/80 border border-zinc-700/80 px-2 py-0.5 text-[10px] font-bold text-zinc-300 group-hover:text-amber-400">
                        Apri ↗
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. NESSUN SERVIZIO STREAMING SEGNALATO IN ITALIA */}
        {!hasAny && (
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-center">
            <p className="text-xs text-zinc-400 leading-snug">
              Al momento non segnalato sui principali servizi di streaming in abbonamento in Italia.
            </p>
          </div>
        )}

        {/* 4. SEZIONE EDIZIONE FISICA AMAZON (DVD & BLU-RAY DA COLLEZIONE) */}
        <div className="mt-3 pt-3 border-t border-zinc-800/80">
          <a
            href={amazonUrl}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="flex items-center justify-between w-full rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-amber-500/50 p-2.5 transition-all text-left group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Disc3 className="h-3.5 w-3.5 group-hover:rotate-45 transition-transform" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-zinc-200 group-hover:text-amber-400 transition-colors truncate">
                  Cerchi il disco da collezione?
                </p>
                <p className="text-[9px] text-zinc-400 truncate">
                  DVD, Blu-ray & Steelbook su Amazon
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform shrink-0 pl-1">
              ↗
            </span>
          </a>
        </div>

        {/* Footer Fonte Dati JustWatch */}
        {streaming?.justWatchLink && (
          <div className="mt-2.5 pt-2 border-t border-zinc-900 flex items-center justify-between">
            <a
              href={streaming.justWatchLink}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1 text-[9px] text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              <span>Dati forniti da JustWatch</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
            <span className="text-[9px] text-zinc-600">Italia</span>
          </div>
        )}
      </div>
    );
  }

  // Render per il Banner Mobile (layout identico a IMDb)
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
        {streaming?.justWatchLink && (
          <a
            href={streaming.justWatchLink}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-[9px] font-bold text-zinc-500 hover:text-zinc-400 uppercase tracking-wider flex items-center gap-1"
          >
            <span>JustWatch IT</span>
            <ExternalLink className="h-2 w-2" />
          </a>
        )}
      </div>

      {/* Grid a 2 colonne in stile IMDb: STREAMING vs RENT/BUY */}
      <div className={`grid ${hasFlatrate && hasRentBuy ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
        {/* Colonna STREAMING */}
        {hasFlatrate && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Streaming
            </span>

            {flatrate.map((provider) => {
              const watchUrl = getPlatformWatchUrl(
                provider.name,
                filmTitle,
                amazonTag
              );
              const brand = getProviderBrandStyle(provider.name);
              const isPrime =
                provider.name.toLowerCase().includes("prime") ||
                provider.name.toLowerCase().includes("amazon");

              return (
                <a
                  key={provider.id}
                  href={watchUrl}
                  target="_blank"
                  rel={isPrime ? "sponsored noopener noreferrer" : "noopener noreferrer"}
                  className={`flex flex-col justify-between rounded-xl p-2.5 border transition-all text-left shadow-sm min-h-[72px] ${brand.container}`}
                >
                  <div className="flex items-center gap-2">
                    {provider.logoUrl ? (
                      <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-md border border-white/10">
                        <Image
                          src={provider.logoUrl}
                          alt={provider.name}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <Play className="h-4 w-4 fill-current text-white shrink-0" />
                    )}
                    <span className="text-xs font-black text-white truncate">
                      {isPrime ? "Prime Video" : provider.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/10">
                    <span className="text-[9px] font-bold text-zinc-300">
                      Incluso
                    </span>
                    <span className="text-[9px] font-black text-amber-400 flex items-center gap-0.5">
                      Avvia ↗
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* Colonna RENT / BUY */}
        {hasRentBuy && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">
              Noleggio / Acquisto
            </span>

            {rentOrBuy.map((provider) => {
              const watchUrl = getPlatformWatchUrl(
                provider.name,
                filmTitle,
                amazonTag
              );
              const brand = getProviderBrandStyle(provider.name);
              const isPrime =
                provider.name.toLowerCase().includes("prime") ||
                provider.name.toLowerCase().includes("amazon");

              return (
                <a
                  key={provider.id}
                  href={watchUrl}
                  target="_blank"
                  rel={isPrime ? "sponsored noopener noreferrer" : "noopener noreferrer"}
                  className={`flex flex-col justify-between rounded-xl p-2.5 border transition-all text-left shadow-sm min-h-[72px] ${brand.container}`}
                >
                  <div className="flex items-center gap-2">
                    {provider.logoUrl ? (
                      <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-md border border-white/10">
                        <Image
                          src={provider.logoUrl}
                          alt={provider.name}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <Play className="h-4 w-4 fill-current text-white shrink-0" />
                    )}
                    <span className="text-xs font-bold text-white truncate">
                      {isPrime ? "Prime Video" : provider.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/10">
                    <span className="text-[9px] font-medium text-zinc-400">
                      Store
                    </span>
                    <span className="text-[9px] font-bold text-zinc-300 flex items-center gap-0.5">
                      Apri ↗
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Avviso se non è presente in streaming */}
      {!hasAny && (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-2.5 text-center">
          <p className="text-[11px] text-zinc-400 leading-snug">
            Al momento non disponibile sui principali servizi di streaming in Italia.
          </p>
        </div>
      )}

      {/* Edizione Fisica Amazon */}
      <div className="mt-2 pt-2 border-t border-zinc-800/60">
        <a
          href={amazonUrl}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="flex items-center justify-between w-full rounded-xl bg-zinc-900/80 border border-zinc-800 px-2.5 py-1.5 text-[10px] text-zinc-300 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-1.5 truncate">
            <Disc3 className="h-3 w-3 text-amber-400 shrink-0" />
            <span className="truncate">Cerca Edizione Fisica (DVD / Blu-ray) su Amazon</span>
          </span>
          <span className="text-amber-400 shrink-0 pl-1 font-bold">↗</span>
        </a>
      </div>
    </div>
  );
}
