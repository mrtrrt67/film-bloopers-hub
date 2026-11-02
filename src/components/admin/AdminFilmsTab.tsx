"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
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
  Sparkles,
  Bot
} from "lucide-react";
import { normalizePosterUrl } from "@/lib/tmdb";
import { slugify } from "@/lib/utils";
import ConfirmModal from "@/components/ConfirmModal";
import AdminPagination from "./AdminPagination";

interface AdminFilmsTabProps {
  initialFilter?: string;
}

export default function AdminFilmsTab({ initialFilter = "all" }: AdminFilmsTabProps) {
  const [films, setFilms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>(initialFilter); // 'all', 'missing_poster', 'missing_cast', 'duplicates'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(18);
  const [isStagingHost, setIsStagingHost] = useState(false);
  
  // Azioni bulk
  const [updatingAllPosters, setUpdatingAllPosters] = useState(false);
  const [updatingAllCast, setUpdatingAllCast] = useState(false);
  const [populatingTrivia, setPopulatingTrivia] = useState(false);
  const [populatingProgress, setPopulatingProgress] = useState<string | null>(null);
  const [missingTriviaCount, setMissingTriviaCount] = useState<number | null>(null);
  const [triviaBatchSize, setTriviaBatchSize] = useState<number>(5);
  const [bloopersTarget, setBloopersTarget] = useState<number>(10);
  const [triviaTarget, setTriviaTarget] = useState<number>(10);

  const [populatingBloopers, setPopulatingBloopers] = useState(false);
  const [populatingBloopersProgress, setPopulatingBloopersProgress] = useState<string | null>(null);
  const [missingBloopersCount, setMissingBloopersCount] = useState<number | null>(null);
  const [bloopersBatchSize, setBloopersBatchSize] = useState<number>(5);
  const [bloopersMaxNew, setBloopersMaxNew] = useState<number>(5);
  const [cleaningBloopers, setCleaningBloopers] = useState(false);
  const [triviaMaxNew, setTriviaMaxNew] = useState<number>(5);
  const [cleaningTrivia, setCleaningTrivia] = useState(false);
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
  const [scanningFilmId, setScanningFilmId] = useState<number | null>(null);

  // Scansiona bloopers e curiosità con IA per un singolo film specifico in tempo reale
  const handleScanSingleFilm = async (film: any) => {
    if (scanningFilmId) return;
    setScanningFilmId(film.id);
    setActionMessage(null);
    try {
      // 1. Scansiona bloopers
      const resB = await fetch("/api/admin/bloopers-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filmId: film.id, limit: 1, maxNewPerFilm: 10 }),
      });
      const dataB = await resB.json();

      // 2. Scansiona curiosità
      const resT = await fetch("/api/admin/trivia-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filmId: film.id, limit: 1, maxNewPerFilm: 10 }),
      });
      const dataT = await resT.json();

      const addedB = dataB.results?.[0]?.generated || 0;
      const addedT = dataT.results?.[0]?.generated || 0;

      setActionMessage(
        `✨ "${film.titolo}" aggiornato con successo: +${addedB} blooper e +${addedT} curiosità verificate!`
      );
      await fetchFilms();
    } catch (err: any) {
      console.error("Errore scansione singolo film:", err);
      setActionMessage(`❌ Errore durante la scansione di "${film.titolo}": ${err.message}`);
    } finally {
      setScanningFilmId(null);
    }
  };

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
      const res = await fetch(`/api/admin/films?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
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

  const handleSetBloopersTarget = (target: number) => {
    setBloopersTarget(target);
    try {
      localStorage.setItem("fbh_admin_bloopers_target", String(target));
    } catch {}
  };

  const handleSetTriviaTarget = (target: number) => {
    setTriviaTarget(target);
    try {
      localStorage.setItem("fbh_admin_trivia_target", String(target));
    } catch {}
  };

  const fetchMissingTriviaStats = async (target = triviaTarget) => {
    try {
      const res = await fetch(`/api/admin/trivia-batch?target=${target}`);
      if (res.ok) {
        const data = await res.json();
        setMissingTriviaCount(typeof data.missingTriviaCount === "number" ? data.missingTriviaCount : null);
      }
    } catch (err) {
      console.error("Errore statistiche curiosità mancanti:", err);
    }
  };

  const fetchMissingBloopersStats = async (target = bloopersTarget) => {
    try {
      const res = await fetch(`/api/admin/bloopers-batch?target=${target}`);
      if (res.ok) {
        const data = await res.json();
        setMissingBloopersCount(typeof data.missingBloopersCount === "number" ? data.missingBloopersCount : null);
      }
    } catch (err) {
      console.error("Errore statistiche bloopers mancanti:", err);
    }
  };

  useEffect(() => {
    setIsStagingHost(window.location.hostname.includes("staging") || window.location.hostname.includes("localhost"));
    fetchFilms();
    try {
      const savedBloopers = localStorage.getItem("fbh_admin_bloopers_target");
      if (savedBloopers) {
        const n = parseInt(savedBloopers, 10);
        if (!isNaN(n) && n > 0) setBloopersTarget(n);
      }
      const savedTrivia = localStorage.getItem("fbh_admin_trivia_target");
      if (savedTrivia) {
        const n = parseInt(savedTrivia, 10);
        if (!isNaN(n) && n > 0) setTriviaTarget(n);
      }
    } catch {}
    // inizializzazione effettuata dagli useEffect sui target
  }, []);

  useEffect(() => {
    fetchMissingBloopersStats(bloopersTarget);
  }, [bloopersTarget]);

  useEffect(() => {
    fetchMissingTriviaStats(triviaTarget);
  }, [triviaTarget]);

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

    // 2. Filtro categoria intelligente
    if (filterType === "no_bloopers") {
      return (f.bloopers_count || 0) === 0;
    }
    if (filterType === "no_trivia") {
      return (f.trivia_count || 0) === 0;
    }
    if (filterType === "recent") {
      return Number(f.anno) >= 2016;
    }
    if (filterType === "classic") {
      return !f.anno || Number(f.anno) < 2016;
    }
    if (filterType === "missing_poster") {
      return !f.poster_url || f.poster_url.trim() === "";
    }
    if (filterType === "missing_cast") {
      return !f.attori || f.attori.trim() === "" || f.attori === "N/D";
    }
    if (filterType === "duplicates") {
      return f.poster_url && posterFrequency[f.poster_url] > 1;
    }
    if (filterType === "issues") {
      const isMissingPoster = !f.poster_url || f.poster_url.trim() === "";
      const isMissingCast = !f.attori || f.attori.trim() === "" || f.attori === "N/D";
      const isDuplicate = f.poster_url && posterFrequency[f.poster_url] > 1;
      return isMissingPoster || isMissingCast || isDuplicate;
    }

    return true;
  });

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterType]);

  const paginatedFilms = filteredFilms.slice((page - 1) * pageSize, page * pageSize);

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

  // Scansiona i film con IA per rilevare ed aggiungere curiosità autentiche mancanti (senza forzare quote)
  const handleBatchPopulateTrivia = async () => {
    openConfirm(
      `⚡ Scansione Curiosità Mancanti (${triviaBatchSize} film, max ${triviaMaxNew} per film)`,
      `Avviare la scansione di ${triviaBatchSize} pellicole con Gemini per identificare ed aggiungere eventuali curiosità e retroscena autentici documentati che mancano ancora nel catalogo (fino a max ${triviaMaxNew} nuove per film)? L'algoritmo non inventa nulla: se un film non ha aneddoti documentati, non verrà aggiunto nulla.`,
      async () => {
        setPopulatingTrivia(true);
        setActionMessage(null);
        let totalProcessed = 0;
        let totalGenerated = 0;
        let lastError: string | null = null;
        const processedFilmIds: number[] = [];

        try {
          for (let step = 1; step <= triviaBatchSize; step++) {
            setPopulatingProgress(`Film ${step}/${triviaBatchSize} in scansione curiosità...`);

            let res: Response | null = null;
            let data: any = null;
            let retries = 0;

            while (retries < 2) {
              try {
                res = await fetch("/api/admin/trivia-batch", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    limit: 1,
                    mode: "scan_missing",
                    maxNewPerFilm: triviaMaxNew,
                    excludeIds: processedFilmIds,
                  }),
                });

                if (res.status === 429) {
                  setPopulatingProgress(`Film ${step}/${triviaBatchSize}: limite temporaneo Gemini, raffreddamento in corso (8s)...`);
                  await new Promise((r) => setTimeout(r, 8000));
                  retries++;
                  continue;
                }

                if (res.ok) {
                  data = await res.json();
                  break;
                } else {
                  const errJson = await res.json().catch(() => ({}));
                  lastError = errJson.error || `Errore HTTP ${res.status}`;
                  break;
                }
              } catch (fetchErr: any) {
                lastError = fetchErr?.message || "Errore di connessione";
                break;
              }
            }

            if (!data || !data.success) {
              console.warn(`Film curiosità ${step} saltato: ${lastError || "errore sconosciuto"}`);
            } else {
              if (data.results && data.results.length > 0) {
                const r0 = data.results[0];
                if (r0.film_id) processedFilmIds.push(r0.film_id);
                if (r0.generated > 0) {
                  setPopulatingProgress(`Film ${step}/${triviaBatchSize}: ${r0.titolo} (+${r0.generated} curiosità aggiunte)`);
                } else {
                  setPopulatingProgress(`Film ${step}/${triviaBatchSize}: ${r0.titolo} (già completo: 0 mancanti)`);
                }
              }

              if (data.processedCount > 0) {
                totalProcessed += data.processedCount;
                totalGenerated += data.totalTriviaGenerated || 0;
              }

              if (typeof data.remainingFilmsToScan === "number" && data.remainingFilmsToScan === 0) {
                break;
              }
            }

            if (step < triviaBatchSize) {
              await new Promise((r) => setTimeout(r, 3000));
            }
          }

          if (totalProcessed > 0) {
            setActionMessage(
              totalGenerated > 0
                ? `✨ Scansione curiosità completata: inserite ${totalGenerated} nuove curiosità autentiche su ${totalProcessed} film analizzati!`
                : `✨ Scansione curiosità completata: tutti i ${totalProcessed} film analizzati erano già completi degli aneddoti noti!`
            );
            await fetchFilms();
            await fetchMissingTriviaStats();
          } else if (lastError) {
            setActionMessage(`❌ ${lastError}`);
          }
        } catch (err: any) {
          console.error("Errore scansione batch curiosità:", err);
          setActionMessage(`❌ Errore durante la scansione: ${err?.message || "Connessione interrotta"}`);
        } finally {
          setPopulatingTrivia(false);
          setPopulatingProgress(null);
        }
      },
      `Avvia Scansione (${triviaBatchSize} film, max ${triviaMaxNew} nuove/film)`,
      "warning"
    );
  };

    // Scansiona i film con IA per rilevare ed aggiungere bloopers autentici mancanti (senza forzare quote)
  const handleBatchPopulateBloopers = async () => {
    openConfirm(
      `⚡ Scansione Bloopers Mancanti (${bloopersBatchSize} film, max ${bloopersMaxNew} per film)`,
      `Avviare la scansione di ${bloopersBatchSize} pellicole con Gemini per identificare ed aggiungere eventuali bloopers reali e documentati che mancano ancora nel catalogo (fino a un massimo di ${bloopersMaxNew} nuovi bloopers per film)? L'algoritmo non inventa nulla: se un film è già completo o non ha altri errori documentati, non verrà aggiunto nulla.`,
      async () => {
        setPopulatingBloopers(true);
        setActionMessage(null);
        let totalProcessed = 0;
        let totalGenerated = 0;
        let lastError: string | null = null;
        const processedFilmIds: number[] = [];

        try {
          for (let step = 1; step <= bloopersBatchSize; step++) {
            setPopulatingBloopersProgress(`Film ${step}/${bloopersBatchSize} in scansione...`);

            let res: Response | null = null;
            let data: any = null;
            let retries = 0;

            while (retries < 2) {
              try {
                res = await fetch("/api/admin/bloopers-batch", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    limit: 1,
                    mode: "scan_missing",
                    maxNewPerFilm: bloopersMaxNew,
                    excludeIds: processedFilmIds,
                  }),
                });

                if (res.status === 429) {
                  setPopulatingBloopersProgress(`Film ${step}/${bloopersBatchSize}: limite temporaneo Gemini, raffreddamento in corso (8s)...`);
                  await new Promise((r) => setTimeout(r, 8000));
                  retries++;
                  continue;
                }

                if (res.ok) {
                  data = await res.json();
                  break;
                } else {
                  const errJson = await res.json().catch(() => ({}));
                  lastError = errJson.error || `Errore HTTP ${res.status}`;
                  break;
                }
              } catch (fetchErr: any) {
                lastError = fetchErr?.message || "Errore di connessione";
                break;
              }
            }

            if (!data || !data.success) {
              console.warn(`Film ${step} saltato: ${lastError || "errore sconosciuto"}`);
            } else {
              if (data.results && data.results.length > 0) {
                const r0 = data.results[0];
                if (r0.film_id) processedFilmIds.push(r0.film_id);
                if (r0.generated > 0) {
                  setPopulatingBloopersProgress(`Film ${step}/${bloopersBatchSize}: ${r0.titolo} (+${r0.generated} bloopers aggiunti)`);
                } else {
                  setPopulatingBloopersProgress(`Film ${step}/${bloopersBatchSize}: ${r0.titolo} (già completo: 0 mancanti)`);
                }
              }

              if (data.processedCount > 0) {
                totalProcessed += data.processedCount;
                totalGenerated += data.totalBloopersGenerated || 0;
              }

              if (typeof data.remainingFilmsToScan === "number" && data.remainingFilmsToScan === 0) {
                break;
              }
            }

            if (step < bloopersBatchSize) {
              await new Promise((r) => setTimeout(r, 3000));
            }
          }

          if (totalProcessed > 0) {
            setActionMessage(
              totalGenerated > 0
                ? `🎬 Scansione completata: inseriti ${totalGenerated} nuovi bloopers autentici su ${totalProcessed} film analizzati!`
                : `🎬 Scansione completata: tutti i ${totalProcessed} film analizzati erano già completi dei loro bloopers documentati!`
            );
            await fetchFilms();
            await fetchMissingBloopersStats();
          } else if (lastError) {
            setActionMessage(`❌ ${lastError}`);
          }
        } catch (err: any) {
          console.error("Errore scansione bloopers mancanti:", err);
          setActionMessage(`❌ Errore durante la scansione: ${err?.message || "Connessione interrotta"}`);
        } finally {
          setPopulatingBloopers(false);
          setPopulatingBloopersProgress(null);
        }
      },
      `Avvia Scansione (${bloopersBatchSize} film, max ${bloopersMaxNew} nuovi/film)`,
      "warning"
    );
  };

    // Ripristina e bonifica archivio curiosità
  const handleCleanupBatchTrivia = async () => {
    openConfirm(
      "🛡️ Ripristina & Bonifica Curiosità",
      "Azzerare tutte le 3.467 curiosità generate automaticamente durante i vecchi test a quota forzata e le righe corrotte? L'archivio verrà azzerato e predisposto per la nuova scansione verificata e autentica al 100% con zero allucinazioni.",
      async () => {
        setCleaningTrivia(true);
        setActionMessage(null);
        try {
          const res = await fetch("/api/admin/trivia-cleanup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scope: "all" }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setActionMessage(`✅ ${data.message}`);
            await fetchFilms();
            await fetchMissingTriviaStats();
          } else {
            setActionMessage(`❌ Errore durante la bonifica curiosità: ${data.error || "Operazione non riuscita"}`);
          }
        } catch (err: any) {
          console.error("Errore trivia cleanup:", err);
          setActionMessage(`❌ Errore di connessione: ${err.message}`);
        } finally {
          setCleaningTrivia(false);
        }
      },
      "Procedi con la Bonifica Curiosità",
      "danger"
    );
  };

  // Ripristina catalogo bloopers autentici rimuovendo i batch sintetici
  const handleCleanupBatchBloopers = async () => {
    openConfirm(
      "🛡️ Ripristina Bloopers Autentici Verificati",
      "Rimuovere tutti i bloopers sintetici generati automaticamente durante i test delle quote per ripristinare il catalogo ai 974 bloopers originali autentici e verificati? Questa azione eliminerà solo i bloopers generati dal batch recente, preservando intatti i bloopers storici e tutte le curiosità.",
      async () => {
        setCleaningBloopers(true);
        setActionMessage(null);
        try {
          const res = await fetch("/api/admin/bloopers-cleanup", {
            method: "POST",
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setActionMessage(`✅ ${data.message}`);
            await fetchFilms();
            await fetchMissingBloopersStats();
          } else {
            setActionMessage(`❌ Errore durante il ripristino: ${data.error || "Operazione non riuscita"}`);
          }
        } catch (err: any) {
          console.error("Errore bloopers cleanup:", err);
          setActionMessage(`❌ Errore di connessione durante il ripristino: ${err.message}`);
        } finally {
          setCleaningBloopers(false);
        }
      },
      "Procedi con il Ripristino Autentico",
      "danger"
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

  const totalBloopersCount = films.reduce((acc, f) => acc + (f.bloopers_count || 0), 0);
  const totalTriviaCount = films.reduce((acc, f) => acc + (f.trivia_count || 0), 0);
  const noBloopersCount = films.filter((f) => (f.bloopers_count || 0) === 0).length;
  const noTriviaCount = films.filter((f) => (f.trivia_count || 0) === 0).length;
  const recentFilmsCount = films.filter((f) => Number(f.anno) >= 2016).length;
  const classicFilmsCount = films.filter((f) => !f.anno || Number(f.anno) < 2016).length;
  const missingPostersCount = films.filter((f) => !f.poster_url || f.poster_url.trim() === "").length;
  const missingCastCount = films.filter((f) => !f.attori || f.attori.trim() === "" || f.attori === "N/D").length;
  const duplicatePostersCount = films.filter((f) => f.poster_url && posterFrequency[f.poster_url] > 1).length;
  const totalIssuesCount = missingPostersCount + missingCastCount + duplicatePostersCount;

  return (
    <div className="space-y-6">
      {/* BARRA SUPERIORE: PANNELLO DI CONTROLLO & METRICHE UNIFICATE */}
      <div className="flex flex-col gap-4 p-4 sm:p-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/70">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Film className="h-5 w-5 text-amber-400 shrink-0" />
                Archivio Film ({films.length} pellicole)
              </h3>
              <button
                onClick={() => fetchFilms()}
                disabled={loading}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/80 transition active:scale-95 disabled:opacity-50"
                title="Ricarica i dati freschi dal database"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin text-amber-400" : ""}`} />
                <span>Aggiorna Dati</span>
              </button>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                  isStagingHost
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                }`}
              >
                {isStagingHost ? "DB: Staging" : "DB: Produzione"}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Gestione schede film, verifica fattuale con IA e monitoraggio automatico notturno.
            </p>
          </div>

          {/* Manutenzione rapida: visibile solo se ci sono locandine o cast da sistemare */}
          {(missingPostersCount > 0 || missingCastCount > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              {missingPostersCount > 0 && (
                <button
                  onClick={handleUpdateAllPosters}
                  disabled={updatingAllPosters}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-zinc-950 hover:brightness-110 active:scale-95 transition disabled:opacity-50 shadow-sm"
                  title="Recupera tutte le locandine mancanti da TMDB"
                >
                  <ImageIcon className={`h-3.5 w-3.5 ${updatingAllPosters ? "animate-spin" : ""}`} />
                  <span>Locandine Mancanti ({missingPostersCount})</span>
                </button>
              )}
              {missingCastCount > 0 && (
                <button
                  onClick={handleUpdateAllCast}
                  disabled={updatingAllCast}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-800 text-zinc-200 border border-zinc-700 hover:text-white hover:bg-zinc-700 active:scale-95 transition disabled:opacity-50 shadow-sm"
                  title="Recupera il cast mancante da TMDB"
                >
                  <Users className={`h-3.5 w-3.5 ${updatingAllCast ? "animate-spin" : ""}`} />
                  <span>Cast Mancante ({missingCastCount})</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* BANNER AUTOMAZIONE CLOUD GITHUB ACTIONS (CENTRALE & COMPATTO) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-amber-500/30 shadow-md">
          <div className="flex items-start sm:items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  Automazione Notturna Cloud (GitHub Actions)
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Attivo ogni notte alle 04:00
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Scansione continua e incrementale (Zero Downtime): priorità ai nuovi arrivi, bonifica automatica dei falsi e accumulo verificato.
              </p>
            </div>
          </div>

          <a
            href="https://github.com/mrtrrt67/film-bloopers-hub/actions/workflows/daily-sync.yml"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 text-zinc-950 hover:brightness-110 active:scale-95 transition shadow-lg shadow-amber-500/10 whitespace-nowrap min-h-[38px]"
            title="Apri GitHub Actions per avviare la scansione manuale estemporanea"
          >
            <span>⚡ Lancia Scansione Cloud</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* METRICHE STATO ARCHIVIO (4 BOX COMPATTI) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Pellicole Totali</span>
            <span className="text-sm font-black text-white">{films.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Bloopers Verificati</span>
            <span className="text-sm font-black text-orange-400">{totalBloopersCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Curiosità Autentiche</span>
            <span className="text-sm font-black text-amber-400">{totalTriviaCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Recenti (ultimi 10 anni)</span>
            <span className="text-sm font-black text-emerald-400">{recentFilmsCount}</span>
          </div>
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

      {/* FILTRI & RICERCA INTELLIGENTI */}
      <div className="flex flex-col gap-3.5">
        {/* Riga 1: Campo di Ricerca a tutta larghezza con reset rapido */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Cerca per titolo, regista, genere o attori in archivio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-zinc-900 border border-zinc-800 pl-10 pr-10 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 transition shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
              title="Cancella ricerca"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Riga 2: Badge Filtro Intelligenti */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tutti */}
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              filterType === "all"
                ? "bg-amber-500 text-zinc-950 shadow-md font-black"
                : "bg-zinc-900/90 text-zinc-300 border border-zinc-800 hover:text-white hover:bg-zinc-800/80"
            }`}
          >
            <span>Tutti</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
              filterType === "all" ? "bg-zinc-950/20 text-zinc-950" : "bg-zinc-800 text-zinc-400"
            }`}>
              {films.length}
            </span>
          </button>

          {/* Senza Bloopers */}
          <button
            onClick={() => setFilterType("no_bloopers")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              filterType === "no_bloopers"
                ? "bg-amber-500 text-zinc-950 shadow-md font-black"
                : "bg-zinc-900/90 text-zinc-300 border border-zinc-800 hover:text-white hover:bg-zinc-800/80"
            }`}
          >
            <span>Senza Bloopers</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
              filterType === "no_bloopers" 
                ? "bg-zinc-950/20 text-zinc-950" 
                : noBloopersCount > 0 
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" 
                : "bg-zinc-800 text-zinc-400"
            }`}>
              {noBloopersCount}
            </span>
          </button>

          {/* Senza Curiosità */}
          <button
            onClick={() => setFilterType("no_trivia")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              filterType === "no_trivia"
                ? "bg-amber-500 text-zinc-950 shadow-md font-black"
                : "bg-zinc-900/90 text-zinc-300 border border-zinc-800 hover:text-white hover:bg-zinc-800/80"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Senza Curiosità</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
              filterType === "no_trivia" 
                ? "bg-zinc-950/20 text-zinc-950" 
                : noTriviaCount > 0 
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" 
                : "bg-zinc-800 text-zinc-400"
            }`}>
              {noTriviaCount}
            </span>
          </button>

          {/* Recenti ultimi 10 anni */}
          <button
            onClick={() => setFilterType("recent")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              filterType === "recent"
                ? "bg-emerald-500 text-zinc-950 shadow-md font-black"
                : "bg-zinc-900/90 text-zinc-300 border border-zinc-800 hover:text-white hover:bg-zinc-800/80"
            }`}
          >
            <span>🌟 Recenti (2016-2026)</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
              filterType === "recent" ? "bg-zinc-950/20 text-zinc-950" : "bg-emerald-500/20 text-emerald-400"
            }`}>
              {recentFilmsCount}
            </span>
          </button>

          {/* Storici consolidati */}
          <button
            onClick={() => setFilterType("classic")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              filterType === "classic"
                ? "bg-amber-500 text-zinc-950 shadow-md font-black"
                : "bg-zinc-900/90 text-zinc-300 border border-zinc-800 hover:text-white hover:bg-zinc-800/80"
            }`}
          >
            <span>🧊 Storici (&lt; 2016)</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
              filterType === "classic" ? "bg-zinc-950/20 text-zinc-950" : "bg-zinc-800 text-zinc-400"
            }`}>
              {classicFilmsCount}
            </span>
          </button>

          {/* Anomalie (visibile solo se ci sono problemi di poster o cast) */}
          {totalIssuesCount > 0 && (
            <button
              onClick={() => setFilterType("issues")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                filterType === "issues"
                  ? "bg-rose-500 text-white shadow-md font-black"
                  : "bg-rose-950/30 text-rose-300 border border-rose-800/50 hover:bg-rose-900/40"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Anomalie Poster/Cast</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-rose-500/30 text-rose-200">
                {totalIssuesCount}
              </span>
            </button>
          )}
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedFilms.map((film) => {
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

                      {/* Badge diagnostici e contenuti */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                        {(film.trivia_count || 0) > 0 ? (
                          <span className="rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold px-1.5 py-0.5 flex items-center gap-1">
                            <Sparkles className="h-2.5 w-2.5" />
                            {film.trivia_count} Curiosità
                          </span>
                        ) : (
                          <span className="rounded bg-zinc-800/80 text-zinc-500 border border-zinc-800 text-[9px] font-medium px-1.5 py-0.5">
                            0 Curiosità
                          </span>
                        )}

                        {(film.bloopers_count || 0) > 0 ? (
                          <span className="rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[9px] font-bold px-1.5 py-0.5 flex items-center gap-1">
                            🎬 {film.bloopers_count} Blooper
                          </span>
                        ) : (
                          <span className="rounded bg-zinc-800/80 text-zinc-500 border border-zinc-800 text-[9px] font-medium px-1.5 py-0.5">
                            0 Blooper
                          </span>
                        )}

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
                        onClick={() => handleScanSingleFilm(film)}
                        disabled={scanningFilmId === film.id}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-zinc-950 border border-amber-500/30 font-bold transition text-[11px] disabled:opacity-50"
                        title="Scansiona blooper e curiosità autentici con IA solo per questo film"
                      >
                        <Sparkles className={`h-3 w-3 ${scanningFilmId === film.id ? "animate-spin" : ""}`} />
                        <span>{scanningFilmId === film.id ? "Scansione..." : "Aggiorna IA"}</span>
                      </button>
                      <Link
                        href={`/film/${slugify(film.titolo, film.anno)}-${film.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition"
                        title="Apri scheda film sul sito in una nuova scheda"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
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

          {filteredFilms.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden shadow-xl">
              <AdminPagination
                currentPage={page}
                totalItems={filteredFilms.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[18, 36, 72]}
                itemName="film"
              />
            </div>
          )}
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
