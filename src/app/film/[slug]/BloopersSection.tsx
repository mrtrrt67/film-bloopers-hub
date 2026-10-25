"use client";

import { useState, useEffect } from "react";
import { Sparkles, PlusCircle, AlertCircle, Filter, Send } from "lucide-react";
import { Film, Blooper, BlooperCategoria } from "@/lib/types";
import BlooperItem from "@/components/BlooperItem";
import { createClient } from "@/lib/supabase/client";

interface BloopersSectionProps {
  film: Film;
  initialBloopers: Blooper[];
}

export default function BloopersSection({ film, initialBloopers }: BloopersSectionProps) {
  const [bloopers, setBloopers] = useState<Blooper[]>(initialBloopers);
  const [user, setUser] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("Tutte");
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Form segnalazione manuale
  const [minuto, setMinuto] = useState("");
  const [categoria, setCategoria] = useState<BlooperCategoria>("Errori di scena / Posizione");
  const [descrizione, setDescrizione] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: any }) => setUser(data?.user || null));
  }, []);

  // Generazione bloopers con Gemini
  const handleGenerateWithAI = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/bloopers/generate", {
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
      if (res.ok && data.bloopers) {
        setBloopers((prev) => [...prev, ...data.bloopers]);
      } else {
        alert(data.error || "Impossibile generare bloopers con l'IA al momento.");
      }
    } catch (err) {
      console.error(err);
      alert("Si è verificato un errore di connessione.");
    } finally {
      setGenerating(false);
    }
  };

  // Invio segnalazione alla moderazione
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Devi essere loggato per inviare segnalazioni!");
      return;
    }

    setSubmitting(true);
    try {
        const authorHandle = user.user_metadata?.username
          ? `@${user.user_metadata.username.replace(/^@/, "")}`
          : user.email
          ? `@${user.email.split("@")[0]}`
          : "Utente";

        const { error: insertErr } = await supabase.from("errori").insert({
          film_id: film.id,
          minuto: minuto.trim() || "00:00",
          categoria,
          descrizione: descrizione.trim(),
          approvato: false,
          inserito_da: authorHandle,
          provenienza: "utente",
        });

      if (insertErr) throw insertErr;

      setSubmitSuccess(true);
      setMinuto("");
      setDescrizione("");
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowSubmitModal(false);
      }, 2000);
    } catch (err: any) {
      alert(err.message || "Errore durante l'invio della segnalazione.");
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    "Tutte",
    "Errori di scena / Posizione",
    "Troupe o microfoni visibili",
    "Anacronismi",
    "Errori storici o fattuali",
  ];

  const filteredBloopers = bloopers.filter((b) =>
    selectedCategory === "Tutte" ? true : b.categoria === selectedCategory
  );

  return (
    <div className="mt-8">
      {/* Header Sezione */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <span>Bloopers & Incongruenze</span>
            <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-xs font-bold text-amber-400">
              {bloopers.length}
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Errori documentati dalla community e verificati tramite analisi cinematografica.
          </p>
        </div>

        {/* Pulsanti Azioni */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateWithAI}
            disabled={generating}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-2 text-xs font-bold text-zinc-950 shadow-md shadow-amber-500/10 hover:brightness-110 transition-all disabled:opacity-50"
          >
            <Sparkles className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Analisi IA in corso..." : "Genera altri con IA"}
          </button>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-800 px-3.5 py-2 text-xs font-bold text-zinc-200 transition-colors"
          >
            <PlusCircle className="h-4 w-4 text-amber-400" />
            Segnala Errore
          </button>
        </div>
      </div>

      {/* Categorie Filter Pills */}
      {bloopers.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto py-4 scrollbar-none">
          <Filter className="h-3.5 w-3.5 text-zinc-500 shrink-0 mr-1" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                selectedCategory === cat
                  ? "bg-amber-500 text-zinc-950 font-bold"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Lista Bloopers */}
      {filteredBloopers.length > 0 ? (
        <div className="space-y-4 pt-2">
          {filteredBloopers.map((blooper) => (
            <BlooperItem
              key={blooper.id}
              blooper={blooper}
              userLoggedIn={!!user}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 p-12 text-center my-6">
          <AlertCircle className="h-10 w-10 text-zinc-600 mb-2" />
          <h3 className="text-sm font-bold text-white">Nessun blooper registrato</h3>
          <p className="text-xs text-zinc-400 max-w-sm mt-1 mb-4">
            Non ci sono ancora errori archiviati per questa pellicola. Usa l&apos;intelligenza artificiale per cercarli in pochi secondi!
          </p>
          <button
            onClick={handleGenerateWithAI}
            disabled={generating}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-zinc-950 shadow-md hover:brightness-110 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {generating ? "Generazione in corso..." : "Genera i primi Bloopers con l'IA"}
          </button>
        </div>
      )}

      {/* Modal Segnalazione Errore */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-1">✍️ Invia Segnalazione Blooper</h3>
            <p className="text-xs text-zinc-400 mb-4">
              La tua segnalazione verrà esaminata dal moderatore. Una volta approvata, guadagnerai punti per scalare la classifica!
            </p>

            {submitSuccess ? (
              <div className="py-8 text-center text-emerald-400 font-bold text-sm">
                Segnalazione inviata con successo alla moderazione! 🎉
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Minuto del film (es. 01:14:25 oppure 45:10)
                  </label>
                  <input
                    type="text"
                    required
                    value={minuto}
                    onChange={(e) => setMinuto(e.target.value)}
                    placeholder="01:14:25"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Categoria</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as BlooperCategoria)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Errori di scena / Posizione">Errori di scena / Posizione</option>
                    <option value="Troupe o microfoni visibili">Troupe o microfoni visibili</option>
                    <option value="Anacronismi">Anacronismi</option>
                    <option value="Errori storici o fattuali">Errori storici o fattuali</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Descrizione dettagliata dell&apos;errore
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={descrizione}
                    onChange={(e) => setDescrizione(e.target.value)}
                    placeholder="Descrivi cosa succede a schermo, cosa guardare e perché si tratta di un'incongruenza..."
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-sm text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
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
                    className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 shadow-md hover:brightness-110 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {submitting ? "Invio in corso..." : "Invia Segnalazione"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
