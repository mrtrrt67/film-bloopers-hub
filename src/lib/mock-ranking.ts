export interface RankingProfile {
  id: string;
  email?: string | null;
  username: string;
  punti: number;
  tier?: string | null;
  tipo_abbonamento?: string | null;
  is_admin?: boolean;
  is_demo?: boolean;
}

/**
 * Profili dimostrativi della community con punteggi realistici e scaglionati.
 * I punteggi riflettono le regole del sito:
 * - 1° - 7°: Grado VIP (>= 50 pt, fino a ~210 pt)
 * - 8° - 12°: Grado Critico (20 - 49 pt)
 * - 13° - 15°: Grado Cacciatore (10 - 19 pt, nuovi membri con le prime segnalazioni approvate)
 */
export const SEED_RANKING_PROFILES: RankingProfile[] = [
  {
    id: "seed-user-1",
    username: "CineDetective_91",
    punti: 210,
    tier: "premium",
    tipo_abbonamento: "mensile",
    is_demo: true,
  },
  {
    id: "seed-user-2",
    username: "MovieBuff_Alex",
    punti: 175,
    tier: "premium",
    tipo_abbonamento: "mensile",
    is_demo: true,
  },
  {
    id: "seed-user-3",
    username: "RetroCinema",
    punti: 140,
    tier: "premium",
    tipo_abbonamento: "mensile",
    is_demo: true,
  },
  {
    id: "seed-user-4",
    username: "Elena_Film",
    punti: 115,
    tier: "premium",
    tipo_abbonamento: "mensile",
    is_demo: true,
  },
  {
    id: "seed-user-5",
    username: "MarcoVFX",
    punti: 90,
    tier: "premium",
    tipo_abbonamento: "mensile",
    is_demo: true,
  },
  {
    id: "seed-user-6",
    username: "FrameByFrame",
    punti: 75,
    tier: "premium",
    tipo_abbonamento: "mensile",
    is_demo: true,
  },
  {
    id: "seed-user-7",
    username: "BlooperHunter_IT",
    punti: 60,
    tier: "premium",
    tipo_abbonamento: "mensile",
    is_demo: true,
  },
  {
    id: "seed-user-8",
    username: "SarahScreens",
    punti: 45,
    tier: "free",
    tipo_abbonamento: "nessuno",
    is_demo: true,
  },
  {
    id: "seed-user-9",
    username: "TheCinemaEye",
    punti: 35,
    tier: "free",
    tipo_abbonamento: "nessuno",
    is_demo: true,
  },
  {
    id: "seed-user-10",
    username: "Luca_Bloopers",
    punti: 30,
    tier: "free",
    tipo_abbonamento: "nessuno",
    is_demo: true,
  },
  {
    id: "seed-user-11",
    username: "ReelSpotter",
    punti: 25,
    tier: "free",
    tipo_abbonamento: "nessuno",
    is_demo: true,
  },
  {
    id: "seed-user-12",
    username: "ClapperBoard88",
    punti: 20,
    tier: "free",
    tipo_abbonamento: "nessuno",
    is_demo: true,
  },
  {
    id: "seed-user-13",
    username: "Davide_Cut",
    punti: 15,
    tier: "free",
    tipo_abbonamento: "nessuno",
    is_demo: true,
  },
  {
    id: "seed-user-14",
    username: "KinoFan_DE",
    punti: 10,
    tier: "free",
    tipo_abbonamento: "nessuno",
    is_demo: true,
  },
  {
    id: "seed-user-15",
    username: "Sam_FilmGeek",
    punti: 10,
    tier: "free",
    tipo_abbonamento: "nessuno",
    is_demo: true,
  },
];

/**
 * Fonde in modo trasparente i profili reali del database con i profili dimostrativi.
 * - Esclude collisioni su username.
 * - Gli utenti reali con punti si inseriscono nella loro esatta posizione.
 * - In caso di parità di punteggio, l'utente reale ha precedenza rispetto al profilo dimostrativo.
 */
export function buildPublicRanking(
  realProfiles: RankingProfile[],
  currentUser: { id: string; email?: string | null } | null,
  options?: { enableSeed?: boolean; limit?: number }
): RankingProfile[] {
  const enableSeed = options?.enableSeed ?? true;
  const limit = options?.limit ?? 30;

  if (!enableSeed) {
    return realProfiles.slice(0, limit);
  }

  // Set di username/email reali per evitare collisioni visive
  const realKeys = new Set<string>();
  for (const p of realProfiles) {
    if (p.username) realKeys.add(p.username.toLowerCase());
    if (p.email) realKeys.add(p.email.toLowerCase().split("@")[0]);
  }

  const activeSeeds = SEED_RANKING_PROFILES.filter(
    (seed) => !realKeys.has(seed.username.toLowerCase())
  );

  const combined: RankingProfile[] = [...realProfiles, ...activeSeeds];

  // Ordina per punteggio decrescente
  combined.sort((a, b) => {
    const pA = a.punti || 0;
    const pB = b.punti || 0;
    if (pB !== pA) return pB - pA;
    if (a.is_demo && !b.is_demo) return 1;
    if (!a.is_demo && b.is_demo) return -1;
    return (a.username || "").localeCompare(b.username || "");
  });

  const sliced = combined.slice(0, limit);

  // Se l'utente collegato è un utente reale ma è finito oltre il limite (es. 0 pt),
  // lo includiamo in fondo così può sempre vedere la propria riga "(Tu)" e quanto manca per scalare
  if (currentUser && !sliced.some((p) => p.id === currentUser.id)) {
    const userProfile = combined.find((p) => p.id === currentUser.id);
    if (userProfile) {
      sliced.push(userProfile);
    }
  }

  return sliced;
}

