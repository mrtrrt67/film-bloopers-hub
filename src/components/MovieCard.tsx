import Link from "next/link";
import Image from "next/image";
import { Film as FilmIcon, AlertCircle } from "lucide-react";
import { Film } from "@/lib/types";
import { slugify } from "@/lib/utils";

interface MovieCardProps {
  film: Film & { bloopers_count?: number };
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

        {/* Bloopers Count Badge */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-lg bg-amber-500/90 text-zinc-950 px-2.5 py-1 text-xs font-black shadow-md">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{film.bloopers_count ?? "—"} Bloopers</span>
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
