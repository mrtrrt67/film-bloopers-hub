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

export function formatPublicAuthor(
  inseritoDa?: string | null,
  provenienza?: string | null
): string {
  // 1. Se generato dall'IA o inserito dal sistema, NON mostrare mai l'email dell'admin
  if (
    provenienza === "ia" ||
    !inseritoDa ||
    inseritoDa.toLowerCase().includes("ia") ||
    inseritoDa.toLowerCase().includes("sistema") ||
    inseritoDa.toLowerCase().includes("gemini")
  ) {
    return "IA (FilmBloopers Hub)";
  }

  const clean = inseritoDa.trim();

  // 2. Se è un'email, per privacy e rispetto GDPR NON mostrare mai il dominio né l'indirizzo per esteso
  if (clean.includes("@")) {
    const [name] = clean.split("@");
    return `@${name}`;
  }

  // 3. Se è già uno username personalizzato
  return clean.startsWith("@") ? clean : `@${clean}`;
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

export function getRankInfo(
  punti: number,
  tier?: string | null,
  tipoAbbonamento?: string | null,
  sogliaMensile = 50,
  sogliaLifetime = 10000
) {
  const isLifetime = tipoAbbonamento === "lifetime" || punti >= sogliaLifetime;
  const isPremiumSub = tier === "premium" || tipoAbbonamento === "mensile" || tipoAbbonamento === "annuale";

  if (isLifetime) {
    return {
      grado: "Leggenda",
      icon: "👑",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      prossimoTraguardo: null,
      puntiMancanti: 0,
      isVip: true,
      isLifetime: true,
    };
  }

  if (isPremiumSub || punti >= sogliaMensile) {
    return {
      grado: "VIP",
      icon: "⭐",
      badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
      prossimoTraguardo: "Leggenda",
      puntiMancanti: Math.max(0, sogliaLifetime - punti),
      isVip: true,
      isLifetime: false,
    };
  }

  if (punti >= 20) {
    return {
      grado: "Critico",
      icon: "🎬",
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40",
      prossimoTraguardo: "VIP",
      puntiMancanti: Math.max(0, sogliaMensile - punti),
      isVip: false,
      isLifetime: false,
    };
  }

  return {
    grado: "Cacciatore",
    icon: "🔍",
    badgeColor: "bg-zinc-800 text-zinc-300 border-zinc-700",
    prossimoTraguardo: "Critico",
    puntiMancanti: Math.max(0, 20 - punti),
    isVip: false,
    isLifetime: false,
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

export function getAmazonSearchUrl(titolo: string, anno?: string | number | null, tag?: string): string {
  const affiliateTag = tag || process.env.NEXT_PUBLIC_AMAZON_TAG || process.env.AMAZON_AFFILIATE_TAG || "filmbloopers-21";
  const query = encodeURIComponent(`${titolo} ${anno || ""}`.trim());
  return `https://www.amazon.it/s?k=${query}&tag=${affiliateTag}`;
}

export function getYouTubeSearchUrl(titolo: string): string {
  const query = encodeURIComponent(`${titolo} movie mistakes bloopers`);
  return `https://www.youtube.com/results?search_query=${query}`;
}

export function formatDateItalian(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";

  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    // Match YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const year = isoMatch[1];
      const monthNum = parseInt(isoMatch[2], 10);
      const day = parseInt(isoMatch[3], 10);
      const months = [
        "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
        "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"
      ];
      if (monthNum >= 1 && monthNum <= 12) {
        return `${day} ${months[monthNum - 1]} ${year}`;
      }
      return `${day.toString().padStart(2, "0")}/${monthNum.toString().padStart(2, "0")}/${year}`;
    }

    // Match DD/MM/YYYY or DD-MM-YYYY
    const itMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (itMatch) {
      const day = parseInt(itMatch[1], 10);
      const monthNum = parseInt(itMatch[2], 10);
      const year = itMatch[3];
      const months = [
        "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
        "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"
      ];
      if (monthNum >= 1 && monthNum <= 12) {
        return `${day} ${months[monthNum - 1]} ${year}`;
      }
      return `${day.toString().padStart(2, "0")}/${monthNum.toString().padStart(2, "0")}/${year}`;
    }
  }

  try {
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("it-IT", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  } catch {}

  return String(dateInput);
}

export function formatHighlightedDateItalian(dateInput: string | Date | null | undefined): string {
  const formatted = formatDateItalian(dateInput);
  if (!formatted) return "";
  return `<strong class="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black shadow-sm mx-1 tracking-normal">${formatted}</strong>`;
}

