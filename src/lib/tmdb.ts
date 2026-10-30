import { TMDBMovieDetails, TMDBMovieResult, FilmRatingInfo, FilmStreamingInfo, WatchProviderItem } from "./types";
import { fetchJustWatchDirectOffers, JWDirectOffers } from "./justwatch";

const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

function getApiKey(): string {
  return process.env.TMDB_API_KEY || "";
}

export function normalizePosterUrl(url?: string | null): string {
  if (!url) return "";
  let clean = url.trim();
  if (!clean) return "";

  // Se l'utente incolla solo il percorso relativo es. /lQqbnWsGt9RBGBWrmUKUOXZkl7N.jpg
  if (clean.startsWith("/") && !clean.startsWith("//")) {
    return `${TMDB_IMAGE_BASE}/w500${clean}`;
  }

  // Se l'utente incolla il link diretto da themoviedb.org o www.themoviedb.org
  // lo normalizziamo sul CDN ufficiale image.tmdb.org
  if (clean.includes("themoviedb.org/t/p/")) {
    clean = clean.replace(/https?:\/\/(www\.)?themoviedb\.org\/t\/p\//i, "https://image.tmdb.org/t/p/");
  }

  return clean;
}

export function getTMDBImageUrl(path?: string | null, size: "w342" | "w500" | "w780" | "original" = "w500"): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return normalizePosterUrl(path);
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export async function searchTMDBMovies(
  query: string,
  year?: string | number,
  page = 1,
  overrideApiKey?: string
): Promise<TMDBMovieResult[]> {
  const apiKey = overrideApiKey || getApiKey();
  if (!apiKey || !query.trim()) return [];

  try {
    // Cerchiamo con /search/multi per supportare sia pellicole che serie TV (es. The Book of Boba Fett)
    const url = `${TMDB_API_BASE}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(
      query.trim()
    )}&language=it-IT&page=${page}&include_adult=false`;

    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const msg = errJson?.status_message || `Errore TMDB HTTP ${res.status}`;
      console.error("Errore risposta TMDB:", res.status, msg);
      throw new Error(msg);
    }

    const data = await res.json();
    const rawList = (data.results || []) as any[];

    const results: TMDBMovieResult[] = [];
    for (const item of rawList) {
      if (item.media_type === "person") continue;

      const isTv = item.media_type === "tv" || (!item.title && !!item.name);
      const title = isTv ? (item.name || item.original_name) : (item.title || item.original_title);
      const original_title = isTv ? (item.original_name || item.name) : (item.original_title || item.title);
      const release_date = isTv ? item.first_air_date : item.release_date;

      if (!title) continue;

      results.push({
        id: item.id,
        title,
        original_title: original_title || title,
        release_date: release_date || "",
        overview: item.overview || "",
        poster_path: item.poster_path || null,
        backdrop_path: item.backdrop_path || null,
        genre_ids: item.genre_ids || [],
        vote_average: item.vote_average,
        media_type: isTv ? "tv" : "movie",
      });
    }

    return results;
  } catch (err: any) {
    console.error("Errore ricerca TMDB:", err);
    throw err;
  }
}

