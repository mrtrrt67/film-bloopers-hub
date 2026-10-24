import { TMDBMovieDetails, TMDBMovieResult } from "./types";

const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

function getApiKey(): string {
  return process.env.TMDB_API_KEY || "";
}

export function getTMDBImageUrl(path?: string | null, size: "w342" | "w500" | "w780" | "original" = "w500"): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export async function searchTMDBMovies(query: string, year?: string | number, page = 1): Promise<TMDBMovieResult[]> {
  const apiKey = getApiKey();
  if (!apiKey || !query.trim()) return [];

  try {
    let url = `${TMDB_API_BASE}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
      query.trim()
    )}&language=it-IT&page=${page}&include_adult=false`;

    if (year) {
      url += `&year=${year}`;
    }

    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];

    const data = await res.json();
    return (data.results || []) as TMDBMovieResult[];
  } catch (err) {
    console.error("Errore ricerca TMDB:", err);
    return [];
  }
}

export async function getTMDBMovieDetails(tmdbId: number): Promise<TMDBMovieDetails | null> {
  const apiKey = getApiKey();
  if (!apiKey || !tmdbId) return null;

  try {
    const url = `${TMDB_API_BASE}/movie/${tmdbId}?api_key=${apiKey}&append_to_response=credits,keywords&language=it-IT`;
    let res = await fetch(url, { next: { revalidate: 86400 } });

    if (!res.ok) return null;
    let data = (await res.json()) as TMDBMovieDetails;

    // Se la trama in italiano non è presente, fallback in inglese
    if (!data.overview || data.overview.trim() === "") {
      const urlEn = `${TMDB_API_BASE}/movie/${tmdbId}?api_key=${apiKey}&language=en-US`;
      const resEn = await fetch(urlEn, { next: { revalidate: 86400 } });
      if (resEn.ok) {
        const dataEn = await resEn.json();
        data.overview = dataEn.overview;
      }
    }

    return data;
  } catch (err) {
    console.error("Errore dettaglio TMDB:", err);
    return null;
  }
}

export async function getTMDBCollection(collectionId: number) {
  const apiKey = getApiKey();
  if (!apiKey || !collectionId) return null;

  try {
    const url = `${TMDB_API_BASE}/collection/${collectionId}?api_key=${apiKey}&language=it-IT`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;

    const data = await res.json();
    const parts = (data.parts || []) as TMDBMovieResult[];
    
    // Ordina i film della saga per data di uscita
    parts.sort((a, b) => {
      const yearA = parseInt(a.release_date?.substring(0, 4) || "0", 10);
      const yearB = parseInt(b.release_date?.substring(0, 4) || "0", 10);
      return yearA - yearB;
    });

    return {
      id: data.id,
      name: data.name,
      overview: data.overview,
      poster_path: data.poster_path,
      parts,
    };
  } catch (err) {
    console.error("Errore collezione TMDB:", err);
    return null;
  }
}

export function formatCredits(details: TMDBMovieDetails) {
  const crew = details.credits?.crew || [];
  const cast = details.credits?.cast || [];

  const director = crew.find((c) => c.job === "Director")?.name || "N/D";
  const topActors = cast.slice(0, 7).map((a) => a.name).join(", ") || "N/D";
  const genres = (details.genres || []).map((g) => g.name).join(", ") || "N/D";

  return {
    regista: director,
    attori: topActors,
    genere: genres,
    trama: details.overview || "Trama non disponibile.",
    poster_url: getTMDBImageUrl(details.poster_path, "w500"),
    backdrop_url: getTMDBImageUrl(details.backdrop_path, "original"),
    tmdb_collection_id: details.belongs_to_collection?.id || null,
  };
}

function normalizeTitle(str?: string | null): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function scoreMovieMatch(
  targetTitle: string,
  targetYear: string | undefined,
  cand: TMDBMovieResult
): number {
  const normTarget = normalizeTitle(targetTitle);
  const candTitle = normalizeTitle(cand.title);
  const candOrig = normalizeTitle(cand.original_title);

  let score = 0;

  // Corrispondenza esatta
  if (candTitle === normTarget || candOrig === normTarget) {
    score += 100;
  } else {
    const targetWords = normTarget.split(" ").filter(Boolean);
    const candWords = candTitle.split(" ").filter(Boolean);
    const candOrigWords = candOrig.split(" ").filter(Boolean);

    const matchItalian = targetWords.filter((w) => candWords.includes(w)).length;
    const matchOrig = targetWords.filter((w) => candOrigWords.includes(w)).length;
    const maxMatch = Math.max(matchItalian, matchOrig);

    if (maxMatch === targetWords.length && targetWords.length > 0) {
      score += 50;
      // Penalità se ci sono troppe parole aggiuntive (es. "La fine di Oak Street" vs "Oak Street")
      const extraWords = Math.abs(candWords.length - targetWords.length);
      score -= Math.min(extraWords * 15, 45);
    } else {
      score += (maxMatch / Math.max(targetWords.length, 1)) * 35;
    }
  }

  // Corrispondenza anno di uscita
  if (targetYear && cand.release_date) {
    const candYear = parseInt(cand.release_date.slice(0, 4), 10);
    const tYear = parseInt(targetYear, 10);
    if (!isNaN(candYear) && !isNaN(tYear)) {
      const diff = Math.abs(candYear - tYear);
      if (diff === 0) score += 40;
      else if (diff === 1) score += 20;
      else if (diff >= 3) score -= 40;
    }
  }

  return Math.round(score);
}

