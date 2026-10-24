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
