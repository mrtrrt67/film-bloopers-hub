import Link from "next/link";
import { Film, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5 shadow-lg shadow-amber-500/10">
        <Film className="h-8 w-8" />
      </div>

      <span className="text-xs font-black uppercase tracking-widest text-amber-400 mb-2">
        Errore 404
      </span>

      <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
        Scena o Scheda Non Trovata
      </h1>

      <p className="text-sm text-zinc-400 max-w-md mb-8 leading-relaxed">
        La pellicola, il blooper o la pagina che stai cercando non fa parte del catalogo, è stata rimossa oppure l&apos;indirizzo digitato contiene un refuso.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm hover:bg-amber-400 transition shadow-lg shadow-amber-500/20 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" /> Torna alla Home
        </Link>
        <Link
          href="/esplora"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-bold text-sm hover:bg-zinc-800 hover:text-white transition active:scale-95"
        >
          <Search className="h-4 w-4" /> Esplora l&apos;Archivio
        </Link>
      </div>
    </div>
  );
}
