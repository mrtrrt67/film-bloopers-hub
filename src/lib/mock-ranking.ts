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

interface SeedConfig {
  id: string;
  username: string;
  basePunti: number;
  tier?: string;
  tipo_abbonamento?: string;
  /** Ogni quanti giorni questo utente invia una segnalazione/blooper approvata (+10 pt) */
  blooperCadenceDays: number;
  /** Sfasamento per non far accumulare punti a tutti nello stesso giorno */
  blooperOffsetDays: number;
  /** Ogni quanti giorni riceve un voto positivo 👍 (+1 pt) */
  voteCadenceDays: number;
  voteOffsetDays: number;
}

/** Data di riferimento di inizio simulazione (14 Novembre 2026 UTC) */
const REFERENCE_DATE_MS = Date.UTC(2026, 10, 14); // Mese 10 = Novembre

/**
 * Profili dimostrativi della community con pattern di attività realistici.
 * Nel corso dei giorni e delle settimane, vari membri guadagnano periodicamente
 * +10 pt (blooper approvato) o +1 pt (voto utile ricevuto), muovendo gradualmente
 * la classifica e scambiandosi talvolta di posizione.
 */
const SEED_CONFIGS: SeedConfig[] = [
  {
    id: "seed-user-1",
    username: "CineDetective_91",
    basePunti: 210,
    tier: "premium",
    tipo_abbonamento: "mensile",
    blooperCadenceDays: 12,
    blooperOffsetDays: 7,
    voteCadenceDays: 4,
    voteOffsetDays: 1,
  },
  {
    id: "seed-user-2",
    username: "MovieBuff_Alex",
    basePunti: 175,
    tier: "premium",
    tipo_abbonamento: "mensile",
    blooperCadenceDays: 10,
    blooperOffsetDays: 3,
    voteCadenceDays: 3,
    voteOffsetDays: 2,
  },
  {
    id: "seed-user-3",
    username: "RetroCinema",
    basePunti: 140,
    tier: "premium",
    tipo_abbonamento: "mensile",
    blooperCadenceDays: 14,
    blooperOffsetDays: 5,
    voteCadenceDays: 5,
    voteOffsetDays: 3,
  },
  {
    id: "seed-user-4",
    username: "Elena_Film",
    basePunti: 115,
    tier: "premium",
    tipo_abbonamento: "mensile",
    blooperCadenceDays: 8,
    blooperOffsetDays: 7, // Sale già domani (+10 pt)
    voteCadenceDays: 3,
    voteOffsetDays: 1,
  },
  {
    id: "seed-user-5",
    username: "MarcoVFX",
    basePunti: 90,
    tier: "premium",
    tipo_abbonamento: "mensile",
    blooperCadenceDays: 11,
    blooperOffsetDays: 4,
    voteCadenceDays: 4,
    voteOffsetDays: 2,
  },
  {
    id: "seed-user-6",
    username: "FrameByFrame",
    basePunti: 75,
    tier: "premium",
    tipo_abbonamento: "mensile",
    blooperCadenceDays: 13,
    blooperOffsetDays: 8,
    voteCadenceDays: 5,
    voteOffsetDays: 4,
  },
  {
    id: "seed-user-7",
    username: "BlooperHunter_IT",
    basePunti: 60,
    tier: "premium",
    tipo_abbonamento: "mensile",
    blooperCadenceDays: 9,
    blooperOffsetDays: 2,
    voteCadenceDays: 4,
    voteOffsetDays: 3,
  },
  {
    id: "seed-user-8",
    username: "SarahScreens",
    basePunti: 45,
    tier: "free",
    tipo_abbonamento: "nessuno",
    blooperCadenceDays: 7,
    blooperOffsetDays: 3, // Raggiungerà presto i 50 pt e diventerà VIP
    voteCadenceDays: 3,
    voteOffsetDays: 2, // Riceve +1 pt domani
  },
  {
    id: "seed-user-9",
    username: "TheCinemaEye",
    basePunti: 35,
    tier: "free",
    tipo_abbonamento: "nessuno",
    blooperCadenceDays: 15,
    blooperOffsetDays: 6,
    voteCadenceDays: 6,
    voteOffsetDays: 2,
  },
  {
    id: "seed-user-10",
    username: "Luca_Bloopers",
    basePunti: 30,
    tier: "free",
    tipo_abbonamento: "nessuno",
    blooperCadenceDays: 11,
    blooperOffsetDays: 5,
    voteCadenceDays: 5,
    voteOffsetDays: 1,
  },
  {
    id: "seed-user-11",
    username: "ReelSpotter",
    basePunti: 25,
    tier: "free",
    tipo_abbonamento: "nessuno",
    blooperCadenceDays: 13,
    blooperOffsetDays: 9,
    voteCadenceDays: 6,
    voteOffsetDays: 4,
  },
  {
    id: "seed-user-12",
    username: "ClapperBoard88",
    basePunti: 20,
    tier: "free",
    tipo_abbonamento: "nessuno",
    blooperCadenceDays: 15,
    blooperOffsetDays: 11,
    voteCadenceDays: 7,
    voteOffsetDays: 3,
  },
  {
    id: "seed-user-13",
    username: "Davide_Cut",
    basePunti: 15,
    tier: "free",
    tipo_abbonamento: "nessuno",
    blooperCadenceDays: 8,
    blooperOffsetDays: 5,
    voteCadenceDays: 5,
    voteOffsetDays: 2,
  },
  {
    id: "seed-user-14",
    username: "KinoFan_DE",
    basePunti: 10,
    tier: "free",
    tipo_abbonamento: "nessuno",
    blooperCadenceDays: 16,
    blooperOffsetDays: 7,
    voteCadenceDays: 8,
    voteOffsetDays: 4,
  },
  {
    id: "seed-user-15",
    username: "Sam_FilmGeek",
    basePunti: 10,
    tier: "free",
    tipo_abbonamento: "nessuno",
    blooperCadenceDays: 6,
    blooperOffsetDays: 4, // Molto attivo, farà il salto a 20 pt (Critico)
    voteCadenceDays: 4,
    voteOffsetDays: 1,
  },
];

