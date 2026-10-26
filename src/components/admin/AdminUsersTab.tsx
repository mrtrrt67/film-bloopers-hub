"use client";

import { useState, useEffect } from "react";
import { Users, Shield, RefreshCw, Trash2, Save, Calendar, Search, CheckCircle, XCircle, AlertTriangle, X } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";

export default function AdminUsersTab() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
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

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const json = await res.json();
        setProfiles(json.profiles || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleUpdateUser = async (profile: any) => {
    try {
      setSavingId(profile.id);
      const isFree = profile.tier === "free";
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: profile.id,
          tier: profile.tier,
          tipo_abbonamento: isFree ? "nessuno" : (profile.tipo_abbonamento || profile.subscription_type || "mensile"),
          data_scadenza: isFree ? null : (profile.data_scadenza || profile.expires_at || null),
          calls_today: profile.calls_today,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast("success", `Utente ${profile.email || profile.username} aggiornato con successo (Tier: ${profile.tier})!`);
      } else {
        showToast("error", json.error || "Errore durante il salvataggio utente");
      }
    } catch (err: any) {
      console.error(err);
      showToast("error", "Errore di connessione: " + err.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleResetCalls = async (id: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, resetCalls: true }),
      });
      if (res.ok) {
        setProfiles((prev) =>
          prev.map((p) => (p.id === id ? { ...p, calls_today: 0 } : p))
        );
        showToast("info", "Chiamate giornaliere azzerate a 0.");
      } else {
        showToast("error", "Impossibile azzerare le chiamate.");
      }
    } catch (err: any) {
      console.error(err);
      showToast("error", "Errore di rete: " + err.message);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    openConfirm(
      "Elimina Profilo Utente",
      `Sei sicuro di voler eliminare definitivamente il profilo di ${email}? Questa operazione non può essere annullata.`,
      async () => {
        try {
          const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
          if (res.ok) {
            setProfiles((prev) => prev.filter((p) => p.id !== id));
            showToast("info", `Profilo ${email} eliminato con successo.`);
          } else {
            const json = await res.json().catch(() => ({}));
            showToast("error", json.error || "Errore eliminazione profilo.");
          }
        } catch (err: any) {
          console.error(err);
          showToast("error", "Errore di connessione: " + err.message);
        }
      }
    );
  };

  const filtered = profiles.filter((p) => {
    if (!filterQuery.trim()) return true;
    const term = filterQuery.toLowerCase();
    return (p.email || "").toLowerCase().includes(term) || (p.tier || "").toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6 relative">
      {/* Toast Notifiche In-App */}
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-xl">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-400" />
            Gestione Utenti & Abbonamenti ({profiles.length})
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Modifica ruoli, assegna piani Premium, imposta scadenze o azzera le chiamate giornaliere.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Cerca email o tier..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full rounded-xl bg-zinc-900 border border-zinc-800 pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-zinc-500 text-xs rounded-2xl border border-zinc-800 bg-zinc-900/40">
          Nessun utente trovato.
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/40 text-zinc-400 font-semibold">
                  <th className="py-3 px-4">Utente / Iscrizione</th>
                  <th className="py-3 px-4">Tier</th>
                  <th className="py-3 px-4">Tipo Piano</th>
                  <th className="py-3 px-4">Data Scadenza</th>
                  <th className="py-3 px-4">Chiamate Oggi</th>
                  <th className="py-3 px-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {filtered.map((profile) => {
                  const todayStr = new Date().toISOString().slice(0, 10);
                  const isCallToday = profile.last_reset_date === todayStr;

                  return (
                    <tr key={profile.id} className="hover:bg-zinc-800/30">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-amber-400">
                            @{profile.username || (profile.email ? profile.email.split("@")[0] : "utente")}
                          </p>
                          <span className="text-[11px] text-zinc-400 font-mono">({profile.email || "N/D"})</span>
                          {profile.is_admin && (
                            <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-black uppercase text-amber-300 border border-amber-400/40">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          📅 {profile.created_at ? profile.created_at.slice(0, 10) : "N/D"} | 🏆 {profile.punti || 0} pts
                        </p>
                      </td>

                      {/* Tier Select */}
                      <td className="py-3 px-4">
                        {profile.is_admin ? (
                          <span className="font-bold text-amber-400 text-xs flex items-center gap-1">
                            <Shield className="h-3.5 w-3.5" /> admin
                          </span>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <select
                              value={profile.tier || "free"}
                              onChange={(e) => {
                                const val = e.target.value;
                                setProfiles((prev) =>
                                  prev.map((p) => {
                                    if (p.id !== profile.id) return p;
                                    if (val === "free") {
                                      return {
                                        ...p,
                                        tier: "free",
                                        tipo_abbonamento: "nessuno",
                                        subscription_type: "nessuno",
                                        data_scadenza: null,
                                        expires_at: null,
                                        is_expired: false,
                                      };
                                    } else if (val === "premium") {
                                      const nextYear = new Date();
                                      nextYear.setFullYear(nextYear.getFullYear() + 1);
                                      const nextYearStr = nextYear.toISOString().slice(0, 10);
                                      return {
                                        ...p,
                                        tier: "premium",
                                        tipo_abbonamento: p.tipo_abbonamento === "nessuno" || !p.tipo_abbonamento ? "mensile" : p.tipo_abbonamento,
                                        subscription_type: p.subscription_type === "nessuno" || !p.subscription_type ? "mensile" : p.subscription_type,
                                        data_scadenza: p.data_scadenza || nextYearStr,
                                        expires_at: p.expires_at || nextYearStr,
                                        is_expired: false,
                                      };
                                    } else if (val === "admin") {
                                      return {
                                        ...p,
                                        tier: "admin",
                                        tipo_abbonamento: "lifetime",
                                        subscription_type: "lifetime",
                                        data_scadenza: null,
                                        expires_at: null,
                                        is_admin: true,
                                      };
                                    }
                                    return { ...p, tier: val };
                                  })
                                );
                              }}
                              className={`rounded-lg bg-zinc-950 border px-2 py-1 text-xs font-bold focus:outline-none ${
                                profile.tier === "premium"
                                  ? "border-amber-500/50 text-amber-300 focus:border-amber-400"
                                  : "border-zinc-700 text-zinc-200 focus:border-amber-500"
                              }`}
                            >
                              <option value="free">free</option>
                              <option value="premium">premium</option>
                              <option value="admin">admin</option>
                            </select>
                            {profile.is_expired && profile.tier === "free" && (
                              <span className="text-[9px] text-rose-400 font-semibold">
                                ⬇️ Downgradato a free
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Subscription Type */}
                      <td className="py-3 px-4">
                        {profile.is_admin ? (
                          <span className="text-zinc-400 text-[11px] font-mono">Illimitato (Admin)</span>
                        ) : profile.tier === "premium" ? (
                          <div className="flex flex-col gap-1">
                            <select
                              value={profile.tipo_abbonamento || "mensile"}
                              onChange={(e) => {
                                const val = e.target.value;
                                setProfiles((prev) =>
                                  prev.map((p) =>
                                    p.id === profile.id
                                      ? { ...p, tipo_abbonamento: val, subscription_type: val }
                                      : p
                                  )
                                );
                              }}
                              className="rounded-lg bg-zinc-950 border border-zinc-700 px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                            >
                              <option value="mensile">mensile</option>
                              <option value="annuale">annuale</option>
                              <option value="lifetime">lifetime</option>
                              <option value="nessuno">nessuno</option>
                            </select>
                          </div>
                        ) : profile.is_expired ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-zinc-400 text-xs font-mono">nessuno</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30">
                              ⚠️ Ex-Abbonato (Scaduto)
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-[11px] font-mono">nessuno (Free)</span>
                        )}
                      </td>

                      {/* Expiration Date */}
                      <td className="py-3 px-4">
                        {profile.is_admin ? (
                          <span className="text-zinc-500 text-[11px]">Nessuna (Admin)</span>
                        ) : profile.tier === "premium" && (profile.tipo_abbonamento === "mensile" || profile.tipo_abbonamento === "annuale" || profile.subscription_type === "mensile" || profile.subscription_type === "annuale") ? (
                          <div className="flex flex-col gap-1">
                            <input
                              type="date"
                              value={(profile.data_scadenza || profile.expires_at || "").slice(0, 10)}
                              onChange={(e) => {
                                const val = e.target.value;
                                const isExp = val < todayStr;
                                setProfiles((prev) =>
                                  prev.map((p) =>
                                    p.id === profile.id
                                      ? { ...p, data_scadenza: val, expires_at: val, is_expired: isExp }
                                      : p
                                  )
                                );
                              }}
                              className="rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-200 focus:border-amber-500 px-2 py-1 text-xs focus:outline-none font-mono"
                            />
                          </div>
                        ) : profile.tier === "premium" && profile.tipo_abbonamento === "lifetime" ? (
                          <span className="text-emerald-400 text-[11px] font-semibold">A vita (Lifetime)</span>
                        ) : profile.is_expired && profile.data_scadenza ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] text-rose-400 font-mono font-bold">
                              Scaduto il {(profile.data_scadenza || profile.expires_at || "").slice(0, 10)}
                            </span>
                            <span className="text-[9px] text-zinc-500">
                              Passato a Free
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-500 text-[11px]">Nessuna</span>
                        )}
                      </td>

                      {/* Calls Today */}
                      <td className="py-3 px-4 font-mono">
                        {profile.is_admin ? (
                          <span className="text-amber-400 font-bold">🛡️ Illimitate</span>
                        ) : (
                          <div>
                            <span className={`font-bold text-sm ${(profile.calls_today || 0) > 0 ? "text-emerald-400" : "text-zinc-400"}`}>
                              {profile.calls_today ?? 0}
                            </span>
                            <p className="text-[10px] text-zinc-500 font-sans mt-0.5">
                              {isCallToday && (profile.calls_today || 0) > 0
                                ? "Oggi"
                                : profile.last_reset_date
                                ? `Ult. uso: ${profile.last_reset_date}`
                                : "Nessun uso"}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleUpdateUser(profile)}
                          disabled={savingId === profile.id}
                          className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-zinc-950 transition"
                          title="Salva modifiche utente"
                        >
                          <Save className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleResetCalls(profile.id)}
                          className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition"
                          title="Azzera chiamate giornaliere a 0"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(profile.id, profile.email)}
                          className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Elimina profilo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
