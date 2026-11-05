"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useTranslation, Locale, LOCALES } from "@/i18n/client";

interface LanguageSwitcherProps {
  variant?: "desktop" | "mobile" | "compact";
  className?: string;
}

export function FlagIcon({ locale, className = "h-4 w-4" }: { locale: Locale; className?: string }) {
  switch (locale) {
    case "it":
      return (
        <svg viewBox="0 0 640 480" className={className} aria-hidden="true">
          <g fillRule="evenodd">
            <path fill="#009246" d="M0 0h213.3v480H0z" />
            <path fill="#ffffff" d="M213.3 0h213.4v480H213.3z" />
            <path fill="#ce2b37" d="M426.7 0H640v480H426.7z" />
          </g>
        </svg>
      );
    case "en":
      return (
        <svg viewBox="0 0 640 480" className={className} aria-hidden="true">
          <path fill="#012169" d="M0 0h640v480H0z" />
          <path fill="#FFF" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-179L0 64V0h75z" />
          <path fill="#C8102E" d="m424 281 216 159v40L369 281h55zm-184-82L0 41V0l270 200h-30zm346-200L352 173v-27l178-132h56zM0 439l184-138v27L43 480H0v-41z" />
          <path fill="#FFF" d="M255 0h130v480H255zM0 175h640v130H0z" />
          <path fill="#C8102E" d="M280 0h80v480h-80zM0 200h640v80H0z" />
        </svg>
      );
    case "es":
      return (
        <svg viewBox="0 0 640 480" className={className} aria-hidden="true">
          <path fill="#aa151b" d="M0 0h640v120H0zM0 360h640v120H0z" />
          <path fill="#f1bf00" d="M0 120h640v240H0z" />
        </svg>
      );
    case "fr":
      return (
        <svg viewBox="0 0 640 480" className={className} aria-hidden="true">
          <g fillRule="evenodd">
            <path fill="#002654" d="M0 0h213.3v480H0z" />
            <path fill="#ffffff" d="M213.3 0h213.4v480H213.3z" />
            <path fill="#ce1126" d="M426.7 0H640v480H426.7z" />
          </g>
        </svg>
      );
    case "de":
      return (
        <svg viewBox="0 0 640 480" className={className} aria-hidden="true">
          <path fill="#000000" d="M0 0h640v160H0z" />
          <path fill="#dd0000" d="M0 160h640v160H0z" />
          <path fill="#ffce00" d="M0 320h640v160H0z" />
        </svg>
      );
  }
}

const NATIVE_NAMES: Record<Locale, { label: string; code: string; sub: string }> = {
  it: { label: "Italiano", code: "IT", sub: "Italia" },
  en: { label: "English", code: "EN", sub: "United Kingdom / Global" },
  es: { label: "Español", code: "ES", sub: "España" },
  fr: { label: "Français", code: "FR", sub: "France" },
  de: { label: "Deutsch", code: "DE", sub: "Deutschland" },
};

export default function LanguageSwitcher({
  variant = "desktop",
  className = "",
}: LanguageSwitcherProps) {
  const { locale, switchLocale } = useTranslation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (variant === "mobile") {
    return (
      <div className={`space-y-2.5 ${className}`}>
        <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 px-1">
          <span>Lingua / Language</span>
          <span className="text-[10px] uppercase font-mono text-amber-400/90 font-bold">
            {NATIVE_NAMES[locale]?.label}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {LOCALES.map((l) => {
            const info = NATIVE_NAMES[l];
            const isActive = l === locale;
            return (
              <button
                key={l}
                type="button"
                onClick={() => switchLocale(l)}
                className={`group flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl border transition-all ${
                  isActive
                    ? "bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30"
                    : "bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900"
                }`}
                title={info.label}
              >
                <div className="w-6 h-6 rounded-full overflow-hidden border border-white/20 shadow-md mb-1.5 shrink-0 transition-transform group-hover:scale-105">
                  <FlagIcon locale={l} className="w-full h-full object-cover" />
                </div>
                <span
                  className={`text-[11px] font-mono font-bold tracking-wider uppercase ${
                    isActive ? "text-amber-400" : "text-zinc-400 group-hover:text-zinc-200"
                  }`}
                >
                  {info.code}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const currentInfo = NATIVE_NAMES[locale] || NATIVE_NAMES.it;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`group flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 ${
          open
            ? "border-amber-500/50 bg-zinc-900 text-white shadow-lg shadow-amber-500/10 ring-2 ring-amber-500/20"
            : "border-zinc-800/80 bg-zinc-900/70 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
        }`}
        aria-label="Seleziona lingua"
      >
        <div className="w-5 h-5 rounded-full overflow-hidden border border-white/25 shadow-sm shrink-0 transition-transform group-hover:scale-105">
          <FlagIcon locale={locale} className="w-full h-full object-cover" />
        </div>
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-200">
          {currentInfo.code}
        </span>
        <ChevronDown
          className={`h-3 w-3 text-zinc-400 transition-transform duration-200 ${
            open ? "rotate-180 text-amber-400" : "group-hover:text-zinc-200"
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2.5 w-56 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-900/80 flex items-center justify-between">
            <span>Seleziona Lingua</span>
            <span className="text-amber-500/70 font-mono">5 Lingue</span>
          </div>
          <div className="space-y-1 pt-1">
            {LOCALES.map((l) => {
              const info = NATIVE_NAMES[l];
              const isSelected = l === locale;
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    switchLocale(l);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all text-left group ${
                    isSelected
                      ? "bg-amber-500/15 text-amber-300 font-bold border border-amber-500/40 shadow-sm"
                      : "text-zinc-300 hover:bg-zinc-900/90 hover:text-white border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-5 h-5 rounded-full overflow-hidden border border-white/20 shadow shrink-0 transition-transform group-hover:scale-105">
                      <FlagIcon locale={l} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-xs truncate leading-tight">
                        {info.label}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-normal leading-tight">
                        {info.sub}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex items-center justify-center h-5 w-5 rounded-full bg-amber-500/20 text-amber-400 shrink-0">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
