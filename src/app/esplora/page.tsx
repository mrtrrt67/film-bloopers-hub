"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Search, Film as FilmIcon, Sparkles, Filter, Database, Globe } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Film, TMDBMovieResult } from "@/lib/types";
import MovieCard from "@/components/MovieCard";
import { slugify } from "@/lib/utils";

export default function EsploraPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dbFilms, setDbFilms] = useState<(Film & { bloopers_count?: number; trivia_count?: number })[]>([]);
  const [tmdbResults, setTmdbResults] = useState<TMDBMovieResult[]>([]);
  const [activeTab, setActiveTab] = useState<"archivio" | "tmdb">("archivio");
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Carica i film dall'archivio Supabase
  useEffect(() => {
    async function loadDbFilms() {
      setLoading(true);
      try {
        const { data: films } = await supabase
          .from("films")
          .select("*, errori(count), movie_trivia(count)")
          .order("anno", { ascending: false });

        if (films) {
          const mapped = films.map((f: any) => ({
            ...f,
            bloopers_count: f.errori?.[0]?.count ?? (Array.isArray(f.errori) ? f.errori.length : 0),
            trivia_count: f.movie_trivia?.[0]?.count ?? (Array.isArray(f.movie_trivia) ? f.movie_trivia.length : 0),
          }));
          setDbFilms(mapped);
        }
      } catch (err) {
        console.error("Errore caricamento film:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDbFilms();
  }, []);

  // Ricerca istantanea su TMDB con debounce
  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setTmdbResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/movies/search?q=${encodeURIComponent(searchTerm)}`);
        if (res.ok) {
          const data = await res.json();
          setTmdbResults(data.results || []);
          if (data.results?.length > 0 && activeTab === "archivio") {
            // Se non ci sono risultati locali, suggerisce la tab TMDB
            const localMatches = dbFilms.filter((f) =>
              f.titolo?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (localMatches.length === 0) {
              setActiveTab("tmdb");
            }
          }
        }
      } catch (err) {
        console.error("Errore ricerca TMDB:", err);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm, activeTab, dbFilms]);

  const lastLoggedRef = useRef<string>("");

  // Registrazione analitica della ricerca (solo termini completi o selezioni)
  const logSearchTerm = (term: string) => {
    const clean = (term || "").trim();
    if (!clean || clean.length < 2) return;
    if (lastLoggedRef.current.toLowerCase() === clean.toLowerCase()) return;
    lastLoggedRef.current = clean;

    fetch("/api/movies/search/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: clean }),
    }).catch(() => {});
  };

  // Registra la ricerca solo quando l'utente ha terminato di digitare (2 secondi di pausa)
  useEffect(() => {
    const clean = searchTerm.trim();
    if (!clean || clean.length < 2) return;

    const timer = setTimeout(() => {
      logSearchTerm(clean);
    }, 2000);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Importa un film da TMDB nel database Supabase al click
  const handleImportAndNavigate = async (movie: TMDBMovieResult) => {
    if (movie.title) logSearchTerm(movie.title);
    setImportingId(movie.id);
    try {
      const res = await fetch("/api/movies/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdb_id: movie.id }),
      });

      if (res.ok) {
        const data = await res.json();
        const filmSlug = slugify(data.film.titolo, data.film.anno);
        router.push(`/film/${filmSlug}-${String(data.film.id)}`);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "Impossibile importare la scheda del film.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setImportingId(null);
    }
  };

  const filteredDbFilms = dbFilms.filter((f) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (f.titolo && f.titolo.toLowerCase().includes(term)) ||
      (f.anno && String(f.anno).includes(term)) ||
      (f.regista && f.regista.toLowerCase().includes(term)) ||
      (f.attori && f.attori.toLowerCase().includes(term))
    );
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            Catalogo Cinematografico
          </span>
          <h1 className="text-3xl font-black text-white tracking-tight mt-1">
            Esplora Film, Bloopers & Curiosità
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Cerca tra le pellicole già analizzate nella community o digita qualsiasi titolo per scoprire bloopers verificati, retroscena dal set e aneddoti esclusivi.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-zinc-900 border border-zinc-800 p-1 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("archivio")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "archivio"
                ? "bg-amber-500 text-zinc-950 shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            Catalogo Film ({filteredDbFilms.length})
          </button>
          <button
            onClick={() => setActiveTab("tmdb")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "tmdb"
                ? "bg-amber-500 text-zinc-950 shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            Cerca su TMDB {tmdbResults.length > 0 && `(${tmdbResults.length})`}
          </button>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="relative mb-10">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && searchTerm.trim().length >= 2) {
              logSearchTerm(searchTerm);
            }
          }}
          onBlur={() => {
            if (searchTerm.trim().length >= 2) {
              logSearchTerm(searchTerm);
            }
          }}
          placeholder="Cerca per titolo, anno, regista o attore (es. Matrix, Il Gladiatore, Nolan)..."
          className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 pl-12 pr-4 py-4 text-base text-white placeholder-zinc-500 backdrop-blur-md focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-lg"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-xs text-amber-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
            <span>Ricerca...</span>
          </div>
        )}
      </div>

      {/* Grid Content */}
      {activeTab === "archivio" ? (
        filteredDbFilms.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {filteredDbFilms.map((film) => (
              <MovieCard key={film.id} film={film} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-16 px-4 text-center">
            <FilmIcon className="h-12 w-12 text-zinc-600 mb-3" />
            <h3 className="text-base font-bold text-white">Nessun film trovato nell'archivio locale</h3>
            <p className="text-xs text-zinc-400 max-w-sm mt-1 mb-4">
              {searchTerm
                ? `Nessun risultato per "${searchTerm}" tra i film già analizzati.`
                : "L'archivio è ancora vuoto."}
            </p>
            {searchTerm && (
              <button
                onClick={() => {
                  setActiveTab("tmdb");
                  if (searchTerm.trim().length >= 2) logSearchTerm(searchTerm);
                }}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 shadow-md hover:brightness-110"
              >
                <Globe className="h-4 w-4" />
                Cerca &quot;{searchTerm}&quot; su TMDB
              </button>
            )}
          </div>
        )
      ) : (
        /* Tab TMDB Results */
        tmdbResults.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {tmdbResults.map((movie) => {
              const year = movie.release_date?.slice(0, 4) || "N/D";
              const poster = movie.poster_path
                ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                : null;

              return (
                <div
                  key={movie.id}
                  className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-lg hover:border-amber-500/40 transition-all"
                >
                  <div className="relative aspect-[2/3] w-full bg-zinc-950">
                    {poster ? (
                      <Image
                        src={poster}
                        alt={movie.title}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 100vw, 25vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-600">
                        <FilmIcon className="h-10 w-10" />
                      </div>
                    )}
                    <span className="absolute top-2 right-2 rounded bg-zinc-950/80 px-2 py-0.5 text-[10px] font-bold text-zinc-300">
                      {year}
                    </span>
                  </div>

                  <div className="flex flex-col flex-1 p-4">
                    <h3 className="text-sm font-bold text-white line-clamp-1">{movie.title}</h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 mt-1 mb-4 flex-1">
                      {movie.overview || "Nessuna sinossi disponibile."}
                    </p>

                    <button
                      onClick={() => handleImportAndNavigate(movie)}
                      disabled={importingId === movie.id}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 py-2 text-xs font-bold text-zinc-200 transition-all disabled:opacity-50"
                    >
                      {importingId === movie.id ? (
                        <span className="animate-pulse">Importazione...</span>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          Apri & Analizza Bloopers
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-16 px-4 text-center">
            <Globe className="h-12 w-12 text-zinc-600 mb-3" />
            <h3 className="text-base font-bold text-white">Cerca tra milioni di pellicole su TMDB</h3>
            <p className="text-xs text-zinc-400 max-w-sm mt-1">
              Digita un titolo nel box in alto per interrogare in tempo reale il catalogo mondiale The Movie Database.
            </p>
          </div>
        )
      )}
    </div>
  );
}
