import React from "react";
import Image from "next/image";
import { FilmStreamingInfo } from "@/lib/types";
import { Tv, ShoppingCart, Play, ExternalLink, Sparkles, CheckCircle2 } from "lucide-react";

interface StreamingAvailabilityCardProps {
  streaming?: FilmStreamingInfo | null;
  amazonUrl: string;
  filmTitle: string;
  variant?: "sidebar" | "banner";
}

export function StreamingAvailabilityCard({
  streaming,
  amazonUrl,
  filmTitle,
  variant = "sidebar",
}: StreamingAvailabilityCardProps) {
  const isOnPrime = Boolean(streaming?.isOnPrimeVideo);
  const isPrimeFlatrate = Boolean(streaming?.isPrimeFlatrate);
  const isPrimeRentBuy = Boolean(streaming?.isPrimeRentBuy);

  // Filtra i servizi in abbonamento escludendo Amazon (che ha la hero CTA dedicata)
  const otherFlatrate = (streaming?.flatrate || []).filter(
    (p) =>
      !p.name.toLowerCase().includes("prime") &&
      !p.name.toLowerCase().includes("amazon")
  );

  // Filtra i servizi a noleggio / acquisto escludendo Amazon
  const otherRentBuy = (streaming?.rentOrBuy || []).filter(
    (p) =>
      !p.name.toLowerCase().includes("prime") &&
      !p.name.toLowerCase().includes("amazon") &&
      !otherFlatrate.some((f) => f.id === p.id)
  );

  const hasAnyStreaming =
    isOnPrime || otherFlatrate.length > 0 || otherRentBuy.length > 0;

  // Render per Sidebar Desktop
  if (variant === "sidebar") {
    return (
      <div className="w-full rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-3.5 shadow-xl backdrop-blur-sm">
        {/* Intestazione Sezione */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Tv className="h-3.5 w-3.5" />
            </span>
            <div>
              <h3 className="text-xs font-black text-white tracking-tight uppercase">
                Dove Vederlo
              </h3>
              <p className="text-[10px] text-zinc-400 font-medium">
                Disponibilità in Italia
              </p>
            </div>
          </div>
          {streaming?.justWatchLink && (
            <span className="rounded-md bg-zinc-800/80 border border-zinc-700/60 px-1.5 py-0.5 text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
              Streaming IT
            </span>
          )}
        </div>

        {/* CTA Hero Amazon First */}
        <a
          href={amazonUrl}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className={`group relative flex flex-col gap-1 w-full rounded-xl p-3 text-left transition-all shadow-md ${
            isOnPrime
              ? "bg-gradient-to-br from-[#00A8E1]/20 via-zinc-900 to-amber-500/10 border border-[#00A8E1]/50 hover:border-[#00A8E1] hover:shadow-[#00A8E1]/20 hover:shadow-lg"
              : "bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-amber-500/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider">
              {isOnPrime ? (
                <>
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#00A8E1] text-zinc-950">
                    <Play className="h-3 w-3 fill-zinc-950" />
                  </span>
                  <span className="text-[#00A8E1] font-extrabold">Prime Video</span>
                </>
              ) : (
                <>
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500 text-zinc-950">
                    <ShoppingCart className="h-3 w-3" />
                  </span>
                  <span className="text-amber-400">Amazon</span>
                </>
              )}
            </span>

            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                isOnPrime
                  ? isPrimeFlatrate
                    ? "bg-emerald-950/80 text-emerald-400 border border-emerald-700/50"
                    : "bg-[#00A8E1]/20 text-[#00A8E1] border border-[#00A8E1]/40"
                  : "bg-zinc-800 text-zinc-300 border border-zinc-700"
              }`}
            >
              {isOnPrime
                ? isPrimeFlatrate
                  ? "Incluso con Prime"
                  : "Noleggio / Acquisto"
                : "Edizione Fisica"}
            </span>
          </div>

          <div className="mt-1">
            <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
              {isOnPrime
                ? isPrimeFlatrate
                  ? "Guarda su Prime Video"
                  : "Disponibile su Prime Video"
                : "Cerca Edizione su Amazon"}
            </p>
            <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">
              {isOnPrime
                ? isPrimeFlatrate
                  ? "Incluso per tutti gli iscritti Amazon Prime"
                  : "Disponibile subito in streaming ad alta definizione"
                : "Trova DVD, Blu-ray & Steelbook 4K da collezione"}
            </p>
          </div>
        </a>

        {/* Piattaforme in Abbonamento Esterne (Paramount+, Netflix, Disney+, etc.) */}
        {otherFlatrate.length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-800/80">
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                Incluso con abbonamento su:
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {otherFlatrate.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-1 text-xs text-zinc-200 shadow-sm"
                  title={`Disponibile con abbonamento su ${provider.name}`}
                >
                  {provider.logoUrl ? (
                    <Image
                      src={provider.logoUrl}
                      alt={provider.name}
                      width={18}
                      height={18}
                      unoptimized
                      className="rounded-md object-cover shrink-0"
                    />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  )}
                  <span className="text-[11px] font-medium text-zinc-300 truncate max-w-[120px]">
                    {provider.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Noleggio / Acquisto alternativo se non c'è abbonamento */}
        {otherFlatrate.length === 0 && otherRentBuy.length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-800/80">
            <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Disponibile a noleggio su:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {otherRentBuy.slice(0, 4).map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-1 text-xs text-zinc-300"
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
                  <span className="text-[10px] font-medium text-zinc-300 truncate max-w-[110px]">
                    {provider.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Avviso Nessun Catalogo Attivo */}
        {!hasAnyStreaming && (
          <div className="mt-3 pt-2.5 border-t border-zinc-800/80">
            <p className="text-[10px] text-zinc-400 leading-snug">
              Attualmente non segnalato sui cataloghi streaming in Italia. Puoi trovare la copia fisica su Amazon.
            </p>
          </div>
        )}

        {/* Footer JustWatch Attribution */}
        {streaming?.justWatchLink && (
          <div className="mt-2.5 pt-2 border-t border-zinc-900 flex items-center justify-between">
            <a
              href={streaming.justWatchLink}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1 text-[9px] text-zinc-500 hover:text-zinc-400 transition-colors"
            >
              <span>Fonte dati JustWatch</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
            <span className="text-[9px] text-zinc-600">Aggiornato</span>
          </div>
        )}
      </div>
    );
  }

  // Render per Mobile Banner
  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-3 shadow-lg">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Tv className="h-3 w-3" />
          </span>
          <span className="text-xs font-black text-white uppercase tracking-tight">
            Dove Vederlo in Streaming
          </span>
        </div>
        {streaming?.justWatchLink && (
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
            Italia
          </span>
        )}
      </div>

      {/* Hero Amazon CTA Mobile */}
      <a
        href={amazonUrl}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className={`group relative flex items-center justify-between w-full rounded-xl p-2.5 text-left transition-all ${
          isOnPrime
            ? "bg-gradient-to-r from-[#00A8E1]/20 via-zinc-900 to-amber-500/10 border border-[#00A8E1]/50 shadow-md"
            : "bg-zinc-900 border border-zinc-800 hover:border-amber-500/50"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              isOnPrime ? "bg-[#00A8E1] text-zinc-950" : "bg-amber-500 text-zinc-950"
            }`}
          >
            {isOnPrime ? (
              <Play className="h-4 w-4 fill-zinc-950" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white truncate">
                {isOnPrime
                  ? isPrimeFlatrate
                    ? "Guarda su Prime Video"
                    : "Disponibile su Prime Video"
                  : "Trova Edizione su Amazon"}
              </span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[8px] font-black uppercase ${
                  isOnPrime
                    ? isPrimeFlatrate
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                      : "bg-[#00A8E1]/20 text-[#00A8E1] border border-[#00A8E1]/40"
                    : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                }`}
              >
                {isOnPrime
                  ? isPrimeFlatrate
                    ? "Incluso"
                    : "Streaming"
                  : "DVD/Blu-ray"}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 truncate">
              {isOnPrime
                ? isPrimeFlatrate
                  ? "Incluso con il tuo abbonamento Prime"
                  : "Disponibile a noleggio o acquisto digitale"
                : "DVD, Blu-ray e 4K Steelbook da collezione"}
            </p>
          </div>
        </div>

        <div className="shrink-0 pl-2">
          <span className="inline-flex items-center justify-center h-6 px-2 rounded-lg bg-zinc-800/80 border border-zinc-700/80 text-[10px] font-bold text-amber-400 group-hover:text-amber-300">
            Apri ↗
          </span>
        </div>
      </a>

      {/* Altre piattaforme streaming flatrate su Mobile */}
      {otherFlatrate.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-zinc-800/60">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
            <span>Disponibile anche con abbonamento:</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {otherFlatrate.map((provider) => (
              <div
                key={provider.id}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-850/80 border border-zinc-700/60 px-2 py-1 text-[11px] text-zinc-200 shadow-sm"
              >
                {provider.logoUrl ? (
                  <Image
                    src={provider.logoUrl}
                    alt={provider.name}
                    width={16}
                    height={16}
                    unoptimized
                    className="rounded-md object-cover shrink-0"
                  />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                )}
                <span className="font-semibold text-zinc-200 truncate max-w-[110px]">
                  {provider.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Se non c'è abbonamento ma solo rent/buy */}
      {otherFlatrate.length === 0 && otherRentBuy.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-zinc-800/60">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
            Disponibile anche a noleggio su:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {otherRentBuy.slice(0, 4).map((provider) => (
              <div
                key={provider.id}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-850/80 border border-zinc-700/60 px-2 py-1 text-[10px] text-zinc-300"
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
                <span className="truncate max-w-[90px]">{provider.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