export async function getTMDBMovieDetails(
  tmdbId: number,
  overrideApiKey?: string,
  mediaType?: "movie" | "tv"
): Promise<TMDBMovieDetails | null> {
  const apiKey = overrideApiKey || getApiKey();
  if (!apiKey || !tmdbId) return null;

  try {
    // 1. Prova endpoint /movie se non è specificato come serie TV
    if (mediaType !== "tv") {
      const movieUrl = `${TMDB_API_BASE}/movie/${tmdbId}?api_key=${apiKey}&append_to_response=credits,keywords,watch/providers&language=it-IT`;
      let res = await fetch(movieUrl, { next: { revalidate: 86400 } });

      if (res.ok) {
        let data = (await res.json()) as TMDBMovieDetails;
        if (!data.overview || data.overview.trim() === "") {
          const urlEn = `${TMDB_API_BASE}/movie/${tmdbId}?api_key=${apiKey}&language=en-US`;
          const resEn = await fetch(urlEn, { next: { revalidate: 86400 } });
          if (resEn.ok) {
            const dataEn = await resEn.json();
            data.overview = dataEn.overview;
          }
        }
        return data;
      }
    }

    // 2. Se /movie restituisce 404 o fallisce, oppure mediaType === "tv", prova /tv/{id}
    const tvUrl = `${TMDB_API_BASE}/tv/${tmdbId}?api_key=${apiKey}&append_to_response=credits,keywords,watch/providers&language=it-IT`;
    let resTv = await fetch(tvUrl, { next: { revalidate: 86400 } });
    if (resTv.ok) {
      const tvData = await resTv.json();
      let overview = tvData.overview;
      if (!overview || overview.trim() === "") {
        const tvUrlEn = `${TMDB_API_BASE}/tv/${tmdbId}?api_key=${apiKey}&language=en-US`;
        const resEn = await fetch(tvUrlEn, { next: { revalidate: 86400 } });
        if (resEn.ok) {
          const dataEn = await resEn.json();
          overview = dataEn.overview;
        }
      }

      const crew = [...(tvData.credits?.crew || [])];
      if (Array.isArray(tvData.created_by)) {
        for (const creator of tvData.created_by) {
          crew.unshift({ id: creator.id, name: creator.name, job: "Director" });
        }
      }

      const adapted: TMDBMovieDetails = {
        id: tvData.id,
        title: tvData.name || tvData.original_name,
        original_title: tvData.original_name || tvData.name,
        release_date: tvData.first_air_date || "",
        overview: overview || "",
        poster_path: tvData.poster_path,
        backdrop_path: tvData.backdrop_path,
        genres: tvData.genres || [],
        credits: {
          cast: tvData.credits?.cast || [],
          crew,
        },
        belongs_to_collection: null,
        media_type: "tv",
        "watch/providers": tvData["watch/providers"],
      };

      return adapted;
    }

    return null;
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

  const director =
    crew.find((c) => c.job === "Director")?.name ||
    crew.find((c) => c.job === "Creator")?.name ||
    crew.find((c) => c.job === "Executive Producer")?.name ||
    "N/D";
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
  media_type?: string;
}

export async function searchTMDBMovieCandidates(
  query: string,
  year?: string | number,
  overrideApiKey?: string
): Promise<TMDBCandidateResult[]> {
  const cleanYear = year ? String(year).trim().slice(0, 4) : undefined;
  let results = await searchTMDBMovies(query, cleanYear, 1, overrideApiKey);

  // Se con anno non trova nulla, prova senza anno
  if ((!results || results.length === 0) && cleanYear) {
    results = await searchTMDBMovies(query, undefined, 1, overrideApiKey);
  }

  const mapped = (results || []).map((item) => ({
    id: item.id,
    title: item.title,
    original_title: item.original_title,
    release_date: item.release_date || "",
    poster_url: getTMDBImageUrl(item.poster_path, "w500"),
    backdrop_url: getTMDBImageUrl(item.backdrop_path, "original"),
    overview: item.overview || "",
    score: scoreMovieMatch(query, cleanYear, item),
    media_type: item.media_type,
  }));

  mapped.sort((a, b) => (b.score || 0) - (a.score || 0));
  return mapped;
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



/**
 * Estrae e struttura le piattaforme di streaming attive in Italia per un film/serie da TMDB
 * integrandole con i deep-link ufficiali JustWatch per avviare direttamente il film.
 */
export function parseStreamingProviders(
  details: any,
  jwOffers?: JWDirectOffers | null
): FilmStreamingInfo | null {
  if (!details && !jwOffers) return null;

  const wp =
    details?.["watch/providers"] ||
    details?.watch_providers ||
    details?.watchProviders;
  const itData = wp?.results?.IT || wp?.results?.it;

  const rawFlatrate: any[] = Array.isArray(itData?.flatrate) ? itData.flatrate : [];
  const rawRent: any[] = Array.isArray(itData?.rent) ? itData.rent : [];
  const rawBuy: any[] = Array.isArray(itData?.buy) ? itData.buy : [];

  const isAmazonProvider = (p: any): boolean => {
    const name = (p.provider_name || "").toLowerCase();
    const id = Number(p.provider_id);
    return (
      id === 119 || // Amazon Prime Video
      id === 10 || // Amazon Video
      id === 9 || // Amazon
      name.includes("amazon") ||
      name.includes("prime video")
    );
  };

  const isPrimeFlatrate = rawFlatrate.some(isAmazonProvider);
  const isPrimeRentBuy =
    rawRent.some(isAmazonProvider) || rawBuy.some(isAmazonProvider);
  const isOnPrimeVideo =
    isPrimeFlatrate || isPrimeRentBuy || Boolean(jwOffers?.primeDirectUrl);

  const getDirectUrlForProvider = (name: string): string | null => {
    const lower = name.toLowerCase();
    if (lower.includes("prime") || lower.includes("amazon")) {
      return jwOffers?.primeDirectUrl || null;
    }
    if (!jwOffers?.directUrlsByPlatform) return null;
    for (const [key, url] of jwOffers.directUrlsByPlatform.entries()) {
      if (lower.includes(key) || key.includes(lower)) {
        return url;
      }
    }
    return null;
  };

  const formatItem = (p: any): WatchProviderItem => ({
    id: p.provider_id,
    name: p.provider_name || "Streaming",
    logoUrl: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null,
    directUrl: getDirectUrlForProvider(p.provider_name || ""),
  });

  // Flatrate providers (abbonamento)
  const seenFlatrate = new Set<number>();
  const flatrate: WatchProviderItem[] = [];
  for (const p of rawFlatrate) {
    if (!seenFlatrate.has(p.provider_id)) {
      seenFlatrate.add(p.provider_id);
      flatrate.push(formatItem(p));
    }
  }

  // Rent / Buy combinati (noleggio o acquisto)
  const seenRentBuy = new Set<number>();
  const rentOrBuy: WatchProviderItem[] = [];
  for (const p of [...rawRent, ...rawBuy]) {
    if (!seenRentBuy.has(p.provider_id)) {
      seenRentBuy.add(p.provider_id);
      rentOrBuy.push(formatItem(p));
    }
  }

  return {
    isOnPrimeVideo,
    isPrimeFlatrate,
    isPrimeRentBuy,
    primeVideoDirectUrl: jwOffers?.primeDirectUrl || null,
    flatrate,
    rentOrBuy,
    justWatchLink: itData?.link || null,
  };
}

const ratingCache = new Map<string, FilmRatingInfo>();

/**
 * Recupera la valutazione cinematografica (su base 10), il conteggio voti,
 * l'ID/link ufficiale IMDb e la disponibilità streaming con deep-link per una pellicola.
 */
export async function getFilmRatingInfo(
  title: string,
  year?: string | number | null,
  tmdbId?: number | null,
  overrideApiKey?: string
): Promise<FilmRatingInfo | null> {
  if (!title && !tmdbId) return null;
  const cleanTitle = (title || "").trim();
  const cacheKey = tmdbId
    ? `id_${tmdbId}`
    : `${cleanTitle.toLowerCase()}_${year || ""}`;

  if (ratingCache.has(cacheKey)) {
    return ratingCache.get(cacheKey)!;
  }

  try {
    let details: TMDBMovieDetails | null = null;
    let voteAverage: number | undefined;
    let voteCount: number | undefined;
    let imdbId: string | null = null;

    // 1. Se abbiamo già l'ID TMDB associato al film nel DB, carichiamo direttamente i dettagli
    if (tmdbId) {
      details = await getTMDBMovieDetails(tmdbId, overrideApiKey);
      if (details) {
        imdbId = details.imdb_id || null;
        voteAverage = details.vote_average;
        voteCount = details.vote_count;
      }
    }

    // 2. Se non avevamo tmdbId o la chiamata diretta non ha trovato nulla, cerchiamo per titolo
    if (!details && cleanTitle) {
      const candidates = await searchTMDBMovies(
        cleanTitle,
        year || undefined,
        1,
        overrideApiKey
      );
      if (candidates && candidates.length > 0) {
        let best = candidates[0];
        if (year) {
          const yearStr = String(year);
          const matchYear = candidates.find((c) =>
            c.release_date?.startsWith(yearStr)
          );
          if (matchYear) best = matchYear;
        }

        if (best) {
          voteAverage = best.vote_average;
          voteCount = (best as any).vote_count;
          try {
            details = await getTMDBMovieDetails(best.id, overrideApiKey);
            if (details) {
              if (details.imdb_id) imdbId = details.imdb_id;
              if (typeof details.vote_count === "number")
                voteCount = details.vote_count;
              if (
                typeof details.vote_average === "number" &&
                details.vote_average > 0
              ) {
                voteAverage = details.vote_average;
              }
            }
          } catch {
            // Fallback con dati base della ricerca
          }
        }
      }
    }

    if (!details && (typeof voteAverage !== "number" || voteAverage <= 0)) {
      return null;
    }

    // Recupera offerte dirette JustWatch (Deep-Link ufficiali al player)
    const titleForJW = cleanTitle || (details ? details.title : "");
    const jwOffers = await fetchJustWatchDirectOffers(titleForJW, year);

    const streaming =
      details || jwOffers ? parseStreamingProviders(details, jwOffers) : null;
    const finalRating =
      typeof voteAverage === "number" ? Math.round(voteAverage * 10) / 10 : 0;

    const imdbUrl = imdbId
      ? `https://www.imdb.com/title/${imdbId}/`
      : `https://www.imdb.com/find/?q=${encodeURIComponent(cleanTitle)}`;

    const info: FilmRatingInfo = {
      rating: finalRating,
      voteCount,
      imdbId,
      imdbUrl,
      streaming,
    };

    ratingCache.set(cacheKey, info);
    return info;
  } catch (err) {
    console.error("Errore recupero valutazione film e streaming:", err);
    return null;
  }
}
