"use client";

import { useState, useEffect } from "react";
import { 
  Shield, 
  Image as ImageIcon, 
  Film, 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Users, 
  AlertTriangle, 
  ExternalLink,
  Search
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthModal from "@/components/AuthModal";

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [activeTab, setActiveTab] = useState<"posters" | "moderation" | "users">("posters");
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Dati Manutenzione Locandine
  const [missingFilms, setMissingFilms] = useState<any[]>([]);
  const [loadingMissing, setLoadingMissing] = useState(false);
  const [updatingAll, setUpdatingAll] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  // Dati Moderazione Bloopers
  const [pendingBloopers, setPendingBloopers] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  // Dati Utenti
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  const supabase = createClient();
  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
  const isAdmin = user && user.email && user.email.toLowerCase() === adminEmail;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: any }) => {
      setUser(data?.user || null);
      setLoadingUser(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user || null);
      setLoadingUser(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Carica i film senza poster
  const loadMissingPosters = async () => {
    setLoadingMissing(true);
    try {
      const res = await fetch("/api/admin/posters");
      if (res.ok) {
        const data = await res.json();
        setMissingFilms(data.films || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMissing(false);
    }
  };

  // Carica i bloopers in attesa di moderazione
  const loadPendingBloopers = async () => {
    setLoadingPending(true);
    try {
      const { data } = await supabase
        .from("errori")
        .select("*, films(titolo, anno, id)")
        .eq("approvato", false)
        .order("id", { ascending: false });

      setPendingBloopers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPending(false);
    }
  };

  // Carica la lista utenti
  const loadProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("punti", { ascending: false });

      setProfiles(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProfiles(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadMissingPosters();
      loadPendingBloopers();
      loadProfiles();
    }
  }, [isAdmin]);

  // Aggiorna tutte le locandine mancanti in 1 clic
  const handleUpdateAllPosters = async () => {
    setUpdatingAll(true);
    setBulkResult(null);
    try {
      const res = await fetch("/api/admin/posters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true, updateCast: true }),
      });

      const data = await res.json();
      if (res.ok) {
        setBulkResult(`Operazione completata! Recuperate con successo ${data.updatedCount} locandine da TMDB.`);
        await loadMissingPosters();
      } else {
        alert(data.error || "Errore durante l'aggiornamento massivo.");
      }
    } catch (err) {
      console.error(err);
      alert("Errore di connessione.");
    } finally {
      setUpdatingAll(false);
    }
  };

  // Aggiorna singola locandina
  const handleUpdateSinglePoster = async (filmId: number) => {
    setUpdatingId(filmId);
    try {
      const res = await fetch("/api/admin/posters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ film_id: filmId }),
      });

      const data = await res.json();
      if (res.ok) {
        await loadMissingPosters();
      } else {
        alert(data.error || "Impossibile trovare la locandina per questo film.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Approva blooper
  const handleApproveBlooper = async (id: number | string) => {
    try {
      await supabase.from("errori").update({ approvato: true }).eq("id", id);
      setPendingBloopers((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Rifiuta ed elimina blooper
  const handleRejectBlooper = async (id: number | string) => {
    if (!confirm("Sei sicuro di voler eliminare questa segnalazione?")) return;
    try {
      await supabase.from("errori").delete().eq("id", id);
      setPendingBloopers((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loadingUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  // Schermata per non autorizzati
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4">
          <Shield className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-black text-white">Area Riservata Amministratore</h1>
        <p className="text-sm text-zinc-400 mt-2 mb-6">
          Questa sezione è accessibile solo dall&apos;account amministratore autorizzato (<strong>{adminEmail}</strong>).
        </p>
        <button
          onClick={() => setAuthModalOpen(true)}
          className="rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-zinc-950 shadow-md hover:brightness-110"
        >
          Accedi con l&apos;Account Amministratore
        </button>

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Intestazione */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-zinc-800 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/20 text-amber-400">
              <Shield className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              Console Amministrazione
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Pannello di Controllo & Manutenzione
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Collegato come: <strong className="text-zinc-200">{user.email}</strong>
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-zinc-900 border border-zinc-800 p-1 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("posters")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "posters"
                ? "bg-amber-500 text-zinc-950 shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Locandine Mancanti ({missingFilms.length})
          </button>
          <button
            onClick={() => setActiveTab("moderation")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "moderation"
                ? "bg-amber-500 text-zinc-950 shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Moderazione Bloopers ({pendingBloopers.length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "users"
                ? "bg-amber-500 text-zinc-950 shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Gestione Utenti ({profiles.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Manutenzione Locandine */}
      {activeTab === "posters" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-zinc-900/60 to-zinc-950 p-6 shadow-xl">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Aggiornamento Intelligente Locandine & Cast TMDB
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                Cerca automaticamente i poster ufficiali in alta definizione su The Movie Database per tutti i film dell&apos;archivio che hanno la locandina mancante, ripulendo eventuali titoli complessi o con parentesi.
              </p>
            </div>

            <button
              onClick={handleUpdateAllPosters}
              disabled={updatingAll || missingFilms.length === 0}
              className="shrink-0 flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-xs font-bold text-zinc-950 shadow-md shadow-orange-500/20 hover:brightness-110 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${updatingAll ? "animate-spin" : ""}`} />
              <span>{updatingAll ? "Aggiornamento in corso..." : `Recupera tutte (${missingFilms.length}) da TMDB`}</span>
            </button>
          </div>

          {bulkResult && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-xs font-semibold text-emerald-300">
              {bulkResult}
            </div>
          )}

          {loadingMissing ? (
            <div className="flex justify-center py-12">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
            </div>
          ) : missingFilms.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 p-12 text-center">
              <CheckCircle className="h-10 w-10 text-emerald-400 mb-2" />
              <h4 className="text-base font-bold text-white">Tutte le locandine sono al completo!</h4>
              <p className="text-xs text-zinc-400 mt-1">
                Ogni film presente nel database ha una locandina ufficiale valida.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-xl">
              <div className="grid grid-cols-12 px-6 py-3.5 bg-zinc-950/60 border-b border-zinc-800 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                <div className="col-span-6 sm:col-span-5">Titolo Film</div>
                <div className="col-span-2 sm:col-span-2">Anno</div>
                <div className="hidden sm:block sm:col-span-3">Regista / Dettagli</div>
                <div className="col-span-4 sm:col-span-2 text-right">Azione</div>
              </div>

              <div className="divide-y divide-zinc-800/60">
                {missingFilms.map((film) => (
                  <div key={film.id} className="grid grid-cols-12 items-center px-6 py-3.5 text-sm hover:bg-zinc-800/20 transition-colors">
                    <div className="col-span-6 sm:col-span-5 font-bold text-white line-clamp-1">
                      {film.titolo}
                    </div>
                    <div className="col-span-2 sm:col-span-2 text-xs text-zinc-400">
                      {film.anno || "N/D"}
                    </div>
                    <div className="hidden sm:block sm:col-span-3 text-xs text-zinc-400 line-clamp-1">
                      {film.regista || "Regia non disponibile"}
                    </div>
                    <div className="col-span-4 sm:col-span-2 text-right">
                      <button
                        onClick={() => handleUpdateSinglePoster(film.id)}
                        disabled={updatingId === film.id}
                        className="rounded-lg bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 px-3 py-1.5 text-xs font-bold text-zinc-200 transition-all disabled:opacity-50"
                      >
                        {updatingId === film.id ? "Ricerca..." : "Rilancia TMDB"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Moderazione Bloopers */}
      {activeTab === "moderation" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">
              Bloopers in attesa di approvazione ({pendingBloopers.length})
            </h3>
            <button
              onClick={loadPendingBloopers}
              className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Aggiorna
            </button>
          </div>

          {loadingPending ? (
            <div className="flex justify-center py-12">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
            </div>
          ) : pendingBloopers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 p-12 text-center">
              <CheckCircle className="h-10 w-10 text-emerald-400 mb-2" />
              <h4 className="text-base font-bold text-white">Nessuna segnalazione in coda</h4>
              <p className="text-xs text-zinc-400 mt-1">
                Tutte le segnalazioni inviate dagli utenti sono state moderate.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingBloopers.map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-black text-amber-400">
                        {b.films?.titolo || "Film sconosciuto"} ({b.films?.anno || "N/D"})
                      </span>
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-300">
                        Minuto: {b.minuto}
                      </span>
                      <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                        {b.categoria}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                      {b.descrizione}
                    </p>
                    <span className="text-[10px] text-zinc-500 mt-2 block">
                      Segnalato da: {b.inserito_da || "Utente"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleApproveBlooper(b.id)}
                      className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-zinc-950 shadow-md hover:brightness-110"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Approva
                    </button>
                    <button
                      onClick={() => handleRejectBlooper(b.id)}
                      className="flex items-center gap-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 px-3 py-1.5 text-xs font-bold hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Rifiuta
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Gestione Utenti */}
      {activeTab === "users" && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-xl">
          <div className="grid grid-cols-12 px-6 py-3.5 bg-zinc-950/60 border-b border-zinc-800 text-xs font-bold text-zinc-400 uppercase tracking-wider">
            <div className="col-span-5">Email Utente</div>
            <div className="col-span-2 text-center">Tier</div>
            <div className="col-span-2 text-center">Punti</div>
            <div className="col-span-3 text-right">Chiamate Oggi</div>
          </div>

          <div className="divide-y divide-zinc-800/60">
            {profiles.map((p) => (
              <div key={p.id} className="grid grid-cols-12 items-center px-6 py-3.5 text-sm hover:bg-zinc-800/20 transition-colors">
                <div className="col-span-5 font-bold text-white truncate">
                  {p.email}
                </div>
                <div className="col-span-2 text-center">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                      p.tier === "premium"
                        ? "bg-amber-500/20 border border-amber-500/40 text-amber-300"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {p.tier || "free"}
                  </span>
                </div>
                <div className="col-span-2 text-center font-bold text-zinc-200">
                  {p.punti || 0}
                </div>
                <div className="col-span-3 text-right text-xs text-zinc-400">
                  {p.calls_today || 0} / 15
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
