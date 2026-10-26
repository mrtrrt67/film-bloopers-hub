"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, XCircle, Trash2, Edit3, Shield, Award } from "lucide-react";

export default function AdminModerationTab() {
  const [subTab, setSubTab] = useState<"pending" | "contests" | "corrections" | "approved">("pending");
  const [data, setData] = useState<{ pending: any[]; contestazioni: any[]; approved: any[]; corrections: any[] }>({
    pending: [],
    contestazioni: [],
    approved: [],
    corrections: [],
  });
  const [loading, setLoading] = useState(true);
  const [pointsMap, setPointsMap] = useState<Record<string, number>>({});
  const [contestEditMap, setContestEditMap] = useState<Record<string, { minuto: string; descrizione: string; points: number }>>({});

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
        alert(json.message || "Blooper approvato con successo e punti assegnati!");
        setData((prev) => ({
          ...prev,
          pending: prev.pending.filter((b) => b.id !== blooper.id),
        }));
      } else {
        alert("Errore approvazione: " + (json.error || "Impossibile approvare"));
      }
    } catch (err: any) {
      alert("Errore di rete: " + err.message);
    }
  };

  const handleReject = async (blooperId: number | string) => {
    if (!confirm("Sei sicuro di voler rifiutare ed eliminare questa segnalazione?")) return;
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", blooper_id: blooperId }),
      });
      const json = await res.json();
      if (res.ok) {
        alert(json.message || "Segnalazione rifiutata ed eliminata.");
        setData((prev) => ({
          ...prev,
          pending: prev.pending.filter((b) => b.id !== blooperId),
        }));
      } else {
        alert("Errore rifiuto: " + (json.error || "Impossibile eliminare"));
      }
    } catch (err: any) {
      alert("Errore di rete: " + err.message);
    }
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
        alert(json.message || `Contestazione accettata: blooper corretto e ${edit.points} punti assegnati al segnalatore!`);
        setData((prev) => ({
          ...prev,
          contestazioni: prev.contestazioni.filter((c) => c.id !== contest.id),
        }));
      } else {
        alert("Errore salvataggio correzione: " + (json.error || "Operazione non riuscita"));
      }
    } catch (err: any) {
      alert("Errore di rete: " + err.message);
    }
  };

  const handleDeleteContestedBlooper = async (contest: any) => {
    const defaultPts = contest.is_double_points ? 20 : 10;
    const edit = contestEditMap[contest.id] || {
      points: defaultPts,
    };
    const pts = edit.points;
    const authorName = contest.user_handle || (contest.user_email ? `@${contest.user_email.split("@")[0]}` : "all'utente che ha smascherato l'errore");
    if (!confirm(`Eliminare definitivamente questo blooper errato dal catalogo ed assegnare ${pts} punti a ${authorName} per averlo smascherato?`)) return;
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
        alert(json.message || `Blooper errato eliminato dall'archivio e ${pts} punti assegnati!`);
        setData((prev) => ({
          ...prev,
          contestazioni: prev.contestazioni.filter((c) => c.id !== contest.id),
        }));
      } else {
        alert("Errore eliminazione: " + (json.error || "Operazione non riuscita"));
      }
    } catch (err: any) {
      alert("Errore di rete: " + err.message);
    }
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
        alert(json.message || "Contestazione respinta: blooper confermato e contestazione archiviata.");
        setData((prev) => ({
          ...prev,
          contestazioni: prev.contestazioni.filter((c) => c.id !== contestId),
        }));
      } else {
        alert("Errore archiviazione: " + (json.error || "Operazione non riuscita"));
      }
    } catch (err: any) {
      alert("Errore di rete: " + err.message);
    }
  };

  const handleDeleteApproved = async (blooperId: string | number) => {
    if (!confirm("Eliminare definitivamente questo blooper dall'archivio pubblico?")) return;
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_approved", blooper_id: blooperId }),
      });
      const json = await res.json();
      if (res.ok) {
        alert(json.message || "Blooper eliminato dall'archivio.");
        setData((prev) => ({
          ...prev,
          approved: prev.approved.filter((a) => a.id !== blooperId),
        }));
      } else {
        alert("Errore eliminazione: " + (json.error || "Operazione non riuscita"));
      }
    } catch (err: any) {
      alert("Errore di rete: " + err.message);
    }
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
        alert(resJson.message || "Correzione approvata e punti assegnati!");
        setData((prev) => ({
          ...prev,
          corrections: (prev.corrections || []).filter((c) => c.id !== corr.id),
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectCorrection = async (corrId: string | number) => {
    if (!confirm("Rifiutare ed eliminare questa correzione?")) return;
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
        setData((prev) => ({
          ...prev,
          corrections: (prev.corrections || []).filter((c) => c.id !== corrId),
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          Archivio Approvati ({data.approved.length})
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

      {/* 4. ARCHIVIO APPROVATI */}
      {subTab === "approved" && (
        <div className="space-y-3">
          {data.approved.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs rounded-2xl border border-zinc-800 bg-zinc-900/40">
              Nessun blooper approvato dagli utenti in archivio.
            </div>
          ) : (
            data.approved.map((appItem) => (
              <div
                key={appItem.id}
                className="flex items-start justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 hover:border-zinc-700 transition"
              >
                <div className="space-y-1 text-xs flex-1">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <span>🎬 {appItem.films?.titolo || "Film"}</span>
                    <span className="font-mono text-amber-400">⏱️ {appItem.minuto}</span>
                    <span className="text-[10px] text-zinc-500 font-normal">
                      Da: {appItem.inserito_da || "Utente"}
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs">{appItem.descrizione}</p>
                </div>
                <button
                  onClick={() => handleDeleteApproved(appItem.id)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                  title="Elimina blooper dall'archivio"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
