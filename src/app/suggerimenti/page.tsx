"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Lightbulb, 
  Send, 
  CheckCircle, 
  Film, 
  Sparkles, 
  ArrowLeft,
  HelpCircle,
  Zap,
  Award,
  UserCheck
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatPublicAuthor } from "@/lib/utils";
import AuthModal from "@/components/AuthModal";

export default function SuggerimentiPage() {
  const [email, setEmail] = useState("");
  const [categoria, setCategoria] = useState("Film mancante");
  const [messaggio, setMessaggio] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
        setEmail(data.user.email || "");
        try {
          const { data: prof } = await supabase
            .from("profiles")
            .select("tier, tipo_abbonamento, punti")
            .eq("id", data.user.id)
            .maybeSingle();
          if (prof) setProfile(prof);
        } catch (e) {
          console.error(e);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
    };

    fetchUserData();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        setUser(session.user);
        setEmail(session.user.email || "");
        supabase
          .from("profiles")
          .select("tier, tipo_abbonamento, punti")
          .eq("id", session.user.id)
          .maybeSingle()
          .then(({ data: prof }: { data: any }) => {
            if (prof) setProfile(prof);
          });
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const userHandle = user?.user_metadata?.username
    ? `@${user.user_metadata.username}`
    : (user?.email ? formatPublicAuthor(user.email) : "Utente");

  const isDoublePoints = profile && (profile.tipo_abbonamento === "annuale" || profile.tipo_abbonamento === "lifetime");

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
      let fullMessage = `[${categoria}] ${messaggio.trim()}`;
      if (categoria === "Correzione blooper") {
        if (user) {
          // Solo se loggato e partecipa alla classifica: entra direttamente in Moderazione Bloopers
          fullMessage = `[Correzione blooper] ${messaggio.trim()}`;
        } else {
          // Se non autenticato: non entra nel flusso di assegnazione punteggi di Moderazione
          fullMessage = `[Feedback generale - Correzione blooper (Ospite non registrato)] ${messaggio.trim()}`;
        }
      }

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

          {isDoublePoints && (
            <div className="mt-4 rounded-2xl border-2 border-amber-500/60 bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-950 p-4 shadow-lg shadow-amber-500/10 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider">
                  ⚡ Supporto Prioritario Attivo ({profile.tipo_abbonamento === "annuale" ? "Piano Annuale" : "Piano Lifetime"})
                </h4>
                <p className="text-[11px] text-zinc-300 mt-0.5 leading-normal">
                  Il tuo abbonamento include l&apos;assistenza prioritaria e il raddoppio dei punti in classifica: la tua richiesta verrà evidenziata in cima alla coda di moderazione!
                </p>
              </div>
            </div>
          )}

          {success ? (
            <div className="mt-8 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center space-y-3 animate-in fade-in">
              <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-emerald-300">Suggerimento Inviato con Successo!</h3>
              <p className="text-xs text-zinc-300 max-w-md mx-auto leading-relaxed">
                {categoria === "Correzione blooper" && user
                  ? "La tua correzione è stata inoltrata direttamente al team di Moderazione per la verifica e l'assegnazione dei tuoi punti in classifica!"
                  : "Grazie per il tuo contributo prezioso! Il nostro staff esaminerà il messaggio al più presto."}
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

              {/* Avviso specifico per Correzione Blooper: Autenticato vs Non Autenticato */}
              {categoria === "Correzione blooper" && (
                user ? (
                  <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-950/30 via-zinc-900 to-zinc-950 p-4 space-y-2 shadow-lg shadow-emerald-500/5 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        <Award className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">
                        Moderazione Diretta & Assegnazione Punti Attiva
                      </span>
                    </div>
                    <p className="text-xs text-zinc-200 leading-relaxed">
                      Sei connesso come <strong className="text-white">{userHandle}</strong> (Punti attuali: <strong className="text-amber-400">{profile?.punti ?? 0} pt</strong>).
                    </p>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      Inviando questo messaggio, la tua correzione entrerà <strong>direttamente nella console di Moderazione dello Staff</strong>. Una volta verificata e approvata, ti verranno accreditati <strong className="text-amber-300">{isDoublePoints ? "20 punti (Punti Doppi Piano Annuale/Lifetime)" : "10 punti base"}</strong> per scalare la classifica!
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-950 p-4 space-y-3 shadow-lg shadow-amber-500/10 animate-in fade-in">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 mt-0.5">
                        <Award className="h-4 w-4" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider">
                          Vuoi accumulare punti in classifica con questa correzione?
                        </h4>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          La correzione blooper viene inviata direttamente in <strong>Moderazione con assegnazione punti</strong> solo per gli utenti <strong>registrati e connessi</strong>.
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          Se invii senza effettuare l&apos;accesso, il messaggio verrà trattato unicamente come feedback generale allo staff senza attribuzione di punteggi.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAuthModalOpen(true)}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-zinc-950 hover:brightness-110 active:scale-95 transition shadow-md"
                    >
                      <UserCheck className="h-4 w-4" />
                      Accedi o Registrati per Guadagnare Punti e Inviare in Moderazione
                    </button>
                  </div>
                )
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  La tua email
                  {user && <span className="text-zinc-500 font-normal ml-2">(associata al tuo profilo)</span>}
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
                  placeholder="Scrivi qui i dettagli del tuo suggerimento (es. titolo del film, minuto esatto, errore riscontrato o proposta di correzione)..."
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
              Tutti i suggerimenti inviati da questa sezione arrivano direttamente nella console amministrativa dello staff. Le <strong>correzioni blooper inviate da utenti registrati</strong> vanno direttamente nella sezione Moderazione per l&apos;approvazione e l&apos;assegnazione dei punti in classifica.
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
              Scopri come accumulare punti con le tue segnalazioni e correzioni approvate per sbloccare l&apos;abbonamento Premium gratuito a vita.
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

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
