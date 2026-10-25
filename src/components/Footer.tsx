import Link from "next/link";
import { Film, ShieldCheck, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-800/80 bg-zinc-950/95 py-12 text-zinc-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Brand & Mission */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-bold text-sm shadow-md">
                <Film className="h-4 w-4" />
              </div>
              <span className="text-base font-black text-white">
                FilmBloopers<span className="text-amber-400">Hub</span>
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Il più grande archivio italiano di errori, anacronismi, sviste di montaggio e ciak falsi nella storia del cinema. Esplora le pellicole celebri e scopri cosa è sfuggito ai registi.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1 rounded-md bg-zinc-900 border border-zinc-800 px-2 py-1 text-[10px] font-bold text-zinc-300">
                <ShieldCheck className="h-3 w-3 text-amber-400" /> GDPR Compliant
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-zinc-900 border border-zinc-800 px-2 py-1 text-[10px] font-bold text-emerald-400">
                TMDB Partner
              </span>
            </div>
          </div>

          {/* Navigazione */}
          <div>
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-3.5">Esplora</h4>
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
              <li>
                <Link href="/suggerimenti" className="text-amber-400/90 hover:text-amber-300 font-semibold transition-colors flex items-center gap-1">
                  💡 Invia Suggerimento
                </Link>
              </li>
            </ul>
          </div>

          {/* Note Legali & Privacy */}
          <div>
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-3.5">Note Legali & Privacy</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/privacy" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                  <span>Informativa sulla Privacy (GDPR)</span>
                </Link>
              </li>
              <li>
                <Link href="/termini" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                  <span>Termini e Condizioni d&apos;Uso</span>
                </Link>
              </li>
              <li>
                <Link href="/cookie" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                  <span>Cookie Policy</span>
                </Link>
              </li>
              <li>
                <Link href="/note-legali" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                  <span>Note Legali & Riferimenti Societari</span>
                </Link>
              </li>
              <li>
                <a href="mailto:supporto@filmbloopers.it" className="text-zinc-500 hover:text-zinc-300 transition-colors text-[11px] block pt-1">
                  Assistenza: supporto@filmbloopers.it
                </a>
              </li>
            </ul>
          </div>

          {/* Trasparenza & Disclaimer */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-2">Trasparenza & Disclaimers</h4>
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3 text-[11px] text-zinc-400 leading-relaxed space-y-1.5">
              <p className="font-semibold text-zinc-300">Affiliazione Commerciale Amazon:</p>
              <p>In qualità di Affiliato Amazon, FilmBloopers Hub riceve un guadagno dagli acquisti idonei effettuati tramite i link del sito.</p>
            </div>
            <div className="text-[11px] text-zinc-500 leading-normal">
              Questo prodotto utilizza le API di The Movie Database (TMDB) per trame, cast e locandine, ma non è approvato o certificato da TMDB.
            </div>
          </div>
        </div>

        {/* Informazioni Societarie e Barra Bottom */}
        <div className="border-t border-zinc-900 pt-6 space-y-3 text-xs text-zinc-500">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-zinc-400">
            <p>
              <strong>FilmBloopers Hub</strong> — Il database intelligente degli errori cinematografici | P.IVA / C.F.: 12345678901 | Sede Legale: Via Roma 1, 10121 Torino (TO) | Contatti: supporto@filmbloopers.it
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
            <p suppressHydrationWarning>© {new Date().getFullYear()} FilmBloopers Hub. Tutti i diritti riservati. Uso critico e divulgativo ai sensi dell&apos;art. 70 L. 633/1941.</p>
            <div className="flex items-center gap-1 text-zinc-400">
              <span>Realizzato con passione per il cinema</span>
              <Heart className="h-3 w-3 text-red-500 fill-red-500 inline" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
