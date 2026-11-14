"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Logga l'errore per il monitoraggio / diagnostica client
    console.error("Runtime application error caught by error boundary:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-5 shadow-lg shadow-red-500/10">
        <AlertTriangle className="h-8 w-8" />
      </div>

      <span className="text-xs font-black uppercase tracking-widest text-red-400 mb-2">
        Ciak Interrotto
      </span>

      <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
        Qualcosa è andato storto sulla scena
      </h1>

      <p className="text-sm text-zinc-400 max-w-md mb-8 leading-relaxed">
        Si è verificato un errore imprevisto durante il caricamento di questa sezione.
        Puoi provare a ricaricare la scena o tornare alla home page.
      </p>

      {error?.digest && (
        <p className="text-xs font-mono text-zinc-600 mb-6 bg-zinc-900/60 px-3 py-1.5 rounded-lg border border-zinc-800">
          ID Errore: {error.digest}
        </p>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={() => reset()}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-sm hover:bg-amber-400 transition shadow-lg shadow-amber-500/20 active:scale-95"
        >
          <RefreshCw className="h-4 w-4" /> Ricarica la Scena
        </button>
        <Link
          href="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-bold text-sm hover:bg-zinc-800 hover:text-white transition active:scale-95"
        >
          <Home className="h-4 w-4" /> Torna alla Home
        </Link>
      </div>
    </div>
  );
}
