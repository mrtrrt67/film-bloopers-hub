"use client";

import { useState, useEffect } from "react";
import { Film as FilmIcon, Lightbulb, Sparkles } from "lucide-react";
import { Film, Blooper, MovieTrivia } from "@/lib/types";
import BloopersSection from "@/app/film/[slug]/BloopersSection";
import TriviaSection from "@/components/TriviaSection";

import { createClient } from "@/lib/supabase/client";

interface FilmContentSwitcherProps {
  film: Film;
  initialBloopers: Blooper[];
  initialTrivia: MovieTrivia[];
}

export default function FilmContentSwitcher({
  film,
  initialBloopers,
  initialTrivia,
}: FilmContentSwitcherProps) {
  const [activeTab, setActiveTab] = useState<"bloopers" | "trivia">("bloopers");
  const [bloopers, setBloopers] = useState<Blooper[]>(initialBloopers);
  const [trivia, setTrivia] = useState<MovieTrivia[]>(initialTrivia);
  const [bloopersCount, setBloopersCount] = useState(initialBloopers.length);
  const [triviaCount, setTriviaCount] = useState(initialTrivia.length);

  // Sincronizza lo stato locale quando cambiano le props
  useEffect(() => {
    setBloopers(initialBloopers);
    setBloopersCount(initialBloopers.length);
  }, [initialBloopers]);

  useEffect(() => {
    setTrivia(initialTrivia);
    setTriviaCount(initialTrivia.length);
  }, [initialTrivia]);

  // Se i dati iniziali sono vuoti, esegue un controllo immediato su Supabase (safety net anti-cache)
  useEffect(() => {
    if (initialBloopers.length === 0 || initialTrivia.length === 0) {
      const supabase = createClient();

      if (initialBloopers.length === 0) {
        supabase
          .from("errori")
          .select("*, voti_bloopers(tipo, user_id)")
          .eq("film_id", film.id)
          .eq("approvato", true)
          .then(({ data }: { data: any }) => {
            if (data && data.length > 0) {
              const mapped: Blooper[] = data.map((b: any) => {
                const voti = b.voti_bloopers || [];
                return {
                  ...b,
                  conferme: voti.filter((v: any) => v.tipo === "conferma").length,
                  contestazioni: voti.filter((v: any) => v.tipo === "contestazione").length,
                  voto_utente: null,
                };
              });
              setBloopers(mapped);
              setBloopersCount(mapped.length);
            }
          });
      }

      if (initialTrivia.length === 0) {
        supabase
          .from("movie_trivia")
          .select("*")
          .eq("film_id", film.id)
          .eq("approvato", true)
          .order("ordine", { ascending: true })
          .order("created_at", { ascending: false })
          .then(({ data }: { data: any }) => {
            if (data && data.length > 0) {
              setTrivia(data as MovieTrivia[]);
              setTriviaCount(data.length);
            }
          });
      }
    }
  }, [film.id, initialBloopers.length, initialTrivia.length]);

  // Rileva eventuale ancora nell'URL (#curiosita o #trivia o ?view=trivia)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const view = params.get("view")?.toLowerCase();

      if (hash === "#curiosita" || hash === "#trivia" || view === "trivia" || view === "curiosita") {
        setActiveTab("trivia");
      }
    }
  }, []);

  const handleTabChange = (tab: "bloopers" | "trivia") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const newHash = tab === "trivia" ? "#curiosita" : "#bloopers";
      window.history.replaceState(null, "", newHash);
    }
  };

  const handleBloopersUpdate = (updated: Blooper[]) => {
    setBloopers(updated);
    setBloopersCount(updated.length);
  };

  const handleTriviaUpdate = (updated: MovieTrivia[]) => {
    setTrivia(updated);
    setTriviaCount(updated.length);
  };

  return (
    <div className="mt-8 flex flex-col">
      {/* Selector Tabs in Primo Piano */}
      <div className="mb-6 p-1.5 rounded-2xl bg-zinc-950/90 border border-zinc-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {/* Tab Bloopers */}
            <button
              id="tab-bloopers"
              onClick={() => handleTabChange("bloopers")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-xs sm:text-sm font-black transition-all ${
                activeTab === "bloopers"
                  ? "bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20 scale-[1.01]"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80 border border-transparent"
              }`}
            >
              <FilmIcon className="h-4 w-4" />
              <span>Bloopers & Errori</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  activeTab === "bloopers"
                    ? "bg-zinc-950 text-amber-400"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {bloopersCount}
              </span>
            </button>

            {/* Tab Curiosità & Retroscena */}
            <button
              id="tab-trivia"
              onClick={() => handleTabChange("trivia")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-xs sm:text-sm font-black transition-all ${
                activeTab === "trivia"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 shadow-lg shadow-amber-500/20 scale-[1.01]"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80 border border-transparent"
              }`}
            >
              <Lightbulb className="h-4 w-4" />
              <span>Curiosità & Retroscena</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  activeTab === "trivia"
                    ? "bg-zinc-950 text-amber-400"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {triviaCount}
              </span>
            </button>
          </div>

          {/* Didascalia di contesto per guidare l'utente */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-zinc-400 pr-3">
            {activeTab === "bloopers" ? (
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Minutaggi di scena, fotogrammi e voti della community
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Aneddoti di backstage, segreti di produzione ed easter egg
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contenuti Sezione: preservati entrambi in memoria per transizioni istantanee */}
      <div className={activeTab === "bloopers" ? "block" : "hidden"}>
        <BloopersSection
          film={film}
          initialBloopers={bloopers}
          onBloopersUpdate={handleBloopersUpdate}
        />
      </div>

      <div className={activeTab === "trivia" ? "block" : "hidden"}>
        <TriviaSection
          film={film}
          initialTrivia={trivia}
          onTriviaUpdate={handleTriviaUpdate}
        />
      </div>
    </div>
  );
}
