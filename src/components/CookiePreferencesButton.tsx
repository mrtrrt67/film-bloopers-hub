"use client";

import { Cookie } from "lucide-react";

interface CookiePreferencesButtonProps {
  className?: string;
  variant?: "link" | "button";
}

export default function CookiePreferencesButton({
  className = "",
  variant = "link",
}: CookiePreferencesButtonProps) {
  const handleClick = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("open-cookie-banner"));
    }
  };

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={
          className ||
          "inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-zinc-950 transition active:scale-95 shadow-md shadow-amber-500/20"
        }
      >
        <Cookie className="h-4 w-4" />
        <span>Gestisci preferenze cookie</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ||
        "hover:text-amber-400 transition-colors flex items-center gap-1.5 text-xs text-left text-zinc-400"
      }
    >
      <span>Gestisci Cookie</span>
    </button>
  );
}

