import Link from "next/link";
import Image from "next/image";
import { Film as FilmIcon, AlertCircle, Sparkles } from "lucide-react";
import { Film } from "@/lib/types";
import { slugify } from "@/lib/utils";

interface MovieCardProps {
  film: Film & { bloopers_count?: number; trivia_count?: number };
}

export default function MovieCard({ film }: MovieCardProps) {
  const filmSlug = slugify(film.titolo, film.anno);
  const href = `/film/${filmSlug}-${String(film.id)}`;

  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40 transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5"
    >
      {/* Poster Image */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-950">
        {film.poster_url ? (
          <Image
            src={film.poster_url}
            alt={film.titolo}
            fill
            unoptimized
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
            <FilmIcon className="h-10 w-10 text-zinc-700 mb-2" />
            <span className="text-xs font-semibold text-zinc-500 line-clamp-2">
              {film.titolo}
            </span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Year Badge */}
        {film.anno && (
          <span className="absolute top-2.5 right-2.5 rounded-md bg-zinc-950/80 backdrop-blur-md border border-zinc-800 px-2 py-0.5 text-[11px] font-bold text-zinc-300">
            {film.anno}
          </span>
        )}

        {/* Badges Container */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex flex-wrap items-center gap-1.5 pointer-events-none">
          {/* Bloopers Count Badge */}
          <div className="flex items-center gap-1 rounded-lg bg-amber-500 text-zinc-950 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] font-black shadow-md">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>
              {film.bloopers_count !== undefined
                ? `${film.bloopers_count} ${film.bloopers_count === 1 ? "Blooper" : "Bloopers"}`
                : "— Bloopers"}
            </span>
          </div>

          {/* Curiosità Count Badge */}
          {film.trivia_count !== undefined && film.trivia_count > 0 ? (
            <div className="flex items-center gap-1 rounded-lg bg-zinc-950/85 text-amber-300 border border-amber-500/40 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] font-bold shadow-md">
              <Sparkles className="h-3 w-3 shrink-0 text-amber-400" />
              <span>{film.trivia_count} Curiosità</span>
            </div>
          ) : film.trivia_count === 0 ? (
            <div className="flex items-center gap-1 rounded-lg bg-zinc-950/75 text-zinc-400 border border-zinc-800 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] font-medium shadow-md">
              <Sparkles className="h-3 w-3 shrink-0 text-zinc-500" />
              <span>0 Curiosità</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col p-3.5">
        <h3 className="text-sm font-bold text-zinc-100 line-clamp-1 group-hover:text-amber-400 transition-colors">
          {film.titolo}
        </h3>
        <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
          {film.regista ? `Regia: ${film.regista}` : film.genere || "Cinema"}
        </p>
      </div>
    </Link>
  );
}
