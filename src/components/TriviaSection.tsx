"use client";

import { useState, useEffect } from "react";
import { 
  Sparkles, 
  Lightbulb, 
  PlusCircle, 
  Heart, 
  Share2, 
  Check, 
  Clapperboard, 
  Film, 
  BookOpen, 
  Send, 
  X,
  MessageSquare,
  Award
} from "lucide-react";
import { Film as FilmType, MovieTrivia, TriviaCategoria } from "@/lib/types";
import AuthModal from "@/components/AuthModal";
import ConfirmModal from "@/components/ConfirmModal";
import { createClient } from "@/lib/supabase/client";

interface TriviaSectionProps {
  film: FilmType;
  initialTrivia: MovieTrivia[];
  onTriviaUpdate?: (trivia: MovieTrivia[]) => void;
}

const CATEGORIES: TriviaCategoria[] = [
  "Tutte",
  "Curiosità & Retroscena",
  "Aneddoti dal set",
  "Casting & Scelte",
  "Segreti di produzione",
  "Effetti speciali & Trucco",
  "Citazioni & Easter Egg",
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Curiosità & Retroscena": { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  "Aneddoti dal set": { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  "Casting & Scelte": { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  "Segreti di produzione": { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  "Effetti speciali & Trucco": { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30" },
  "Citazioni & Easter Egg": { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30" },
};

