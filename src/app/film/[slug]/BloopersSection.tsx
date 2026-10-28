"use client";

import { useState, useEffect } from "react";
import { Sparkles, PlusCircle, AlertCircle, Filter, Send, Trophy, CheckCircle } from "lucide-react";
import { Film, Blooper, BlooperCategoria } from "@/lib/types";
import BlooperItem from "@/components/BlooperItem";
import AuthModal from "@/components/AuthModal";
import { createClient } from "@/lib/supabase/client";

interface BloopersSectionProps {
  film: Film;
  initialBloopers: Blooper[];
  onBloopersUpdate?: (bloopers: Blooper[]) => void;
}

export default function BloopersSection({ film, initialBloopers, onBloopersUpdate }: BloopersSectionProps) {
  const [bloopers, setBloopers] = useState<Blooper[]>(initialBloopers);

  useEffect(() => {
    setBloopers(initialBloopers);
  }, [initialBloopers]);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("Tutte");
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Form segnalazione manuale
  const [minuto, setMinuto] = useState("");
  const [categoria, setCategoria] = useState<BlooperCategoria>("Errori di scena / Posizione");
  const [descrizione, setDescrizione] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }: { data: any }) => {
      const u = data?.user || null;
      setUser(u);
      if (u) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("tier, tipo_abbonamento, punti")
          .eq("id", u.id)
          .maybeSingle();
        if (prof) setProfile(prof);

        // Idrata i voti dell'utente per i bloopers del film
        const blooperIds = bloopers.map((b) => b.id);
        if (blooperIds.length > 0) {
          const { data: userVotes } = await supabase
            .from("voti_bloopers")
            .select("errore_id, tipo")
            .eq("user_id", u.id)
            .in("errore_id", blooperIds);

          if (userVotes && userVotes.length > 0) {
            const voteMap = new Map(userVotes.map((v: any) => [v.errore_id, v.tipo]));
            setBloopers((prev) =>
              prev.map((b) => ({
                ...b,
                voto_utente: (voteMap.get(b.id) as any) || b.voto_utente,
              }))
            );
          }
        }
      }
    });
  }, []);

  // Generazione bloopers con Gemini
  const handleGenerateWithAI = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
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
        setBloopers((prev) => {
          const next = [...prev, ...data.bloopers];
          onBloopersUpdate?.(next);
          return next;
        });
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

  const [sortBy, setSortBy] = useState<"minuto" | "conferme">("minuto");

  const parseMinuto = (m: string) => {
    if (!m) return 0;
    const cleaned = m.replace(/[^0-9:]/g, "");
    const parts = cleaned.split(":").map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return Number(cleaned) || 0;
  };

  const filteredBloopers = bloopers
    .filter((b) => (selectedCategory === "Tutte" ? true : b.categoria === selectedCategory))
    .sort((a, b) => {
      if (sortBy === "conferme") {
        const diff = (b.conferme || 0) - (a.conferme || 0);
        if (diff !== 0) return diff;
        return parseMinuto(a.minuto) - parseMinuto(b.minuto);
      }
      return parseMinuto(a.minuto) - parseMinuto(b.minuto);
    });

  return (
    <div className="mt-2">
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
            onClick={() => {
              if (!user) {
                setShowAuthModal(true);
              } else {
                setShowSubmitModal(true);
              }
            }}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-800 px-3.5 py-2 text-xs font-bold text-zinc-200 transition-colors"
          >
            <PlusCircle className="h-4 w-4 text-amber-400" />
            Segnala Errore
          </button>
        </div>
      </div>

      {/* Categorie Filter Pills & Ordinamento */}
      {bloopers.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-zinc-800/50">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            <Filter className="h-3.5 w-3.5 text-zinc-500 shrink-0 mr-1" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  selectedCategory === cat
                    ? "bg-amber-500 text-zinc-950 font-bold shadow"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Toggle Ordinamento (Minuto / Conferme) */}
          <div className="flex items-center gap-1.5 shrink-0 bg-zinc-900/90 border border-zinc-800 p-1 rounded-xl self-start sm:self-auto">
            <span className="text-[11px] font-medium text-zinc-400 px-1.5">Ordina:</span>
            <button
              type="button"
              onClick={() => setSortBy("minuto")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                sortBy === "minuto"
                  ? "bg-zinc-800 text-amber-400 border border-amber-500/30 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              ⏱️ Minuto
            </button>
            <button
              type="button"
              onClick={() => setSortBy("conferme")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                sortBy === "conferme"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              👍 Più confermati
            </button>
          </div>
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
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>✍️ Segnala un Nuovo Blooper</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="text-zinc-400 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-zinc-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Box Trasparenza Punti & Premi */}
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-zinc-900 to-zinc-950 p-4 mb-4 text-xs space-y-2.5 shadow-md">
              <div className="flex items-center justify-between">
                <span className="font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5 text-[11px]">
                  <Trophy className="h-3.5 w-3.5" /> Come e quanti punti ricevi:
                </span>
                {profile && (
                  <span className="text-[11px] font-bold text-zinc-300">
                    I tuoi punti: <strong className="text-amber-400">{profile.punti || 0} pt</strong>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-300">
                <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
                  <div className="font-bold text-white flex items-center gap-1 mb-1">
                    <span className="text-emerald-400">🎯 +10 Punti</span> per approvazione
                  </div>
                  <p className="text-zinc-400 text-[10px] leading-tight">
                    Ad ogni blooper approvato ricevi 10 punti. 
                    <strong className="text-amber-300"> +20 Punti (2x)</strong> per membri con Piano Annuale, Lifetime o Amministratore!
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80">
                  <div className="font-bold text-white flex items-center gap-1 mb-1">
                    <span className="text-amber-400">🎁 Mesi Premium Gratis</span>
                  </div>
                  <p className="text-zinc-400 text-[10px] leading-tight">
                    Ogni <strong className="text-white">50 punti</strong> accumulati sblocchi in automatico <strong className="text-amber-300">1 mese di Premium gratuito</strong>. A 10.000 punti sblocchi il <strong className="text-amber-300">Lifetime a vita!</strong>
                  </p>
                </div>
              </div>
            </div>

            {submitSuccess ? (
              <div className="py-6 text-center space-y-3 animate-in fade-in">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mx-auto">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <h4 className="text-base font-bold text-emerald-400">
                  Segnalazione inviata con successo! 🎉
                </h4>
                <p className="text-xs text-zinc-300 max-w-sm mx-auto leading-relaxed">
                  La tua segnalazione è stata inviata alla moderazione. Appena verificata e approvata dallo staff, riceverai <strong className="text-amber-300">{((user?.email && (user.email.toLowerCase() === "mrtrrt67@gmail.com" || user.email.toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase())) || profile?.tipo_abbonamento === "annuale" || profile?.tipo_abbonamento === "lifetime") ? "+20 Punti (Punti 2x Raddoppiati!)" : "+10 Punti"}</strong> direttamente sul tuo profilo per scalare la classifica!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitSuccess(false);
                    setShowSubmitModal(false);
                  }}
                  className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white transition"
                >
                  Chiudi
                </button>
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

      {/* Modale Autenticazione per visitatori ospiti */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}
