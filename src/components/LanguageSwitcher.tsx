"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useTranslation, Locale, LOCALES, LOCALE_DETAILS } from "@/i18n";

interface LanguageSwitcherProps {
  variant?: "desktop" | "mobile" | "compact";
  className?: string;
}

export default function LanguageSwitcher({
  variant = "desktop",
  className = "",
}: LanguageSwitcherProps) {
  const { locale, switchLocale, currentDetail } = useTranslation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Chiudi quando si clicca fuori
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
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
          <Globe className="h-3.5 w-3.5 text-zinc-500" />
          <span>Lingua / Language</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {LOCALES.map((l) => {
            const detail = LOCALE_DETAILS[l];
            const isActive = l === locale;
            return (
              <button
                key={l}
                type="button"
                onClick={() => switchLocale(l)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-xs transition-all ${
                  isActive
                    ? "bg-amber-500/15 border-amber-500/50 text-white font-bold shadow-sm"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
                title={detail.name}
              >
                <span className="text-base leading-none mb-1">{detail.flag}</span>
                <span className="text-[10px] uppercase font-mono tracking-wider">{detail.code}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-semibold transition-all ${
          open
            ? "border-amber-500/50 bg-zinc-900 text-white shadow-md ring-2 ring-amber-500/20"
            : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
        }`}
        aria-label="Seleziona lingua"
      >
        <span className="text-sm leading-none">{currentDetail.flag}</span>
        <span className="font-mono text-[11px] uppercase tracking-wider">{currentDetail.code}</span>
        <ChevronDown
          className={`h-3 w-3 text-zinc-400 transition-transform duration-200 ${
            open ? "rotate-180 text-amber-400" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-900 mb-1">
            Seleziona Lingua
          </div>
          <div className="space-y-0.5">
            {LOCALES.map((l) => {
              const detail = LOCALE_DETAILS[l];
              const isSelected = l === locale;
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    switchLocale(l);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors text-left ${
                    isSelected
                      ? "bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30"
                      : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{detail.flag}</span>
                    <span>{detail.name}</span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