export interface TMDBCandidateResult {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  poster_url: string | null;
  backdrop_url: string | null;
  overview: string;
  score?: number;
}

export async function searchTMDBMovieCandidates(
  query: string,
  year?: string | number
): Promise<TMDBCandidateResult[]> {
  const cleanYear = year ? String(year).trim().slice(0, 4) : undefined;
  const results = await searchTMDBMovies(query, cleanYear);

  // Se con anno non trova nulla, prova senza anno
  let finalResults = results;
  if ((!finalResults || finalResults.length === 0) && cleanYear) {
    finalResults = await searchTMDBMovies(query);
  }

  return (finalResults || []).map((item) => ({
    id: item.id,
    title: item.title,
    original_title: item.original_title,
    release_date: item.release_date || "",
    poster_url: getTMDBImageUrl(item.poster_path, "w500"),
    backdrop_url: getTMDBImageUrl(item.backdrop_path, "original"),
    overview: item.overview || "",
    score: scoreMovieMatch(query, cleanYear, item),
  }));
}

export async function fetchPosterForMovie(
  titolo: string,
  anno?: string | number | null
): Promise<{ poster_url: string | null; backdrop_url: string | null; candidate?: TMDBCandidateResult }> {
  if (!titolo) return { poster_url: null, backdrop_url: null };

  const candidates: string[] = [];
  candidates.push(titolo);

  const cleanedParens = titolo.replace(/\s*\([^)]*\)/g, "").trim();
  if (cleanedParens && !candidates.includes(cleanedParens)) {
    candidates.push(cleanedParens);
  }

  const beforeDash = cleanedParens.split(/[-–:—]/)[0].trim();
  if (beforeDash && !candidates.includes(beforeDash)) {
    candidates.push(beforeDash);
  }

  const matchParen = titolo.match(/\(([^)]+)\)/);
  if (matchParen && matchParen[1]) {
    const inside = matchParen[1].trim();
    if (inside && !candidates.includes(inside)) {
      candidates.push(inside);
    }
  }

  const cleanYear = anno ? String(anno).trim().slice(0, 4) : undefined;
  const scoredItems: Array<{ item: TMDBMovieResult; score: number }> = [];

  for (const useYear of [true, false]) {
    const yearToUse = useYear ? cleanYear : undefined;

    for (const query of candidates) {
      if (!query) continue;
      const results = await searchTMDBMovies(query, yearToUse);
      for (const item of results) {
        if (!item.poster_path) continue;
        const s = scoreMovieMatch(query, cleanYear, item);
        scoredItems.push({ item, score: s });
      }
    }
    // Se abbiamo trovato corrispondenze ad alto punteggio con l'anno, non serve cercare senza anno
    if (scoredItems.some((s) => s.score >= 80)) break;
  }

  if (scoredItems.length > 0) {
    scoredItems.sort((a, b) => b.score - a.score);
    const best = scoredItems[0];
    // Soglia minima di accuratezza per evitare falsi positivi casuali
    if (best.score >= 45) {
      return {
        poster_url: getTMDBImageUrl(best.item.poster_path, "w500"),
        backdrop_url: getTMDBImageUrl(best.item.backdrop_path, "original"),
        candidate: {
          id: best.item.id,
          title: best.item.title,
          original_title: best.item.original_title,
          release_date: best.item.release_date || "",
          poster_url: getTMDBImageUrl(best.item.poster_path, "w500"),
          backdrop_url: getTMDBImageUrl(best.item.backdrop_path, "original"),
          overview: best.item.overview || "",
          score: best.score,
        },
      };
    }
  }

  return { poster_url: null, backdrop_url: null };
}

export async function fetchDetailsForMovie(
  titolo: string,
  anno?: string | number | null
): Promise<{
  poster_url: string | null;
  backdrop_url: string | null;
  regista: string | null;
  attori: string | null;
  genere: string | null;
  trama: string | null;
} | null> {
  if (!titolo) return null;

  const posterRes = await fetchPosterForMovie(titolo, anno);
  if (posterRes.candidate?.id) {
    const details = await getTMDBMovieDetails(posterRes.candidate.id);
    if (details) {
      const cred = formatCredits(details);
      return {
        poster_url: cred.poster_url,
        backdrop_url: cred.backdrop_url,
        regista: cred.regista,
        attori: cred.attori,
        genere: cred.genere,
        trama: cred.trama,
      };
    }
  }

  return null;
}

