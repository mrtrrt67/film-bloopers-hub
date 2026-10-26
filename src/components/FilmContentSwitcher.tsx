"use client";

import { useState, useEffect } from "react";
import { Film as FilmIcon, Lightbulb, Sparkles } from "lucide-react";
import { Film, Blooper, MovieTrivia } from "@/lib/types";
import BloopersSection from "@/app/film/[slug]/BloopersSection";
import TriviaSection from "@/components/TriviaSection";

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
  const [bloopersCount, setBloopersCount] = useState(initialBloopers.length);
  const [triviaCount, setTriviaCount] = useState(initialTrivia.length);

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
    setBloopersCount(updated.length);
  };

  const handleTriviaUpdate = (updated: MovieTrivia[]) => {
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
                Minutaggi al secondo, fotogrammi e voti della community
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
          initialBloopers={initialBloopers}
          onBloopersUpdate={handleBloopersUpdate}
        />
      </div>

      <div className={activeTab === "trivia" ? "block" : "hidden"}>
        <TriviaSection
          film={film}
          initialTrivia={initialTrivia}
          onTriviaUpdate={handleTriviaUpdate}
        />
      </div>
    </div>
  );
}
