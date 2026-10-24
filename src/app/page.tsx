import Link from "next/link";
import { Search, Sparkles, Film as FilmIcon, Trophy, CheckCircle, ArrowRight, Flame } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import MovieCard from "@/components/MovieCard";
import PromoBanner from "@/components/PromoBanner";
import BlooperItem from "@/components/BlooperItem";
import { Film, Blooper } from "@/lib/types";

export const revalidate = 60; // ISR ogni 60 secondi

export default async function HomePage() {
  const supabase = await createClient();

  // 1. Configurazioni dinamiche
  const { data: configRows } = await supabase
    .from("configurazioni")
    .select("chiave, valore, visibile");

  const conf: Record<string, string> = {};
  (configRows || []).forEach((c: any) => {
    conf[c.chiave] = c.valore;
  });

  const bannerVisibile = conf["home_banner_top"] !== "false";
  const bannerTitolo = conf["home_banner_top_titolo"];
  const bannerTesto = conf["home_banner_top_testo"];
  const bannerBadge = conf["home_banner_top_badge"];
  const promoDeadline = conf["promo_lifetime_deadline"] || "31/12/2026";

  // 2. Film in evidenza (con conteggio errori)
  const { data: filmsRaw } = await supabase
    .from("films")
    .select("*, errori(id)")
    .order("created_at", { ascending: false })
    .limit(8);

  const featuredFilms: (Film & { bloopers_count?: number })[] = (filmsRaw || []).map((f: any) => ({
    ...f,
    bloopers_count: Array.isArray(f.errori) ? f.errori.length : 0,
  }));

  // 3. Ultimi bloopers approvati
  const { data: recentBloopersRaw } = await supabase
    .from("errori")
    .select("*, films(titolo, anno, id), voti_bloopers(tipo)")
    .eq("approvato", true)
    .order("created_at", { ascending: false })
    .limit(4);

  const recentBloopers = (recentBloopersRaw || []).map((b: any) => {
    const voti = b.voti_bloopers || [];
    const conferme = voti.filter((v: any) => v.tipo === "conferma").length;
    const contestazioni = voti.filter((v: any) => v.tipo === "contestazione").length;
    return {
      ...b,
      conferme,
      contestazioni,
    };
  });

  // 4. Statistiche Archivio
  const { count: countFilms } = await supabase
    .from("films")
    .select("*", { count: "exact", head: true });

  const { count: countBloopers } = await supabase
    .from("errori")
    .select("*", { count: "exact", head: true })
    .eq("approvato", true);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Promo Banner Dinamico */}
      <PromoBanner
        titolo={bannerTitolo}
        testo={bannerTesto}
        badge={bannerBadge}
        scadenza={promoDeadline}
        visibile={bannerVisibile}
      />

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-zinc-950 p-8 sm:p-14 mb-16 text-center shadow-2xl">
        <div className="mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-4 py-1.5 text-xs font-black text-amber-400 mb-6">
            <Flame className="h-4 w-4" />
            <span>L&apos;Archivio Ufficiale di Bloopers Cinematografici</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6">
            Errori, Sviste e Ciak Falsi nella Storia del Cinema
          </h1>

          <p className="text-base sm:text-lg text-zinc-300 leading-relaxed font-normal mb-8">
            Microfoni che spuntano dall&apos;inquadratura, orologi da polso nell&apos;antica Roma e oggetti che cambiano posizione tra un ciak e l&apos;altro: scopri i bloopers più incredibili sfuggiti al montaggio finale.
          </p>

          {/* Search CTA Box */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xl mx-auto">
            <Link
              href="/esplora"
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-6 py-4 text-base font-black text-zinc-950 shadow-xl shadow-orange-500/20 hover:brightness-110 transition-all"
            >
              <Search className="h-5 w-5" />
              Cerca o Aggiungi un Film
            </Link>
            <Link
              href="/classifica"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900/80 px-6 py-4 text-base font-bold text-white hover:bg-zinc-800 transition-colors"
            >
              <Trophy className="h-5 w-5 text-amber-400" />
              Classifica Community
            </Link>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-12 mt-12 border-t border-zinc-800/80 max-w-2xl mx-auto text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {countFilms || 250}+
            </div>
            <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mt-0.5">
              Film Archiviati
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
              {countBloopers || 1400}+
            </div>
            <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mt-0.5">
              Bloopers Documentati
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
              100%
            </div>
            <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mt-0.5">
              Dati TMDB Ufficiali
            </div>
          </div>
        </div>
      </div>

      {/* Sezione Film in Evidenza */}
      <div className="mb-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Esplora i Titoli
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">
              Pellicole con Bloopers da Non Perdere
            </h2>
          </div>
          <Link
            href="/esplora"
            className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
          >
            Vedi tutti ({countFilms || 0}) <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {featuredFilms.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {featuredFilms.map((film) => (
              <MovieCard key={film.id} film={film} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-12 text-center text-zinc-400">
            Nessun film in evidenza al momento.
          </div>
        )}
      </div>

      {/* Ultimi Bloopers Aggiunti Feed */}
      {recentBloopers.length > 0 && (
        <div className="mb-16">
          <div className="flex items-end justify-between mb-6">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Ultime Novità
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">
                Bloopers Rilevati di Recente
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentBloopers.map((blooper: any) => (
              <div key={blooper.id} className="relative flex flex-col">
                {blooper.films && (
                  <div className="text-xs font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                    <FilmIcon className="h-3.5 w-3.5" />
                    <span>
                      {blooper.films.titolo} ({blooper.films.anno || "N/D"})
                    </span>
                  </div>
                )}
                <BlooperItem blooper={blooper} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Come Funziona Section */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-8 sm:p-12 text-center">
        <h2 className="text-2xl font-black text-white mb-2">Come Funziona FilmBloopers Hub?</h2>
        <p className="text-sm text-zinc-400 max-w-xl mx-auto mb-10">
          Unisciti alla prima community italiana dedicata all&apos;analisi millimetrica dei ciak errati.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 font-black text-base mb-4">
              1
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Cerca o Importa il Film</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Grazie all&apos;integrazione con TMDB, qualsiasi film nella storia del cinema viene importato all&apos;istante con locandina HD, cast ufficiale e sinossi.
            </p>
          </div>

          <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 font-black text-base mb-4">
              2
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Analisi Bloopers con IA</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Il nostro motore Google Gemini analizza la scena indicando il minuto esatto, la tipologia di errore e la descrizione del ciak falso.
            </p>
          </div>

          <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 font-black text-base mb-4">
              3
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Vota, Scala la Classifica & Vinci</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Conferma o contesta i bloopers, accumula punti e sblocca l&apos;accesso Premium gratuito a vita per i migliori cacciatori della community.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
