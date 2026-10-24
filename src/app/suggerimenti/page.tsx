"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Lightbulb, 
  Send, 
  CheckCircle, 
  Film, 
  MessageSquare, 
  Sparkles, 
  ArrowLeft,
  HelpCircle
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SuggerimentiPage() {
  const [email, setEmail] = useState("");
  const [categoria, setCategoria] = useState("Film mancante");
  const [messaggio, setMessaggio] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: any }) => {
      if (data?.user?.email) {
        setEmail(data.user.email);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messaggio.trim()) {
      setError("Inserisci il testo del tuo suggerimento.");
      return;
    }
    if (!email.trim()) {
      setError("Inserisci un indirizzo email per eventuali comunicazioni.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fullMessage = `[${categoria}] ${messaggio.trim()}`;
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          messaggio: fullMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Errore durante l'invio");
      }

      setSuccess(true);
      setMessaggio("");
    } catch (err: any) {
      setError(err?.message || "Si è verificato un errore durante l'invio.");
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: "Film mancante", label: "🎬 Richiesta Film Mancante" },
    { id: "Correzione blooper", label: "⚠️ Correzione Blooper" },
    { id: "Nuova funzionalità", label: "🚀 Proposta Nuova Funzionalità" },
    { id: "Altro / Feedback", label: "💬 Altro / Feedback Generale" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white mb-6 transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Torna alla Home
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Colonna Sinistra: Form Suggerimento */}
        <div className="lg:col-span-7 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8 shadow-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-400 mb-4">
            <Lightbulb className="h-3.5 w-3.5" />
            <span>Spazio Community & Feedback</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Invia un Suggerimento allo Staff
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
            Hai trovato un errore nei dati, desideri richiedere l&apos;inserimento di una pellicola o hai idee per migliorare FilmBloopers Hub? Faccelo sapere compilando questo form.
          </p>

          {success ? (
            <div className="mt-8 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center space-y-3 animate-in fade-in">
              <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-emerald-300">Suggerimento Inviato con Successo!</h3>
              <p className="text-xs text-zinc-300 max-w-md mx-auto">
                Grazie per il tuo contributo prezioso! Il nostro team esaminerà la tua richiesta direttamente nella console di moderazione.
              </p>
              <button
                onClick={() => setSuccess(false)}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-zinc-950 hover:bg-emerald-400 transition"
              >
                Invia un altro suggerimento
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {error && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {error}
                </div>
              )}

              {/* Selettore Categoria */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2">
                  Tipo di suggerimento
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoria(c.id)}
                      className={`text-left px-3 py-2 rounded-xl text-xs font-semibold transition border ${
                        categoria === c.id
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  La tua email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@esempio.it"
                  required
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Messaggio */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Dettagli del suggerimento o richiesta
                </label>
                <textarea
                  value={messaggio}
                  onChange={(e) => setMessaggio(e.target.value)}
                  placeholder="Scrivi qui i dettagli del tuo suggerimento (es. titolo e anno del film mancante, correzione di un errore, o idea per il sito)..."
                  rows={5}
                  required
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-3.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-xs font-black text-zinc-950 shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {loading ? "Invio in corso..." : "Invia Suggerimento allo Staff"}
              </button>
            </form>
          )}
        </div>

        {/* Colonna Destra: Informazioni & Punti */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              Come funziona il sistema di segnalazione?
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Tutti i suggerimenti inviati da questa sezione arrivano direttamente nella console amministrativa dell&apos;admin per essere valutati ed eventualmente integrati nel database.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Film className="h-4 w-4 text-amber-400" />
              Vuoi segnalare un blooper specifico?
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Se conosci già il film presente a catalogo, puoi aprire la scheda del film e cliccare su <strong>&quot;Segnala Errore&quot;</strong>. Una volta approvato dallo staff, riceverai punti per scalare la classifica!
            </p>
            <div className="pt-2">
              <Link
                href="/esplora"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:underline"
              >
                Cerca nel catalogo film &rarr;
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-amber-400" />
              Hai domande sui punteggi?
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Scopri come accumulare punti con le tue segnalazioni approvate per sbloccare l&apos;abbonamento Premium gratuito a vita.
            </p>
            <div className="pt-2">
              <Link
                href="/classifica"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:underline"
              >
                Consulta la Classifica & Premi &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
