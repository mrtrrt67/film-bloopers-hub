"use client";

import { useState, useEffect } from "react";
import { Users, Shield, RefreshCw, Trash2, Save, Calendar, Search } from "lucide-react";

export default function AdminUsersTab() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState("");

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
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: profile.id,
          tier: profile.tier,
          tipo_abbonamento: profile.tipo_abbonamento || profile.subscription_type,
          data_scadenza: profile.data_scadenza || profile.expires_at,
          calls_today: profile.calls_today,
        }),
      });
      if (!res.ok) alert("Errore durante il salvataggio utente");
    } catch (err) {
      console.error(err);
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!confirm(`Sei sicuro di voler eliminare l'utente ${email}?`)) return;
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setProfiles((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = profiles.filter((p) => {
    if (!filterQuery.trim()) return true;
    const term = filterQuery.toLowerCase();
    return (p.email || "").toLowerCase().includes(term) || (p.tier || "").toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
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
                {filtered.map((profile) => (
                  <tr key={profile.id} className="hover:bg-zinc-800/30">
                    <td className="py-3 px-4">
                      <p className="font-bold text-white">{profile.email || "N/D"}</p>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        📅 {profile.created_at ? profile.created_at.slice(0, 10) : "N/D"} | 🏆 {profile.punti || 0} pts
                      </p>
                    </td>

                    {/* Tier Select */}
                    <td className="py-3 px-4">
                      <select
                        value={profile.tier || "free"}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProfiles((prev) =>
                            prev.map((p) => (p.id === profile.id ? { ...p, tier: val } : p))
                          );
                        }}
                        className="rounded-lg bg-zinc-950 border border-zinc-700 px-2 py-1 text-xs text-zinc-200 font-bold focus:outline-none focus:border-amber-500"
                      >
                        <option value="free">free</option>
                        <option value="premium">premium</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>

                    {/* Subscription Type */}
                    <td className="py-3 px-4">
                      {profile.tier === "premium" ? (
                        <select
                          value={profile.tipo_abbonamento || profile.subscription_type || "lifetime"}
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
                          <option value="lifetime">lifetime</option>
                        </select>
                      ) : (
                        <span className="text-zinc-600 text-[11px] font-mono">N/A</span>
                      )}
                    </td>

                    {/* Expiration Date */}
                    <td className="py-3 px-4">
                      {profile.tier === "premium" && (profile.tipo_abbonamento === "mensile" || profile.subscription_type === "mensile") ? (
                        <input
                          type="date"
                          value={(profile.data_scadenza || profile.expires_at || "").slice(0, 10)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProfiles((prev) =>
                              prev.map((p) =>
                                p.id === profile.id
                                  ? { ...p, data_scadenza: val, expires_at: val }
                                  : p
                              )
                            );
                          }}
                          className="rounded-lg bg-zinc-950 border border-zinc-700 px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 font-mono"
                        />
                      ) : (
                        <span className="text-zinc-500 text-[11px]">Illimitato</span>
                      )}
                    </td>

                    {/* Calls Today */}
                    <td className="py-3 px-4 font-mono font-bold">
                      {profile.tier === "admin" ? (
                        <span className="text-amber-400">🛡️ Illimitate</span>
                      ) : (
                        <span className="text-zinc-300">{profile.calls_today ?? 0}</span>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
