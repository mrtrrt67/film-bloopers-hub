"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { 
  Film, 
  Search, 
  Image as ImageIcon, 
  Users, 
  RefreshCw, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  Check, 
  X, 
  ExternalLink,
  Sparkles
} from "lucide-react";
import { normalizePosterUrl } from "@/lib/tmdb";
import ConfirmModal from "@/components/ConfirmModal";

interface AdminFilmsTabProps {
  initialFilter?: string;
}

export default function AdminFilmsTab({ initialFilter = "all" }: AdminFilmsTabProps) {
  const [films, setFilms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>(initialFilter); // 'all', 'missing_poster', 'missing_cast', 'duplicates'
  
  // Azioni bulk
  const [updatingAllPosters, setUpdatingAllPosters] = useState(false);
  const [updatingAllCast, setUpdatingAllCast] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: "danger" | "warning";
    onConfirm: () => void;
  } | null>(null);

  const openConfirm = (title: string, message: string, onConfirm: () => void, confirmLabel = "Conferma", variant: "danger" | "warning" = "danger") => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmLabel,
      variant,
      onConfirm: () => {
        setConfirmModal(null);
        onConfirm();
      },
    });
  };

  // Modal Modifica Film
  const [editingFilm, setEditingFilm] = useState<any | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  // Ricerca Candidati TMDB nel Modal
  const [tmdbSearchQuery, setTmdbSearchQuery] = useState("");
  const [tmdbSearchYear, setTmdbSearchYear] = useState("");
  const [tmdbCandidates, setTmdbCandidates] = useState<any[]>([]);
  const [searchingTmdb, setSearchingTmdb] = useState(false);
  const [tmdbSearchError, setTmdbSearchError] = useState<string | null>(null);
  const [tmdbSearched, setTmdbSearched] = useState(false);

  const fetchFilms = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/films");
      if (res.ok) {
        const json = await res.json();
        setFilms(json.films || []);
      }
    } catch (err) {
      console.error("Errore fetch films:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilms();
  }, []);

  // Mappa di frequenza dei poster per rilevare duplicati
  const posterFrequency: Record<string, number> = {};
  for (const f of films) {
    if (f.poster_url && f.poster_url.trim()) {
      posterFrequency[f.poster_url] = (posterFrequency[f.poster_url] || 0) + 1;
    }
  }

  // Filtraggio film
  const filteredFilms = films.filter((f) => {
    // 1. Filtro testuale
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (f.titolo || "").toLowerCase().includes(q);
      const matchDirector = (f.regista || "").toLowerCase().includes(q);
      const matchGenre = (f.genere || "").toLowerCase().includes(q);
      const matchCast = (f.attori || "").toLowerCase().includes(q);
      if (!matchTitle && !matchDirector && !matchGenre && !matchCast) return false;
    }

    // 2. Filtro categoria
    if (filterType === "missing_poster") {
      return !f.poster_url || f.poster_url.trim() === "";
    }
    if (filterType === "missing_cast") {
      return !f.attori || f.attori.trim() === "" || f.attori === "N/D";
    }
    if (filterType === "duplicates") {
      return f.poster_url && posterFrequency[f.poster_url] > 1;
    }

    return true;
  });

  // Aggiorna tutte le locandine mancanti
  const handleUpdateAllPosters = async () => {
    openConfirm(
      "Ricerca Automatica Locandine",
      "Avviare la ricerca automatica TMDB per tutte le locandine mancanti?",
      async () => {
        try {
          setUpdatingAllPosters(true);
          setActionMessage(null);
          const res = await fetch("/api/admin/posters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ all: true }),
          });
          const data = await res.json();
          if (res.ok) {
            setActionMessage(`✅ Recuperate con successo ${data.updatedCount} locandine da TMDB!`);
            await fetchFilms();
          } else {
            setActionMessage(`❌ ${data.error || "Errore aggiornamento locandine"}`);
          }
        } catch (err) {
          console.error(err);
          setActionMessage("❌ Errore di connessione");
        } finally {
          setUpdatingAllPosters(false);
        }
      },
      "Avvia Ricerca TMDB",
      "warning"
    );
  };

  // Aggiorna tutto il cast mancante
  const handleUpdateAllCast = async () => {
    openConfirm(
      "Recupero Cast TMDB",
      "Avviare la ricerca automatica TMDB per tutti i film con cast vuoto?",
      async () => {
        try {
          setUpdatingAllCast(true);
          setActionMessage(null);
          const res = await fetch("/api/admin/posters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "bulk_cast" }),
          });
          const data = await res.json();
          if (res.ok) {
            setActionMessage(`✅ Recuperato con successo il cast per ${data.updatedCount} film!`);
            await fetchFilms();
          } else {
            setActionMessage(`❌ ${data.error || "Errore aggiornamento cast"}`);
          }
        } catch (err) {
          console.error(err);
          setActionMessage("❌ Errore di connessione");
        } finally {
          setUpdatingAllCast(false);
        }
      },
      "Avvia Recupero Cast",
      "warning"
    );
  };

  // Stato per spiegazione RLS se la cancellazione è bloccata
  const [rlsModalOpen, setRlsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Elimina film
  const handleDeleteFilm = async (film: any) => {
    openConfirm(
      "Elimina Film e Bloopers",
      `Sei sicuro di voler eliminare definitivamente il film "${film.titolo}" (${film.anno}) e tutti i suoi bloopers associati? Questa operazione è irreversibile.`,
      async () => {
        try {
          setDeletingId(film.id);
          const res = await fetch(`/api/admin/films?id=${film.id}`, { method: "DELETE" });
          const data = await res.json();
          if (res.ok && data.success) {
            setFilms((prev) => prev.filter((item) => item.id !== film.id));
            setActionMessage(`🗑️ Film "${film.titolo}" eliminato con successo dal database.`);
          } else {
            if (data.requiresRlsPolicy) {
              setRlsModalOpen(true);
            } else {
              setActionMessage(`❌ ${data.error || "Errore durante l'eliminazione."}`);
            }
          }
        } catch (err) {
          console.error(err);
          setActionMessage("❌ Errore di connessione.");
        } finally {
          setDeletingId(null);
        }
      }
    );
  };

  const copySqlToClipboard = () => {
    const sql = `CREATE POLICY "Allow delete on films" ON films FOR DELETE USING (true);\nCREATE POLICY "Allow delete on errori" ON errori FOR DELETE USING (true);\nCREATE POLICY "Allow delete on voti_bloopers" ON voti_bloopers FOR DELETE USING (true);`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // Apertura modale di modifica
  const openEditModal = (film: any) => {
    setEditingFilm({ ...film });
    setTmdbSearchQuery(film.titolo || "");
    setTmdbSearchYear(film.anno ? String(film.anno) : "");
    setTmdbCandidates([]);
    setTmdbSearchError(null);
    setTmdbSearched(false);
    setPreviewError(false);
  };

  // Cerca candidati su TMDB
  const handleSearchTmdbCandidates = async () => {
    if (!tmdbSearchQuery.trim()) return;
    try {
      setSearchingTmdb(true);
      setTmdbSearchError(null);
      setTmdbSearched(true);
      const params = new URLSearchParams({ q: tmdbSearchQuery.trim() });
      if (tmdbSearchYear.trim()) params.append("year", tmdbSearchYear.trim());
      const res = await fetch(`/api/admin/tmdb-search?${params.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setTmdbCandidates(json.candidates || []);
      } else {
        setTmdbCandidates([]);
        setTmdbSearchError(json.error || "Errore durante la ricerca TMDB");
      }
    } catch (err: any) {
      console.error("Errore ricerca candidati TMDB:", err);
      setTmdbSearchError(err.message || "Errore di connessione a TMDB");
    } finally {
      setSearchingTmdb(false);
    }
  };

  // Importa dettagli completi da candidato TMDB
  const handleSelectFullTmdbCandidate = async (candidateId: number) => {
    try {
      setSearchingTmdb(true);
      const cand = tmdbCandidates.find((c) => c.id === candidateId);
      const url = cand?.media_type
        ? `/api/admin/tmdb-search?tmdbId=${candidateId}&mediaType=${cand.media_type}`
        : `/api/admin/tmdb-search?tmdbId=${candidateId}`;
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        setPreviewError(false);
        setEditingFilm((prev: any) => ({
          ...prev,
          titolo: d.title || prev.titolo,
          anno: d.year || prev.anno,
          regista: d.regista || prev.regista,
          attori: d.attori || prev.attori,
          genere: d.genere || prev.genere,
          trama: d.trama || prev.trama,
          poster_url: d.poster_url || prev.poster_url,
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingTmdb(false);
    }
  };

  // Salva modifiche al film
  const handleSaveFilm = async () => {
    if (!editingFilm?.id) return;
    try {
      setSavingEdit(true);
      const res = await fetch("/api/admin/films", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingFilm),
      });
      if (res.ok) {
        const json = await res.json();
        setFilms((prev) => prev.map((f) => (f.id === json.film.id ? json.film : f)));
        setEditingFilm(null);
      } else {
        setActionMessage("❌ Errore salvataggio modifiche film.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  };

  const missingPostersCount = films.filter((f) => !f.poster_url || f.poster_url.trim() === "").length;
  const missingCastCount = films.filter((f) => !f.attori || f.attori.trim() === "" || f.attori === "N/D").length;
  const duplicatePostersCount = films.filter((f) => f.poster_url && posterFrequency[f.poster_url] > 1).length;

  return (
    <div className="space-y-6">
      {/* BARRA SUPERIORE: AZIONI VELOCI & CONTEGGI */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-xl">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Film className="h-5 w-5 text-amber-400" />
            Archivio Film ({films.length} pellicole)
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Gestisci schede, correggi locandine errate o duplicate e aggiorna il cast via TMDB.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleUpdateAllPosters}
            disabled={updatingAllPosters || missingPostersCount === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-zinc-950 hover:brightness-110 active:scale-95 transition disabled:opacity-50"
          >
            <ImageIcon className={`h-3.5 w-3.5 ${updatingAllPosters ? "animate-spin" : ""}`} />
            <span>Recupera Locandine Mancanti ({missingPostersCount})</span>
          </button>

          <button
            onClick={handleUpdateAllCast}
            disabled={updatingAllCast || missingCastCount === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-800 text-zinc-200 border border-zinc-700 hover:text-white hover:bg-zinc-700 active:scale-95 transition disabled:opacity-50"
          >
            <Users className={`h-3.5 w-3.5 ${updatingAllCast ? "animate-spin" : ""}`} />
            <span>Recupera Cast Mancante ({missingCastCount})</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-300 flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* FILTRI & RICERCA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Cerca per titolo, regista, genere o attori..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-zinc-900 border border-zinc-800 pl-9 pr-4 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              filterType === "all"
                ? "bg-amber-500 text-zinc-950"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
            }`}
          >
            Tutti ({films.length})
          </button>
          <button
            onClick={() => setFilterType("missing_poster")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              filterType === "missing_poster"
                ? "bg-amber-500 text-zinc-950"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
            }`}
          >
            Senza Poster ({missingPostersCount})
          </button>
          <button
            onClick={() => setFilterType("missing_cast")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              filterType === "missing_cast"
                ? "bg-amber-500 text-zinc-950"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
            }`}
          >
            Senza Cast ({missingCastCount})
          </button>
          <button
            onClick={() => setFilterType("duplicates")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              filterType === "duplicates"
                ? "bg-amber-500 text-zinc-950"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
            }`}
          >
            Locandine Condivise ({duplicatePostersCount})
          </button>
        </div>
      </div>

      {/* ELENCO FILM */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
        </div>
      ) : filteredFilms.length === 0 ? (
        <div className="py-12 text-center text-zinc-500 text-xs rounded-2xl border border-zinc-800 bg-zinc-900/40">
          Nessun film trovato con i criteri selezionati.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFilms.map((film) => {
            const isDuplicate = film.poster_url && posterFrequency[film.poster_url] > 1;
            const isMissingPoster = !film.poster_url || film.poster_url.trim() === "";
            const isMissingCast = !film.attori || film.attori.trim() === "" || film.attori === "N/D";

            return (
              <div
                key={film.id}
                className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 hover:border-zinc-700 transition"
              >
                <div className="flex gap-3">
                  {/* Poster Thumbnail */}
                  <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                    {film.poster_url ? (
                      <Image
                        src={film.poster_url}
                        alt={film.titolo}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-zinc-700" />
                    )}
                  </div>

                  {/* Informazioni Film */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-sm font-bold text-white truncate">
                        {film.titolo}
                      </h4>
                      <span className="font-mono text-xs text-amber-400 shrink-0 font-bold">
                        {film.anno || "N/D"}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 truncate">
                      <strong>Regia:</strong> {film.regista || "N/D"}
                    </p>

                    <p className="text-[11px] text-zinc-400 truncate">
                      <strong>Genere:</strong> {film.genere || "N/D"}
                    </p>

                    <p className="text-[11px] text-zinc-500 line-clamp-1">
                      <strong>Cast:</strong> {film.attori || "N/D"}
                    </p>

                    {/* Badge diagnostici */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {isMissingPoster && (
                        <span className="rounded bg-rose-500/20 text-rose-300 text-[9px] font-bold px-1.5 py-0.5">
                          Senza Poster
                        </span>
                      )}
                      {isDuplicate && (
                        <span className="rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold px-1.5 py-0.5" title="Condivide il poster con altri film">
                          Poster Condiviso ({posterFrequency[film.poster_url]})
                        </span>
                      )}
                      {isMissingCast && (
                        <span className="rounded bg-zinc-800 text-zinc-400 text-[9px] font-bold px-1.5 py-0.5">
                          Senza Cast
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Azioni Scheda */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-800/60 text-xs">
                  <span className="text-[10px] text-zinc-500 font-mono">ID: {film.id}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(film)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-200 font-bold transition text-[11px]"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>Modifica</span>
                    </button>
                    <button
                      onClick={() => handleDeleteFilm(film)}
                      className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Elimina film"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL MODIFICA FILM & LOCANDINA INTERATTIVA */}
      {editingFilm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-amber-400" />
                  Modifica Scheda & Locandina TMDB
                </h3>
                <p className="text-xs text-zinc-400">
                  ID Database: <span className="font-mono font-bold text-amber-400">{editingFilm.id}</span>
                </p>
              </div>
              <button
                onClick={() => setEditingFilm(null)}
                className="rounded-lg p-1 text-zinc-500 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* SEZIONE 1: RICERCA & SCELTA LOCANDINA TMDB */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Ricerca e Scelta Locandina TMDB
                </h4>
                <span className="text-[11px] text-zinc-400">Risolvi discrepanze di trama/poster</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Nome film per ricerca TMDB..."
                  value={tmdbSearchQuery}
                  onChange={(e) => setTmdbSearchQuery(e.target.value)}
                  className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                />
                <input
                  type="text"
                  placeholder="Anno (opzionale)"
                  value={tmdbSearchYear}
                  onChange={(e) => setTmdbSearchYear(e.target.value)}
                  className="w-24 rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleSearchTmdbCandidates}
                  disabled={searchingTmdb}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:brightness-110 active:scale-95 transition disabled:opacity-50 shrink-0"
                >
                  {searchingTmdb ? "Ricerca..." : "Cerca su TMDB"}
                </button>
              </div>

              {/* Errore o Avviso Ricerca TMDB */}
              {tmdbSearchError && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-amber-300">Avviso Ricerca TMDB</p>
                    <p className="text-[11px] text-zinc-300">{tmdbSearchError}</p>
                    <p className="text-[10px] text-zinc-400">
                      Puoi comunque incollare qualsiasi link immagine valido direttamente nel campo &quot;URL Locandina&quot; in basso.
                    </p>
                  </div>
                </div>
              )}

              {/* Nessun risultato trovato */}
              {tmdbSearched && !tmdbSearchError && tmdbCandidates.length === 0 && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 text-center text-xs text-zinc-400">
                  Nessun risultato trovato su TMDB per &quot;{tmdbSearchQuery}&quot;. Prova a rimuovere l&apos;anno o incolla direttamente l&apos;URL della locandina qui sotto.
                </div>
              )}

              {/* RISULTATI CANDIDATI TMDB */}
              {tmdbCandidates.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-amber-500/20 max-h-56 overflow-y-auto pr-1">
                  <span className="text-[11px] text-zinc-400 font-bold block">
                    Trovati {tmdbCandidates.length} film/serie candidati su TMDB:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {tmdbCandidates.map((cand) => (
                      <div
                        key={cand.id}
                        className="flex gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/90 p-2 hover:border-amber-500/60 transition"
                      >
                        <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-zinc-950">
                          {cand.poster_url ? (
                            <Image src={cand.poster_url} alt={cand.title} fill unoptimized className="object-cover" sizes="44px" />
                          ) : (
                            <ImageIcon className="h-4 w-4 m-auto text-zinc-700" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-xs font-bold text-white truncate">{cand.title}</p>
                          <p className="text-[10px] text-zinc-400">
                            {cand.release_date ? cand.release_date.slice(0, 4) : "N/D"} | {cand.original_title}
                          </p>
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <button
                              onClick={() => {
                                setPreviewError(false);
                                setEditingFilm({ ...editingFilm, poster_url: cand.poster_url });
                              }}
                              className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded hover:bg-amber-500 hover:text-zinc-950 transition"
                            >
                              Usa solo poster
                            </button>
                            <button
                              onClick={() => handleSelectFullTmdbCandidate(cand.id)}
                              className="text-[10px] font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded hover:bg-zinc-700 transition"
                              title="Importa titolo, anno, regia, cast, trama e poster da questa scheda TMDB"
                            >
                              Importa tutto
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* SEZIONE 2: CAMPI EDITABILI DELLA SCHEDA FILM */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Anteprima Poster Attuale & URL */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-300 block">Locandina Attuale</label>
                <div className="relative aspect-[2/3] w-full max-w-[180px] mx-auto rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 flex items-center justify-center">
                  {editingFilm.poster_url && !previewError ? (
                    <Image
                      src={editingFilm.poster_url}
                      alt={editingFilm.titolo}
                      fill
                      unoptimized
                      onError={() => setPreviewError(true)}
                      className="object-cover"
                      sizes="180px"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3 text-center">
                      <ImageIcon className="h-8 w-8 text-zinc-600 mb-1" />
                      <span className="text-[11px] text-zinc-500">
                        {previewError ? "Impossibile caricare l'immagine da questo URL" : "Nessun poster"}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">URL Locandina</label>
                  <input
                    type="text"
                    value={editingFilm.poster_url || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const normalized = normalizePosterUrl(val);
                      setPreviewError(false);
                      setEditingFilm({ ...editingFilm, poster_url: normalized });
                    }}
                    placeholder="https://image.tmdb.org/... oppure themoviedb.org"
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-500 font-mono text-[11px]"
                  />
                  {editingFilm.poster_url && (
                    <button
                      onClick={() => {
                        setPreviewError(false);
                        setEditingFilm({ ...editingFilm, poster_url: null });
                      }}
                      className="text-[10px] text-rose-400 hover:underline mt-1 block"
                    >
                      Rimuovi locandina
                    </button>
                  )}
                </div>
              </div>

              {/* Campi Metadati */}
              <div className="md:col-span-2 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-zinc-300 block mb-1">Titolo Film</label>
                    <input
                      type="text"
                      value={editingFilm.titolo || ""}
                      onChange={(e) => setEditingFilm({ ...editingFilm, titolo: e.target.value })}
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">Anno</label>
                    <input
                      type="number"
                      value={editingFilm.anno || ""}
                      onChange={(e) => setEditingFilm({ ...editingFilm, anno: e.target.value })}
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">Regista</label>
                    <input
                      type="text"
                      value={editingFilm.regista || ""}
                      onChange={(e) => setEditingFilm({ ...editingFilm, regista: e.target.value })}
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-300 block mb-1">Genere</label>
                    <input
                      type="text"
                      value={editingFilm.genere || ""}
                      onChange={(e) => setEditingFilm({ ...editingFilm, genere: e.target.value })}
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">Cast (Attori principali)</label>
                  <input
                    type="text"
                    value={editingFilm.attori || ""}
                    onChange={(e) => setEditingFilm({ ...editingFilm, attori: e.target.value })}
                    placeholder="Separati da virgola"
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1">Trama (Sinossi)</label>
                  <textarea
                    rows={4}
                    value={editingFilm.trama || ""}
                    onChange={(e) => setEditingFilm({ ...editingFilm, trama: e.target.value })}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Pulsanti Modal */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
              <button
                onClick={() => setEditingFilm(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white transition"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveFilm}
                disabled={savingEdit}
                className="rounded-xl bg-amber-500 px-6 py-2 text-xs font-bold text-zinc-950 shadow-md hover:brightness-110 active:scale-95 transition disabled:opacity-50"
              >
                {savingEdit ? "Salvataggio..." : "Salva Modifiche"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ISTRUZIONI PER RLS SUPABASE */}
      {rlsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-amber-500/40 bg-zinc-950 p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <h3 className="text-base font-black text-white">
                  Abilita l&apos;Eliminazione su Supabase
                </h3>
              </div>
              <button
                onClick={() => setRlsModalOpen(false)}
                className="rounded-lg p-1 text-zinc-500 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
              <p>
                Il tuo database Supabase ha le <strong>Policy di Sicurezza RLS (Row Level Security)</strong> attive sulla tabella <code className="text-amber-400 bg-zinc-900 px-1 py-0.5 rounded">films</code>: questo impedisce la cancellazione fisica delle righe tramite la chiave pubblica, a meno che non si conceda il permesso.
              </p>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3.5 space-y-2">
                <span className="font-bold text-white block">
                  ⚡ Soluzione 1 (Immediata in 30 secondi):
                </span>
                <p className="text-[11px] text-zinc-400">
                  Apri la console di Supabase &rarr; vai su <strong>SQL Editor</strong> &rarr; incolla ed esegui questa query:
                </p>
                <pre className="p-2.5 rounded-lg bg-zinc-950 text-amber-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap border border-zinc-800">
{`CREATE POLICY "Allow delete on films" ON films FOR DELETE USING (true);
CREATE POLICY "Allow delete on errori" ON errori FOR DELETE USING (true);
CREATE POLICY "Allow delete on voti_bloopers" ON voti_bloopers FOR DELETE USING (true);`}
                </pre>
                <button
                  onClick={copySqlToClipboard}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-amber-500 text-zinc-950 font-bold text-xs hover:brightness-110 active:scale-95 transition"
                >
                  <Check className={`h-3.5 w-3.5 ${copiedSql ? "text-emerald-950" : ""}`} />
                  <span>{copiedSql ? "Copiato negli appunti!" : "Copia Codice SQL"}</span>
                </button>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3.5 space-y-1.5">
                <span className="font-bold text-white block">
                  🛡️ Soluzione 2 (Consigliata per la produzione):
                </span>
                <p className="text-[11px] text-zinc-400">
                  Nel pannello Supabase (<em>Project Settings &gt; API &gt; Project API keys</em>), copia la chiave segreta <strong>service_role (secret)</strong> e incollala nelle impostazioni di Vercel (<em>Settings &gt; Environment Variables</em>) con il nome <code className="text-amber-400">SUPABASE_SERVICE_ROLE_KEY</code>.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setRlsModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-zinc-800 text-zinc-200 font-bold text-xs hover:text-white hover:bg-zinc-700 transition"
              >
                Ho capito, chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          variant={confirmModal.variant}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
