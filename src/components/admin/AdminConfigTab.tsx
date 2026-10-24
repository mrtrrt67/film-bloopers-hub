"use client";

import { useState, useEffect } from "react";
import { Sliders, Save, Check, Calendar, Eye, EyeOff } from "lucide-react";

export default function AdminConfigTab() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/config");
      if (res.ok) {
        const json = await res.json();
        setConfigs(json.configs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleTextChange = (chiave: string, valore: string) => {
    setConfigs((prev) =>
      prev.map((c) => (c.chiave === chiave ? { ...c, valore } : c))
    );
  };

  const handleVisibilityToggle = (chiave: string) => {
    setConfigs((prev) =>
      prev.map((c) => (c.chiave === chiave ? { ...c, visibile: !c.visibile } : c))
    );
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: configs }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert("Errore salvataggio configurazioni");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  const promoConfig = configs.find((c) => c.chiave === "promo_lifetime_deadline");
  const otherConfigs = configs.filter((c) => c.chiave !== "promo_lifetime_deadline");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-xl">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Sliders className="h-5 w-5 text-amber-400" />
            Gestione Testi, Promo & Visibilità Sezioni
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Personalizza la data limite della promo Startup Lifetime, i messaggi promozionali e regola quali blocchi mostrare.
          </p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-zinc-950 shadow-md hover:brightness-110 active:scale-95 transition disabled:opacity-50"
        >
          {saving ? (
            <span>Salvataggio...</span>
          ) : saveSuccess ? (
            <>
              <Check className="h-4 w-4" />
              <span>Modifiche Salvate!</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Salva Tutte le Modifiche</span>
            </>
          )}
        </button>
      </div>

      {/* 1. SCADENZA PROMO STARTUP LIFETIME */}
      {promoConfig && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              ⭐ Scadenza Offerta Promo Lifetime Startup
            </h4>
            <button
              onClick={() => handleVisibilityToggle(promoConfig.chiave)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                promoConfig.visibile
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-zinc-800 text-zinc-500"
              }`}
            >
              {promoConfig.visibile ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {promoConfig.visibile ? "Visibile" : "Nascosto"}
            </button>
          </div>
          <p className="text-xs text-zinc-300">
            Questa data viene mostrata nel banner promozionale e nel conto alla rovescia dell&apos;offerta a vita.
          </p>
          <input
            type="date"
            value={promoConfig.valore || ""}
            onChange={(e) => handleTextChange(promoConfig.chiave, e.target.value)}
            className="w-full sm:w-64 rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
          />
        </div>
      )}

      {/* 2. ALTRE CONFIGURAZIONI & TESTI */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-white">
          💬 Testi e Visibilità delle Sezioni del Portale
        </h4>

        {otherConfigs.length === 0 ? (
          <p className="text-xs text-zinc-500 py-4">Nessun&apos;altra chiave di configurazione presente.</p>
        ) : (
          <div className="space-y-4 divide-y divide-zinc-800/60">
            {otherConfigs.map((cfg) => (
              <div key={cfg.chiave} className="pt-4 first:pt-0 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-amber-400">
                    {cfg.chiave}
                  </span>
                  <button
                    onClick={() => handleVisibilityToggle(cfg.chiave)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      cfg.visibile
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {cfg.visibile ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {cfg.visibile ? "Visibile" : "Nascosto"}
                  </button>
                </div>

                {(cfg.valore || "").length > 80 ? (
                  <textarea
                    rows={3}
                    value={cfg.valore || ""}
                    onChange={(e) => handleTextChange(cfg.chiave, e.target.value)}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 leading-relaxed"
                  />
                ) : (
                  <input
                    type="text"
                    value={cfg.valore || ""}
                    onChange={(e) => handleTextChange(cfg.chiave, e.target.value)}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
