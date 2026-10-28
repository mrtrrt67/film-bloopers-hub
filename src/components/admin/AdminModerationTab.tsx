"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, XCircle, Trash2, Edit3, Shield, Award, X, ThumbsUp } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";

export default function AdminModerationTab() {
  const [subTab, setSubTab] = useState<"pending" | "contests" | "corrections" | "approved" | "conferme">("pending");
  const [data, setData] = useState<{
    pending: any[];
    contestazioni: any[];
    approved: any[];
    resolved_contests: any[];
    corrections: any[];
    conferme: any[];
  }>({
    pending: [],
    contestazioni: [],
    approved: [],
    resolved_contests: [],
    corrections: [],
    conferme: [],
  });
  const [loading, setLoading] = useState(true);
  const [pointsMap, setPointsMap] = useState<Record<string, number>>({});
  const [contestEditMap, setContestEditMap] = useState<Record<string, { minuto: string; descrizione: string; points: number }>>({});
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: "danger" | "warning";
    onConfirm: () => void;
  } | null>(null);

  const openConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmLabel = "Conferma ed Elimina",
    variant: "danger" | "warning" = "danger"
  ) => {
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

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 4500);
  };

  const fetchModerationData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/moderation");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModerationData();
  }, []);

  const handleApprove = async (blooper: any) => {
    const defaultPts = blooper.is_double_points ? 20 : 10;
    const pts = pointsMap[blooper.id] ?? defaultPts;
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          blooper_id: blooper.id,
          userId: blooper.user_id,
          userEmail: blooper.inserito_da,
          points: pts,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        showToast("success", json.message || "Blooper approvato con successo e punti assegnati!");
        setData((prev) => ({
          ...prev,
          pending: prev.pending.filter((b) => b.id !== blooper.id),
        }));
      } else {
        showToast("error", "Errore approvazione: " + (json.error || "Impossibile approvare"));
      }
    } catch (err: any) {
      showToast("error", "Errore di rete: " + err.message);
    }
  };

  const handleReject = async (blooperId: number | string) => {
    openConfirm(
      "Rifiuta Segnalazione",
      "Sei sicuro di voler rifiutare ed eliminare definitivamente questa segnalazione blooper?",
      async () => {
        try {
          const res = await fetch("/api/admin/moderation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reject", blooper_id: blooperId }),
          });
          const json = await res.json();
          if (res.ok) {
            showToast("info", json.message || "Segnalazione rifiutata ed eliminata.");
            setData((prev) => ({
              ...prev,
              pending: prev.pending.filter((b) => b.id !== blooperId),
            }));
          } else {
            showToast("error", "Errore rifiuto: " + (json.error || "Impossibile eliminare"));
          }
        } catch (err: any) {
          showToast("error", "Errore di rete: " + err.message);
        }
      }
    );
  };

  const handleSaveContestCorrection = async (contest: any) => {
    const defaultPts = contest.is_double_points ? 20 : 10;
    const edit = contestEditMap[contest.id] || {
      minuto: contest.errori?.minuto || "",
      descrizione: contest.errori?.descrizione || "",
      points: defaultPts,
    };

    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "correct_contestation",
          blooper_id: contest.errore_id,
          contestazione_id: contest.id,
          userId: contest.user_id,
          userEmail: contest.user_email,
          minuto: edit.minuto,
          descrizione: edit.descrizione,
          points: edit.points,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        showToast("success", json.message || `Contestazione accettata: blooper corretto e ${edit.points} punti assegnati al segnalatore!`);
        setData((prev) => ({
          ...prev,
          contestazioni: prev.contestazioni.filter((c) => c.id !== contest.id),
          resolved_contests: [
            {
              ...contest,
              tipo: "contestazione_risolta",
              errori: {
                ...contest.errori,
                minuto: edit.minuto,
                descrizione: edit.descrizione,
              },
              created_at: new Date().toISOString(),
            },
            ...(prev.resolved_contests || []),
          ],
        }));
      } else {
        showToast("error", "Errore salvataggio correzione: " + (json.error || "Operazione non riuscita"));
      }
    } catch (err: any) {
      showToast("error", "Errore di rete: " + err.message);
    }
  };

  const handleDeleteContestedBlooper = async (contest: any) => {
    const defaultPts = contest.is_double_points ? 20 : 10;
    const edit = contestEditMap[contest.id] || {
      points: defaultPts,
    };
    const pts = edit.points;
    const authorName = contest.user_handle || (contest.user_email ? `@${contest.user_email.split("@")[0]}` : "all'utente che ha smascherato l'errore");
    
    openConfirm(
      "Elimina Blooper Errato",
      `Eliminare definitivamente questo blooper errato dal catalogo ed assegnare ${pts} punti a ${authorName} per averlo smascherato?`,
      async () => {
        try {
          const res = await fetch("/api/admin/moderation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "delete_blooper",
              blooper_id: contest.errore_id,
              contestazione_id: contest.id,
              userId: contest.user_id,
              userEmail: contest.user_email,
              points: pts,
            }),
          });
          const json = await res.json();
          if (res.ok) {
            showToast("success", json.message || `Blooper errato eliminato dall'archivio e ${pts} punti assegnati!`);
            setData((prev) => ({
              ...prev,
              contestazioni: prev.contestazioni.filter((c) => c.id !== contest.id),
              resolved_contests: [
                {
                  ...contest,
                  tipo: "blooper_falso_risolto",
                  created_at: new Date().toISOString(),
                },
                ...(prev.resolved_contests || []),
              ],
            }));
          } else {
            showToast("error", "Errore eliminazione: " + (json.error || "Operazione non riuscita"));
          }
        } catch (err: any) {
          showToast("error", "Errore di rete: " + err.message);
        }
      }
    );
  };

  const handleIgnoreContest = async (contestId: string | number) => {
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ignore_contestation",
          contestazione_id: contestId,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        showToast("info", json.message || "Contestazione respinta: blooper confermato e contestazione archiviata.");
        setData((prev) => ({
          ...prev,
          contestazioni: prev.contestazioni.filter((c) => c.id !== contestId),
        }));
      } else {
        showToast("error", "Errore archiviazione: " + (json.error || "Operazione non riuscita"));
      }
    } catch (err: any) {
      showToast("error", "Errore di rete: " + err.message);
    }
  };

  const handleDeleteResolvedContest = async (contestId: string | number) => {
    openConfirm(
      "Rimuovi Contestazione dallo Storico",
      "Vuoi rimuovere questa contestazione dallo storico delle risolte?\n\nIl blooper nel film rimarrà regolarmente pubblicato e visibile nel catalogo.",
      async () => {
        try {
          const res = await fetch("/api/admin/moderation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "delete_resolved_contest",
              contestazione_id: contestId,
            }),
          });
          const json = await res.json();
          if (res.ok) {
            showToast("info", json.message || "Contestazione rimossa dallo storico.");
            setData((prev) => ({
              ...prev,
              resolved_contests: (prev.resolved_contests || []).filter((rc) => rc.id !== contestId),
            }));
          } else {
            showToast("error", "Errore eliminazione: " + (json.error || "Operazione non riuscita"));
          }
        } catch (err: any) {
          showToast("error", "Errore di rete: " + err.message);
        }
      },
      "Rimuovi Solo Contestazione",
      "warning"
    );
  };

  const handleClearAllResolvedContests = async () => {
    openConfirm(
      "Svuota Storico Contestazioni",
      "Vuoi svuotare tutte le contestazioni risolte dallo storico?\n\nTutti i bloopers nei rispettivi film rimarranno intatti e pubblicati nel catalogo.",
      async () => {
        try {
          const res = await fetch("/api/admin/moderation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "clear_resolved_contests" }),
          });
          const json = await res.json();
          if (res.ok) {
            showToast("success", json.message || "Storico contestazioni svuotato con successo.");
            setData((prev) => ({
              ...prev,
              resolved_contests: [],
            }));
          } else {
            showToast("error", "Errore svuotamento: " + (json.error || "Operazione non riuscita"));
          }
        } catch (err: any) {
          showToast("error", "Errore di rete: " + err.message);
        }
      },
      "Svuota Solo Contestazioni",
      "warning"
    );
  };

  const handleApproveCorrection = async (corr: any) => {
    const defaultPts = corr.is_double_points ? 20 : 10;
    const pts = pointsMap[corr.id] ?? defaultPts;
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_suggestion_correction",
          suggestion_id: corr.id,
          userId: corr.user_id,
          userEmail: corr.email,
          points: pts,
        }),
      });
      if (res.ok) {
        const resJson = await res.json();
        showToast("success", resJson.message || "Correzione approvata e punti assegnati!");
        setData((prev) => ({
          ...prev,
          corrections: (prev.corrections || []).filter((c) => c.id !== corr.id),
        }));
      } else {
        const resJson = await res.json().catch(() => ({}));
        showToast("error", resJson.error || "Errore durante l'approvazione");
      }
    } catch (err: any) {
      showToast("error", "Errore di rete: " + err.message);
    }
  };

  const handleRejectCorrection = async (corrId: string | number) => {
    openConfirm(
      "Rifiuta Correzione",
      "Rifiutare ed eliminare definitivamente questa correzione inviata dalla community?",
      async () => {
        try {
          const res = await fetch("/api/admin/moderation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "reject_suggestion_correction",
              suggestion_id: corrId,
            }),
          });
          if (res.ok) {
            showToast("info", "Correzione rifiutata ed eliminata.");
            setData((prev) => ({
              ...prev,
              corrections: (prev.corrections || []).filter((c) => c.id !== corrId),
            }));
          } else {
            const resJson = await res.json().catch(() => ({}));
            showToast("error", resJson.error || "Errore durante il rifiuto");
          }
        } catch (err: any) {
          showToast("error", "Errore di rete: " + err.message);
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Toast Notifiche In-App Moderazione */}
      {toast && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-md animate-in fade-in slide-in-from-top-3 duration-300">
          <div
            className={`flex items-start gap-3 p-4 rounded-2xl shadow-2xl backdrop-blur-xl border ${
              toast.type === "success"
                ? "bg-zinc-950/95 border-emerald-500/50 text-emerald-200 shadow-emerald-950/40"
                : toast.type === "error"
                ? "bg-zinc-950/95 border-rose-500/50 text-rose-200 shadow-rose-950/40"
                : "bg-zinc-950/95 border-amber-500/50 text-amber-200 shadow-amber-950/40"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === "success" && <CheckCircle className="h-5 w-5 text-emerald-400" />}
              {toast.type === "error" && <XCircle className="h-5 w-5 text-rose-400" />}
              {toast.type === "info" && <AlertTriangle className="h-5 w-5 text-amber-400" />}
            </div>
            <div className="flex-1 text-xs font-semibold leading-relaxed">
              {toast.message}
            </div>
            <button
              onClick={() => setToast(null)}
              className="shrink-0 text-zinc-400 hover:text-white transition p-1"
              aria-label="Chiudi notifica"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {/* HEADER TABS */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setSubTab("pending")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            subTab === "pending"
              ? "bg-amber-500 text-zinc-950 shadow-md"
              : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          In Attesa ({data.pending.length})
        </button>
        <button
          onClick={() => setSubTab("contests")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            subTab === "contests"
              ? "bg-amber-500 text-zinc-950 shadow-md"
              : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
          }`}
        >
          <XCircle className="h-3.5 w-3.5" />
          Contestazioni ({data.contestazioni.length})
        </button>
        <button
          onClick={() => setSubTab("corrections")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            subTab === "corrections"
              ? "bg-amber-500 text-zinc-950 shadow-md"
              : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
          }`}
        >
          <Award className="h-3.5 w-3.5" />
          Correzioni Community ({data.corrections?.length || 0})
          {(data.corrections?.length || 0) > 0 && (
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse ml-0.5" />
          )}
        </button>
        <button
          onClick={() => setSubTab("approved")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            subTab === "approved"
              ? "bg-amber-500 text-zinc-950 shadow-md"
              : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
          }`}
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Contestazioni Risolte ({data.resolved_contests?.length || 0})
        </button>
        <button
          onClick={() => setSubTab("conferme")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            subTab === "conferme"
              ? "bg-amber-500 text-zinc-950 shadow-md"
              : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
          }`}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          Registro Conferme 👍 ({data.conferme?.length || 0})
        </button>
      </div>

      {/* 1. SEGNALAZIONI IN ATTESA */}
      {subTab === "pending" && (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-center gap-2">
            <span>ℹ️</span>
            <span><strong>Nuovi Bloopers in Attesa:</strong> Segnalazioni inviate dalla community dai form delle schede film. Clicca su <strong>Approva</strong> per pubblicarle nel catalogo e accreditare i punti, o <strong>Rifiuta</strong> per scartarle.</span>
          </div>

          {data.pending.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs rounded-2xl border border-zinc-800 bg-zinc-900/40">
              Nessuna nuova segnalazione in attesa di approvazione 🎉
            </div>
          ) : (
            data.pending.map((blooper) => {
              const defaultPts = blooper.is_double_points ? 20 : 10;
              return (
                <div
                  key={blooper.id}
                  className={`rounded-2xl p-5 space-y-3 transition ${
                    blooper.is_priority
                      ? "border-2 border-amber-500/80 bg-gradient-to-r from-amber-950/20 via-zinc-900/80 to-zinc-900/60 shadow-lg shadow-amber-500/10"
                      : "border border-zinc-800 bg-zinc-900/60"
                  }`}
                >
                  {blooper.is_priority && (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-300">
                      ⚡ Segnalazione Prioritaria • {blooper.is_admin ? "Amministratore" : `Piano ${blooper.user_sub}`} (Punti Doppi 2x)
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white">🎬 {blooper.films?.titolo || "Film"}</span>
                      <span className="text-zinc-500 font-mono">({blooper.films?.anno || "N/D"})</span>
                      <span className="bg-amber-500/20 text-amber-300 font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                        ⏱️ {blooper.minuto}
                      </span>
                      <span className="text-zinc-400 capitalize">📂 {blooper.categoria}</span>
                    </div>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {blooper.creato_il ? blooper.creato_il.slice(0, 16).replace("T", " ") : ""}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-200 leading-relaxed bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                    {blooper.descrizione}
                  </p>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 text-xs">
                    <span className="text-zinc-400 text-[11px]">
                      ✍️ Segnalato da: <strong className="text-zinc-200">{blooper.inserito_da || "Anonimo"}</strong>
                    </span>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                        <span>Punti:</span>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={pointsMap[blooper.id] ?? defaultPts}
                          onChange={(e) =>
                            setPointsMap({ ...pointsMap, [blooper.id]: parseInt(e.target.value, 10) || defaultPts })
                          }
                          className="w-14 rounded-lg bg-zinc-950 border border-zinc-700 px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                    <button
                      onClick={() => handleApprove(blooper)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 font-bold hover:brightness-110 active:scale-95 transition"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Approva
                    </button>
                    <button
                      onClick={() => handleReject(blooper.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 text-rose-400 font-bold hover:bg-rose-500/10 active:scale-95 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Rifiuta
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
        </div>
      )}

      {/* 2. CONTESTAZIONI COMMUNITY */}
      {subTab === "contests" && (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200 flex items-start gap-2">
            <span className="text-base leading-none">⚠️</span>
            <div className="space-y-1">
              <p><strong>Bloopers Contestati dalla Community:</strong> Bloopers già pubblicati che un utente registrato ritiene errati o inesatti (es. minuto sbagliato, anacronismo inesistente).</p>
              <p className="text-[11px] text-zinc-300">
                • <strong>Accetta & Correggi:</strong> Salva il minuto/descrizione corretti, assegna i punti all&apos;utente e archivia la contestazione.<br />
                • <strong>Elimina Blooper Errato:</strong> Elimina definitivamente il blooper dal catalogo se la segnalazione era totalmente errata e <strong>assegna i punti all&apos;utente</strong> che lo ha smascherato.<br />
                • <strong>Respingi Contestazione:</strong> La contestazione era infondata: mantieni il blooper invariato e rimuovi la contestazione senza assegnare punti.
              </p>
            </div>
          </div>

          {data.contestazioni.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs rounded-2xl border border-zinc-800 bg-zinc-900/40">
              Nessuna contestazione attiva dalla community 🎉
            </div>
          ) : (
            data.contestazioni.map((c) => {
              const defaultPts = c.is_double_points ? 20 : 10;
              const currentEdit = contestEditMap[c.id] || {
                minuto: c.errori?.minuto || "",
                descrizione: c.errori?.descrizione || "",
                points: defaultPts,
              };

              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-rose-500/30 bg-zinc-900/60 p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white">
                        🎬 {c.errori?.films?.titolo || "Film"} ({c.errori?.films?.anno || "N/D"})
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                        Contestato da: <strong className="text-amber-400">{c.user_handle || (c.user_email ? `@${c.user_email.split("@")[0]}` : "Utente")}</strong>
                      </span>
                      {c.is_double_points && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                          ⚡ 2x Punti ({c.is_admin ? "Amministratore" : "Abbonato"})
                        </span>
                      )}
                    </div>
                    <span className="text-zinc-500 font-mono text-[11px]">
                      {c.created_at ? c.created_at.slice(0, 16).replace("T", " ") : ""}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
                    <span className="font-bold text-rose-300 block mb-1">Motivo della contestazione utente:</span>
                    <p className="text-zinc-200">{c.motivo}</p>
                  </div>

                  {/* Form di correzione */}
                  <div className="space-y-3 pt-1">
                    <div className="flex gap-2">
                      <div className="w-32">
                        <label className="text-[10px] text-zinc-400 font-bold block mb-1">Minuto</label>
                        <input
                          type="text"
                          value={currentEdit.minuto}
                          onChange={(e) =>
                            setContestEditMap({
                              ...contestEditMap,
                              [c.id]: { ...currentEdit, minuto: e.target.value },
                            })
                          }
                          className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-zinc-400 font-bold block mb-1">Descrizione Blooper</label>
                        <textarea
                          rows={2}
                          value={currentEdit.descrizione}
                          onChange={(e) =>
                            setContestEditMap({
                              ...contestEditMap,
                              [c.id]: { ...currentEdit, descrizione: e.target.value },
                            })
                          }
                          className="w-full rounded-lg bg-zinc-950 border border-zinc-700 p-2 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <span>Punti al contestatore:</span>
                        <input
                          type="number"
                          value={currentEdit.points}
                          onChange={(e) =>
                            setContestEditMap({
                              ...contestEditMap,
                              [c.id]: { ...currentEdit, points: parseInt(e.target.value, 10) || defaultPts },
                            })
                          }
                          className="w-14 rounded-lg bg-zinc-950 border border-zinc-700 px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleSaveContestCorrection(c)}
                          title="Accetta la contestazione: salva le modifiche al blooper, accredita i punti e archivia la contestazione"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 font-bold text-xs hover:brightness-110 active:scale-95 transition shadow-sm"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Accetta & Correggi (+{currentEdit.points}pt)</span>
                        </button>
                        <button
                          onClick={() => handleDeleteContestedBlooper(c)}
                          title="Elimina definitivamente questo blooper dall'archivio, assegna i punti all'utente che ha smascherato il fake blooper e chiudi la contestazione"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs hover:bg-rose-500 hover:text-zinc-950 active:scale-95 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Elimina Blooper Errato (+{currentEdit.points}pt)</span>
                        </button>
                        <button
                          onClick={() => handleIgnoreContest(c.id)}
                          title="La contestazione è infondata: mantieni il blooper invariato ed elimina solo la contestazione senza assegnare punti"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold text-xs hover:text-white hover:bg-zinc-700 active:scale-95 transition"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Respingi Contestazione</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 3. CORREZIONI SUGGERITE DALLA COMMUNITY */}
      {subTab === "corrections" && (
        <div className="space-y-4">
          {(!data.corrections || data.corrections.length === 0) ? (
            <div className="py-12 text-center text-zinc-500 text-xs rounded-2xl border border-zinc-800 bg-zinc-900/40">
              Nessuna correzione inviata dalla community in attesa di moderazione 🎉
            </div>
          ) : (
            data.corrections.map((corr) => {
              const defaultPts = corr.is_double_points ? 20 : 10;
              return (
                <div
                  key={corr.id}
                  className={`rounded-2xl p-5 space-y-3 transition ${
                    corr.is_priority
                      ? "border-2 border-amber-500/80 bg-gradient-to-r from-amber-950/20 via-zinc-900/80 to-zinc-900/60 shadow-lg shadow-amber-500/10"
                      : "border border-zinc-800 bg-zinc-900/60"
                  }`}
                >
                  {corr.is_priority && (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-300">
                      ⚡ Priorità Moderazione • Piano {corr.user_sub} (Punti Doppi Classifica)
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-amber-400">
                        ✍️ {corr.user_handle || "Utente"}
                      </span>
                      <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded text-[11px] font-mono">
                        Punti attuali: {corr.user_points} pt
                      </span>
                      <span className="text-zinc-500 text-[11px] uppercase">
                        [{corr.user_tier}]
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {corr.created_at ? corr.created_at.slice(0, 16).replace("T", " ") : ""}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    {corr.messaggio}
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 text-xs border-t border-zinc-800/60">
                    <span className="text-zinc-500 text-[11px]">
                      ID Utente: <span className="font-mono text-zinc-400">{corr.user_id || "Non associato"}</span>
                    </span>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                        <span>Punti da assegnare:</span>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={pointsMap[corr.id] ?? defaultPts}
                          onChange={(e) =>
                            setPointsMap({
                              ...pointsMap,
                              [corr.id]: parseInt(e.target.value, 10) || defaultPts,
                            })
                          }
                          className="w-14 rounded-lg bg-zinc-950 border border-zinc-700 px-2 py-1 text-xs text-white font-mono"
                        />
                      </div>
                      <button
                        onClick={() => handleApproveCorrection(corr)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 font-bold hover:brightness-110 active:scale-95 transition"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Approva & Assegna Punti
                      </button>
                      <button
                        onClick={() => handleRejectCorrection(corr.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 text-rose-400 font-bold hover:bg-rose-500/10 active:scale-95 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Rifiuta
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 4. ARCHIVIO CONTESTAZIONI RISOLTE */}
      {subTab === "approved" && (
        <div className="space-y-5">
          {/* Banner Esplicativo Rassicurante */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-3">
            <span className="text-base mt-0.5">ℹ️</span>
            <div className="space-y-1">
              <strong className="text-amber-300">Archivio Storico Contestazioni Risolte</strong>
              <p className="text-zinc-300">
                In questa sezione consulti lo storico delle contestazioni e correzioni della community già verificate e approvate.
              </p>
              <p className="text-emerald-400 font-semibold pt-0.5">
                🛡️ La rimozione da questo elenco cancella <u>SOLO</u> la riga della contestazione dallo storico: il blooper del film rimane pubblicato e intatto al 100% nel catalogo pubblico.
              </p>
            </div>
          </div>

          {/* Elenco Contestazioni Risolte */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Contestazioni Risolte ({data.resolved_contests?.length || 0})
              </h3>
              {data.resolved_contests && data.resolved_contests.length > 0 && (
                <button
                  onClick={handleClearAllResolvedContests}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-600 transition active:scale-95 border border-amber-500/20"
                  title="Svuota lo storico delle contestazioni risolte (i bloopers nei film restano intatti)"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Svuota Storico Contestazioni</span>
                </button>
              )}
            </div>

            {(!data.resolved_contests || data.resolved_contests.length === 0) ? (
              <div className="py-8 text-center text-zinc-500 text-xs rounded-xl border border-zinc-800 bg-zinc-900/40">
                Nessuna contestazione archiviata come risolta.
              </div>
            ) : (
              data.resolved_contests.map((rc) => (
                <div
                  key={rc.id}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-4 space-y-2 hover:border-emerald-500/50 transition relative group"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">🎬 {rc.errori?.films?.titolo || "Film"}</span>
                      <span className="font-mono text-zinc-500 text-[11px]">({rc.errori?.films?.anno || "N/D"})</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                        {rc.tipo === "blooper_falso_risolto" ? "🗑️ Blooper Fake Rimosso" : "✅ Correzione Approvata"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {rc.created_at ? rc.created_at.slice(0, 16).replace("T", " ") : ""}
                      </span>
                      <button
                        onClick={() => handleDeleteResolvedContest(rc.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-amber-500/15 transition text-[11px] border border-transparent hover:border-amber-500/30"
                        title="Rimuovi solo contestazione dallo storico (il blooper resta nel catalogo)"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline text-[10px] font-medium">Rimuovi dallo Storico</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-zinc-300 space-y-1">
                    <p><strong className="text-zinc-400">Segnalazione/Motivo:</strong> {rc.motivo || "Nessun motivo specificato"}</p>
                    {rc.errori?.descrizione && (
                      <p className="text-[11px] text-zinc-400"><strong className="text-zinc-500">Blooper attivo nel catalogo:</strong> {rc.errori.descrizione}</p>
                    )}
                  </div>

                  <div className="pt-1 text-[11px] text-zinc-400 flex items-center justify-between border-t border-zinc-800/60">
                    <span>
                      Risolto per conto di: <strong className="text-amber-400">{rc.user_handle || "Utente"}</strong>
                    </span>
                    <span className="text-emerald-400 font-mono font-bold">Punti accreditati ✓</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 5. REGISTRO CONFERME (👍) */}
      {subTab === "conferme" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 flex items-start gap-3">
            <ThumbsUp className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-white text-sm">
                Registro Voti della Community (👍 Pollici in Su)
              </p>
              <p className="text-zinc-300 leading-relaxed text-xs">
                In questa sezione hai piena visibilità su tutti i voti positivi espressi dagli utenti registrati. 
                Per scongiurare il &quot;clic selvaggio&quot; e tentativi di scalata artificiosa della classifica, il voto 👍 <strong className="text-white">non assegna punti all&apos;utente</strong>, ma serve unicamente ad accrescere l&apos;indice di attendibilità del blooper e a portarlo in cima all&apos;ordinamento dei film.
              </p>
            </div>
          </div>

          {(!data.conferme || data.conferme.length === 0) ? (
            <div className="py-12 text-center text-zinc-500 text-xs rounded-2xl border border-zinc-800 bg-zinc-900/40">
              Nessun voto di conferma registrato finora.
            </div>
          ) : (
            <div className="space-y-3">
              {data.conferme.map((c: any) => {
                const film = c.errori?.films;
                return (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3 hover:border-zinc-700 transition"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-white">🎬 {film?.titolo || "Film"}</span>
                        <span className="text-zinc-500 font-mono">({film?.anno || "N/D"})</span>
                        {c.errori?.minuto && (
                          <span className="bg-amber-500/20 text-amber-300 font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                            ⏱️ ~{c.errori.minuto.replace(/^~/, "")}
                          </span>
                        )}
                        {c.errori?.categoria && (
                          <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded text-[11px]">
                            {c.errori.categoria}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 text-[11px]">
                          👍 Confermato
                        </span>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {c.created_at ? c.created_at.slice(0, 16).replace("T", " ") : ""}
                        </span>
                      </div>
                    </div>

                    {/* Descrizione blooper votato */}
                    {c.errori?.descrizione && (
                      <p className="text-xs text-zinc-300 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 leading-relaxed">
                        {c.errori.descrizione}
                      </p>
                    )}

                    {/* Footer con info utente che ha votato e totale conferme */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/60 text-xs">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <span>
                          Votato da: <strong className="text-amber-400">{c.user_handle}</strong>{" "}
                          {c.user_email && <span className="text-zinc-500 font-mono text-[11px]">({c.user_email})</span>}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase font-bold border border-zinc-700">
                          {c.user_tier || "free"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <span>Totale conferme blooper:</span>
                        <span className="font-bold text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                          {c.errori?.conferme ?? 1} 👍
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modale di Conferma Eliminazione in stile App */}
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
