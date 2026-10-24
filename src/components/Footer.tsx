import Link from "next/link";
import { Film, ShieldCheck, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-800/80 bg-zinc-950/90 py-12 text-zinc-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-bold text-sm">
                <Film className="h-4 w-4" />
              </div>
              <span className="text-base font-black text-white">
                FilmBloopers<span className="text-amber-400">Hub</span>
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-md">
              Il più grande archivio italiano di errori, anacronismi, sviste di montaggio e ciak falsi nella storia del cinema. Esplora le pellicole celebri e scopri cosa è sfuggito ai registi.
            </p>
            <div className="text-[11px] text-zinc-500">
              In qualità di Affiliato Amazon, FilmBloopers Hub riceve un guadagno dagli acquisti idonei effettuati tramite i link del sito.
            </div>
          </div>

          {/* Navigazione */}
          <div>
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-3">Esplora</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-amber-400 transition-colors">Home Page</Link>
              </li>
              <li>
                <Link href="/esplora" className="hover:text-amber-400 transition-colors">Catalogo & Ricerca Film</Link>
              </li>
              <li>
                <Link href="/classifica" className="hover:text-amber-400 transition-colors">Classifica Cacciatori</Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-amber-400 transition-colors">Piani & Abbonamenti</Link>
              </li>
            </ul>
          </div>

          {/* TMDB Attribution (Richiesto da ToS) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-2">Metadati & Locandine</h4>
            <div className="flex items-center gap-2">
              <span className="inline-block rounded bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                TMDB Powered
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-normal">
              Questo prodotto utilizza le API di The Movie Database (TMDB) per trame, cast e locandine, ma non è approvato o certificato da TMDB.
            </p>
          </div>
        </div>

        <div className="border-t border-zinc-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} FilmBloopers Hub. Tutti i diritti riservati.</p>
          <div className="flex items-center gap-1 text-zinc-400">
            <span>Realizzato con passione per il cinema</span>
            <Heart className="h-3 w-3 text-red-500 fill-red-500 inline" />
          </div>
        </div>
      </div>
    </footer>
  );
}