/**
 * Calcola i profili dimostrativi con punteggio dinamico in base al giorno corrente.
 * Il calcolo è deterministico: durante la stessa giornata i numeri rimangono
 * perfettamente stabili senza sfarfallii ad ogni refresh, ma con il passare dei
 * giorni alcuni membri aumentano naturalmente di punteggio.
 */
export function getDynamicSeedProfiles(targetDate: Date = new Date()): RankingProfile[] {
  const currentUtcMs = Date.UTC(
    targetDate.getUTCFullYear(),
    targetDate.getUTCMonth(),
    targetDate.getUTCDate()
  );

  const daysPassed = Math.max(0, Math.floor((currentUtcMs - REFERENCE_DATE_MS) / (1000 * 60 * 60 * 24)));

  return SEED_CONFIGS.map((seed) => {
    // Quanti bloopers (+10 pt) sono stati aggiunti dal giorno di riferimento
    const bloopersAdded = Math.max(
      0,
      Math.floor((daysPassed + seed.blooperOffsetDays) / seed.blooperCadenceDays) -
        Math.floor(seed.blooperOffsetDays / seed.blooperCadenceDays)
    );

    // Quanti voti 👍 (+1 pt) sono stati ricevuti
    const votesAdded = Math.max(
      0,
      Math.floor((daysPassed + seed.voteOffsetDays) / seed.voteCadenceDays) -
        Math.floor(seed.voteOffsetDays / seed.voteCadenceDays)
    );

    const punti = seed.basePunti + bloopersAdded * 10 + votesAdded;

    // Se un utente raggiunge o supera la soglia di 50 pt (VIP), aggiorna il grado
    const isVip = punti >= 50;
    const tier = isVip ? "premium" : (seed.tier || "free");
    const tipo_abbonamento = isVip ? "mensile" : (seed.tipo_abbonamento || "nessuno");

    return {
      id: seed.id,
      username: seed.username,
      punti,
      tier,
      tipo_abbonamento,
      is_demo: true,
    };
  });
}

/**
 * Fonde in modo trasparente i profili reali del database con i profili dimostrativi dinamici.
 * - Esclude collisioni su username.
 * - Gli utenti reali con punti si inseriscono nella loro esatta posizione.
 * - In caso di parità di punteggio, l'utente reale ha precedenza rispetto al profilo dimostrativo.
 */
export function buildPublicRanking(
  realProfiles: RankingProfile[],
  currentUser: { id: string; email?: string | null } | null,
  options?: { enableSeed?: boolean; limit?: number; referenceDate?: Date }
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

  const dynamicSeeds = getDynamicSeedProfiles(options?.referenceDate);
  const activeSeeds = dynamicSeeds.filter(
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
