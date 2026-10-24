import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(titolo: string, anno?: string | number | null): string {
  if (!titolo) return "film";
  const base = titolo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  
  const annoStr = anno ? `-${String(anno).trim()}` : "";
  return `${base}${annoStr}`;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "Utente";
  const [username, domain] = email.split("@");
  if (username.length <= 2) return `${username}***@${domain}`;
  return `${username.slice(0, 2)}***@${domain}`;
}

export function calculateAttendibilita(conferme: number, contestazioni: number) {
  const tot = conferme + contestazioni;
  if (tot === 0) {
    return {
      percent: 100,
      badge: "neutro" as const,
      text: "Da Verificare",
      color: "text-gray-400 bg-gray-800/60 border-gray-700",
    };
  }

  const percent = Math.round((conferme / tot) * 100);

  if (percent >= 70 && conferme >= 2) {
    return {
      percent,
      badge: "verificato" as const,
      text: "Verificato ✅",
      color: "text-emerald-400 bg-emerald-950/40 border-emerald-800/60",
    };
  }

  if (percent < 40 && contestazioni >= 2) {
    return {
      percent,
      badge: "contestato" as const,
      text: "Contestato ⚠️",
      color: "text-amber-400 bg-amber-950/40 border-amber-800/60",
    };
  }

  return {
    percent,
    badge: "neutro" as const,
    text: "In Valutazione",
    color: "text-blue-400 bg-blue-950/40 border-blue-800/60",
  };
}

export function getRankInfo(punti: number, sogliaMensile = 50, sogliaLifetime = 10000) {
  if (punti >= sogliaLifetime) {
    return {
      grado: "Leggenda",
      icon: "👑",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      prossimoTraguardo: null,
      puntiMancanti: 0,
    };
  }
  if (punti >= sogliaMensile) {
    return {
      grado: "VIP",
      icon: "⭐",
      badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
      prossimoTraguardo: "Leggenda",
      puntiMancanti: sogliaLifetime - punti,
    };
  }
  if (punti >= 20) {
    return {
      grado: "Critico",
      icon: "🎬",
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40",
      prossimoTraguardo: "VIP",
      puntiMancanti: sogliaMensile - punti,
    };
  }
  return {
    grado: "Cacciatore",
    icon: "🔍",
    badgeColor: "bg-zinc-800 text-zinc-300 border-zinc-700",
    prossimoTraguardo: "Critico",
    puntiMancanti: 20 - punti,
  };
}

export function replacePlaceholders(text: string, vars: Record<string, string | number>): string {
  if (!text) return "";
  let out = text;
  for (const [key, val] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${key}\\}`, "g"), String(val));
  }
  return out;
}

export function getAmazonSearchUrl(titolo: string, anno?: string | number | null, tag = "filmbloopers-21"): string {
  const query = encodeURIComponent(`${titolo} ${anno || ""}`.trim());
  return `https://www.amazon.it/s?k=${query}&tag=${tag}`;
}

export function getYouTubeSearchUrl(titolo: string): string {
  const query = encodeURIComponent(`${titolo} movie mistakes bloopers`);
  return `https://www.youtube.com/results?search_query=${query}`;
}
