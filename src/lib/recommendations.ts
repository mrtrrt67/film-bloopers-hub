import { createPublicClient } from "@/lib/supabase/public";
import { Film } from "@/lib/types";

export interface ScoredFilm extends Film {
  bloopers_count?: number;
  trivia_count?: number;
  affinityScore?: number;
  recommendationReason?: string;
  reasons?: string[];
}

// Cache in-memory del catalogo per ridurre le chiamate al DB e garantire latenza zero (<1ms)
let cachedFilms: ScoredFilm[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minuti di persistenza in-memory

function normalize(str: string | null | undefined): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function parseList(str: string | null | undefined): string[] {
  if (!str) return [];
  return str
    .split(/[,/|]/)
    .map((s) => normalize(s))
    .filter((s) => s.length > 1);
}

const STOP_WORDS = new Set([
  "il", "lo", "la", "i", "gli", "le", "un", "uno", "una",
  "di", "a", "da", "in", "con", "su", "per", "tra", "fra",
  "e", "ed", "o", "del", "della", "dello", "dei", "degli", "delle",
  "parte", "capitolo", "episodio", "vol", "volume", "the", "of", "and"
]);

const GENERIC_TITLE_WORDS = new Set([
  "ritorno", "nuovo", "grande", "primo", "ultimo", "mondo", "casa",
  "notte", "amore", "uomo", "ragazzo", "citta", "storia", "vita",
  "tempo", "giorno", "anni", "via", "sole", "terra", "occhi", "cuore",
  "bene", "male", "fine", "inizio", "cose", "punto"
]);

function extractTitleKeywords(title: string | null | undefined): string[] {
  return normalize(title)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Rileva oggettivamente se due film appartengono alla stessa saga/franchise cinematografico.
 */
function isSaga(targetTitle: string, candTitle: string): boolean {
  const normTarget = normalize(targetTitle);
  const normCand = normalize(candTitle);

  // Prefisso base identico (es: "Rocky" vs "Rocky II", "Lo squalo" vs "Lo squalo 3")
  const regexSuffix = /\s+(ii|iii|iv|v|vi|vii|viii|ix|x|\d+|parte.*|chapter.*|reload.*|revolution.*)$/i;
  const baseTarget = normTarget.replace(regexSuffix, "").trim();
  const baseCand = normCand.replace(regexSuffix, "").trim();

  if (
    baseTarget.length >= 4 &&
    baseCand.length >= 4 &&
    (baseTarget === baseCand || baseTarget.startsWith(baseCand) || baseCand.startsWith(baseTarget))
  ) {
    return true;
  }

  const tWords = extractTitleKeywords(targetTitle);
  const cWords = extractTitleKeywords(candTitle);
  const shared = tWords.filter((w) => cWords.includes(w));

  if (shared.length >= 2) return true;
  if (shared.length === 1 && !GENERIC_TITLE_WORDS.has(shared[0]) && shared[0].length >= 5) {
    return true;
  }

  return false;
}

/**
 * Calcola l'indice di affinità oggettivo tra il film di riferimento e un film candidato.
 */
export function computeFilmAffinity(target: Film, candidate: ScoredFilm): {
  score: number;
  recommendationReason: string;
  reasons: string[];
} {
  let score = 0;
  let primaryReason = "";
  const reasons: string[] = [];

  // 1. SAGA / FRANCHISE CINEMATOGRAFICO (+80 punti)
  if (isSaga(target.titolo, candidate.titolo)) {
    score += 80;
    primaryReason = "Stessa saga";
    reasons.push("Stessa saga cinematografica");
  }

  // 2. STESSO REGISTA (+50 punti)
  if (target.regista && candidate.regista) {
    const tReg = normalize(target.regista);
    const cReg = normalize(candidate.regista);
    if (tReg === cReg || (tReg.length > 5 && cReg.includes(tReg)) || (cReg.length > 5 && tReg.includes(cReg))) {
      score += 50;
      if (!primaryReason) {
        primaryReason = `Regia: ${candidate.regista}`;
      }
      reasons.push(`Regia di ${candidate.regista}`);
    }
  }

  // 3. ATTORI / CAST IN COMUNE (+15 punti per attore, max 40 punti)
  const targetActors = parseList(target.attori);
  const candActors = parseList(candidate.attori);
  const sharedActors = targetActors.filter((a) =>
    candActors.some((ca) => ca.includes(a) || a.includes(ca))
  );

  if (sharedActors.length > 0) {
    const actorPoints = Math.min(sharedActors.length * 15, 40);
    score += actorPoints;
    if (!primaryReason) {
      const firstActor = (candidate.attori || "").split(",")[0].trim();
      primaryReason = sharedActors.length > 1 ? "Cast correlato" : `Con ${firstActor}`;
    }
    reasons.push(`${sharedActors.length} attori in comune`);
  }

  // 4. GENERI CONDIVISI (+10 punti per ogni genere affine)
  const targetGenres = parseList(target.genere);
  const candGenres = parseList(candidate.genere);
  const sharedGenres = targetGenres.filter((g) =>
    candGenres.some((cg) => cg.includes(g) || g.includes(cg))
  );

  if (sharedGenres.length > 0) {
    score += sharedGenres.length * 10;
    if (!primaryReason) {
      primaryReason = "Genere affine";
    }
    reasons.push(`${sharedGenres.length} generi in comune`);
  }

  // 5. PERIODO STORICO / ANNO DI USCITA (+5 pt entro 5 anni, +2 pt entro 10 anni)
  if (target.anno && candidate.anno) {
    const diff = Math.abs(Number(target.anno) - Number(candidate.anno));
    if (diff <= 5) {
      score += 5;
    } else if (diff <= 10) {
      score += 2;
    }
  }

  // 6. BONUS QUALITÀ & RICCHEZZA SCHEDA (+1 pt per bloopers, +1 pt per trivia)
  const bCount = candidate.bloopers_count ?? 0;
  const tCount = candidate.trivia_count ?? 0;
  if (bCount > 0) score += 1;
  if (tCount > 0) score += 1;

  if (!primaryReason) {
    primaryReason = "Consigliato per te";
  }

  return { score, recommendationReason: primaryReason, reasons };
}

/**
 * Recupera l'intero catalogo dei film con i conteggi bloopers e curiosità in una sola volta,
 * sfruttando una cache in-memory ad alte prestazioni.
 */
async function getCatalog(): Promise<ScoredFilm[]> {
  const now = Date.now();
  if (cachedFilms && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedFilms;
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("films")
    .select("id, titolo, anno, regista, genere, attori, slug, poster_url, backdrop_url, trama, creato_il, errori(count), movie_trivia(count)");

  if (error || !data) {
    console.error("Errore nel recupero catalogo film:", error);
    return cachedFilms || [];
  }

  cachedFilms = (data as any[]).map((f) => ({
    ...f,
    bloopers_count: f.errori?.[0]?.count ?? (Array.isArray(f.errori) ? f.errori.length : 0),
    trivia_count: f.movie_trivia?.[0]?.count ?? (Array.isArray(f.movie_trivia) ? f.movie_trivia.length : 0),
  }));

  lastCacheTime = now;
  return cachedFilms;
}

/**
 * Calcola e restituisce i film più affini e consigliati per un determinato film.
 * @param targetFilm Film attualmente visualizzato dall'utente
 * @param limit Numero di film da restituire (default 5)
 */
export async function getRelatedFilms(targetFilm: Film, limit = 5): Promise<ScoredFilm[]> {
  try {
    const catalog = await getCatalog();
    if (!catalog || catalog.length === 0) return [];

    // Esclude il film corrente
    const targetIdStr = String(targetFilm.id);
    const candidates = catalog.filter((f) => String(f.id) !== targetIdStr);

    // Calcola l'affinità oggettiva per ciascun film
    const scoredList: ScoredFilm[] = candidates.map((cand) => {
      const affinity = computeFilmAffinity(targetFilm, cand);
      return {
        ...cand,
        affinityScore: affinity.score,
        recommendationReason: affinity.recommendationReason,
        reasons: affinity.reasons,
      };
    });

    // Ordina per punteggio di affinità decrescente
    scoredList.sort((a, b) => (b.affinityScore || 0) - (a.affinityScore || 0));

    // Seleziona i primi `limit` film con punteggio positivo
    const relevantMatches = scoredList.filter((f) => (f.affinityScore || 0) > 0).slice(0, limit);

    // Se per qualche motivo ci sono meno film affini del limite (es. pellicola isolata senza genere/regista),
    // colma i rimanenti con i film più ricchi di bloopers/curiosità o più recenti
    if (relevantMatches.length < limit) {
      const existingIds = new Set(relevantMatches.map((r) => String(r.id)));
      const fallbackList = candidates
        .filter((c) => !existingIds.has(String(c.id)))
        .sort((a, b) => ((b.bloopers_count || 0) + (b.trivia_count || 0)) - ((a.bloopers_count || 0) + (a.trivia_count || 0)));

      for (const fallback of fallbackList) {
        if (relevantMatches.length >= limit) break;
        relevantMatches.push({
          ...fallback,
          recommendationReason: fallback.recommendationReason || "Dall'archivio",
        });
      }
    }

    return relevantMatches;
  } catch (err) {
    console.error("Errore nel calcolo dei film correlati:", err);
    return [];
  }
}