export default function TriviaSection({ film, initialTrivia, onTriviaUpdate }: TriviaSectionProps) {
  const [triviaList, setTriviaList] = useState<MovieTrivia[]>(initialTrivia);
  const [selectedCategory, setSelectedCategory] = useState<string>("Tutte");
  const [user, setUser] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string; variant?: "danger" | "warning" | "info" } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  // Form proposta manuale
  const [formCategoria, setFormCategoria] = useState<TriviaCategoria>("Curiosità & Retroscena");
  const [formTitolo, setFormTitolo] = useState("");
  const [formDescrizione, setFormDescrizione] = useState("");
  const [formFonte, setFormFonte] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: any }) => {
      setUser(data?.user || null);
    });

    // Carica liked IDs da localStorage se presenti
    try {
      const storedLikes = localStorage.getItem("filmbloopers_trivia_likes");
      if (storedLikes) {
        setLikedIds(new Set(JSON.parse(storedLikes)));
      }
    } catch {}
  }, []);

  // Generazione con Gemini
  const handleGenerateTrivia = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/trivia/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          film_id: film.id,
          titolo: film.titolo,
          anno: film.anno,
          regista: film.regista,
          attori: film.attori,
          trama: film.trama,
        }),
      });

      const data = await res.json();
      if (res.ok && data.trivia && data.trivia.length > 0) {
        setTriviaList((prev) => {
          const next = [...prev, ...data.trivia];
          onTriviaUpdate?.(next);
          return next;
        });
      } else {
        setAlertModal({
          title: "Generazione Curiosità",
          message: data.error || "Impossibile recuperare nuove curiosità al momento.",
          variant: "warning",
        });
      }
    } catch (err) {
      console.error(err);
      setAlertModal({
        title: "Errore di connessione",
        message: "Si è verificato un problema di rete durante la generazione.",
        variant: "danger",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Metti like a una curiosità
  const handleLike = async (item: MovieTrivia) => {
    if (likedIds.has(item.id)) return;

    // Aggiornamento ottimistico
    setLikedIds((prev) => {
      const next = new Set(prev).add(item.id);
      try {
        localStorage.setItem("filmbloopers_trivia_likes", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });

    setTriviaList((prev) =>
      prev.map((t) => (t.id === item.id ? { ...t, likes: (t.likes || 0) + 1 } : t))
    );

    try {
      await fetch("/api/trivia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like", trivia_id: item.id }),
      });
    } catch (err) {
      console.error("Errore salvataggio like:", err);
    }
  };

  // Condividi curiosità
  const handleShare = async (item: MovieTrivia) => {
    const shareText = `Curiosità su "${film.titolo}": ${item.titolo}\n${window.location.href}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  // Invia proposta utente
  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!formTitolo.trim() || !formDescrizione.trim()) {
      setAlertModal({
        title: "Dati mancanti",
        message: "Compila sia il titolo che la descrizione della curiosità.",
        variant: "warning",
      });
      return;
    }

    setSubmitting(true);
    setSubmitMessage(null);
    try {
      const res = await fetch("/api/trivia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          film_id: film.id,
          categoria: formCategoria,
          titolo: formTitolo.trim(),
          descrizione: formDescrizione.trim(),
          fonte: formFonte.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSubmitMessage(data.message || "Curiosità inviata con successo!");
        if (data.trivia?.approvato) {
          setTriviaList((prev) => {
            const next = [data.trivia, ...prev];
            onTriviaUpdate?.(next);
            return next;
          });
        }
        setTimeout(() => {
          setShowSubmitModal(false);
          setSubmitMessage(null);
          setFormTitolo("");
          setFormDescrizione("");
          setFormFonte("");
        }, 2200);
      } else {
        setAlertModal({
          title: "Invio Curiosità",
          message: data.error || "Errore durante l'invio della proposta.",
          variant: "warning",
        });
      }
    } catch (err) {
      console.error(err);
      setAlertModal({
        title: "Errore di connessione",
        message: "Si è verificato un errore di connessione durante l'invio.",
        variant: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filtra curiosità per categoria
  const filteredTrivia = selectedCategory === "Tutte"
    ? triviaList
    : triviaList.filter((t) => t.categoria === selectedCategory);

  return (
    <section className="mt-2 rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
      {/* Header Sezione Curiosità */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-black text-amber-400 mb-2">
            <Lightbulb className="h-3.5 w-3.5 animate-pulse" />
            ANEDDOTI & RETROSCENA
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            Curiosità dal Set
            <span className="text-sm font-semibold text-zinc-400 bg-zinc-800/80 border border-zinc-700 px-2.5 py-0.5 rounded-full">
              {triviaList.length}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Segreti di produzione, scelte di casting, improvvisazioni e retroscena esclusivi di <strong>{film.titolo}</strong>.
          </p>
        </div>

        {/* Pulsanti Azione */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              if (!user) setShowAuthModal(true);
              else setShowSubmitModal(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-4 py-2 text-xs font-bold text-zinc-200 transition-all shadow-md active:scale-95"
          >
            <PlusCircle className="h-4 w-4 text-zinc-400" />
            Proponi Curiosità
          </button>

          <button
            onClick={handleGenerateTrivia}
            disabled={generating}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 transition-all shadow-lg shadow-amber-500/10 active:scale-95 disabled:opacity-50"
          >
            <Sparkles className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Ricerca aneddoti..." : triviaList.length > 0 ? "Aggiungi altre con IA" : "Genera Curiosità IA"}
          </button>
        </div>
      </div>

      {/* Categorie Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto py-4 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                isActive
                  ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20"
                  : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Lista Curiosità */}
      {filteredTrivia.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 py-12 px-4 text-center">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
            <BookOpen className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white">Nessuna curiosità in questa categoria</h3>
          <p className="text-xs text-zinc-400 max-w-md mt-1 mb-4">
            Non sono ancora presenti aneddoti per questo filtro. Clicca sul pulsante qui sotto per generare le prime curiosità verificate con l&apos;intelligenza artificiale!
          </p>
          <button
            onClick={handleGenerateTrivia}
            disabled={generating}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:brightness-110 active:scale-95 transition"
          >
            <Sparkles className="h-4 w-4" />
            {generating ? "Generazione..." : "Scopri curiosità con l'IA"}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {filteredTrivia.map((item, index) => {
            const colors = CATEGORY_COLORS[item.categoria] || {
              bg: "bg-zinc-800/60",
              text: "text-zinc-300",
              border: "border-zinc-700",
            };
            const isLiked = likedIds.has(item.id);
            const isCopied = copiedId === item.id;

            return (
              <div
                key={item.id || index}
                id={`trivia-${item.id}`}
                className="group relative flex flex-col justify-between rounded-2xl border border-zinc-800/90 bg-zinc-900/40 p-5 hover:border-amber-500/40 hover:bg-zinc-900/70 transition-all shadow-md hover:shadow-xl hover:shadow-amber-500/5"
              >
                <div>
                  {/* Top bar card: Categoria + Fonte */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-[11px] font-bold border ${colors.bg} ${colors.text} ${colors.border}`}
                    >
                      <Clapperboard className="h-3 w-3" />
                      {item.categoria}
                    </span>

                    {item.fonte && (
                      <span className="text-[10px] font-medium text-zinc-500 italic max-w-[150px] truncate" title={item.fonte}>
                        Fonte: {item.fonte}
                      </span>
                    )}
                  </div>

                  {/* Titolo Curiosità */}
                  <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors leading-snug">
                    {item.titolo}
                  </h3>

                  {/* Descrizione Aneddoto */}
                  <p className="mt-2.5 text-xs sm:text-sm text-zinc-300 font-normal leading-relaxed">
                    {item.descrizione}
                  </p>
                </div>

                {/* Footer Card: Autore / Provenienza + Azioni Like & Share */}
                <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {item.provenienza === "ia" ? (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                        <Sparkles className="h-3 w-3" /> IA Archivista
                      </span>
                    ) : (
                      <span className="text-zinc-400 font-medium">
                        di {item.inserito_da || "Appassionato"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Pulsante Like */}
                    <button
                      onClick={() => handleLike(item)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                        isLiked
                          ? "bg-rose-500/10 border-rose-500/40 text-rose-400"
                          : "border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white"
                      }`}
                      title="Curiosità interessante"
                    >
                      <Heart className={`h-3.5 w-3.5 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
                      <span>{item.likes || 0}</span>
                    </button>

                    {/* Pulsante Share */}
                    <button
                      onClick={() => handleShare(item)}
                      className="p-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition"
                      title="Condividi curiosità"
                    >
                      {isCopied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Share2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Banner On-Demand per scoprire e aggiungere altri aneddoti */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Vuoi scoprire altri aneddoti esclusivi?</h4>
              <p className="text-xs text-zinc-400">L&apos;IA cercherà altri retroscena cinematografici verificati senza ripetere quelli già mostrati.</p>
            </div>
          </div>
          <button
            onClick={handleGenerateTrivia}
            disabled={generating}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-5 py-2.5 text-xs font-bold text-zinc-950 transition-all shadow-md shadow-amber-500/10 active:scale-95 disabled:opacity-50 whitespace-nowrap"
          >
            <Sparkles className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Ricerca in corso..." : "Aggiungi altre curiosità"}
          </button>
        </div>
      </>
    )}

      {/* Modal Proponi Curiosità */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl">
            <button
              onClick={() => setShowSubmitModal(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Proponi una Curiosità</h3>
                <p className="text-xs text-zinc-400">{film.titolo}</p>
              </div>
            </div>

            {submitMessage ? (
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center text-emerald-400 text-sm font-semibold">
                <Check className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                {submitMessage}
              </div>
            ) : (
              <form onSubmit={handleSubmitProposal} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value as TriviaCategoria)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
                  >
                    {CATEGORIES.filter((c) => c !== "Tutte").map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Titolo dell&apos;aneddoto / curiosità
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Es: L'improvvisazione memorabile durante la cena"
                    value={formTitolo}
                    onChange={(e) => setFormTitolo(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Descrizione dettagliata
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Racconta cosa è successo sul set o durante la produzione..."
                    value={formDescrizione}
                    onChange={(e) => setFormDescrizione(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Fonte (opzionale)
                  </label>
                  <input
                    type="text"
                    placeholder="Es: Intervista Vanity Fair 2021, Commento audio DVD"
                    value={formFonte}
                    onChange={(e) => setFormFonte(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none placeholder:text-zinc-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(false)}
                    className="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-zinc-950 hover:brightness-110 active:scale-95 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {submitting ? "Invio in corso..." : "Invia Curiosità"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Auth Modal se non loggato */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Cinematic Modal al posto di alert nativo */}
      <ConfirmModal
        isOpen={Boolean(alertModal)}
        title={alertModal?.title}
        message={alertModal?.message || ""}
        confirmLabel="Ho capito"
        variant={alertModal?.variant || "warning"}
        onConfirm={() => setAlertModal(null)}
        onCancel={() => setAlertModal(null)}
      />
    </section>
  );
}
