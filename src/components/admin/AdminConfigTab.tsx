"use client";

import { useState, useEffect } from "react";
import { Sliders, Save, Check, Calendar, Eye, EyeOff, Sparkles, Trash2 } from "lucide-react";
import { formatDateItalian } from "@/lib/utils";
import ConfirmModal from "@/components/ConfirmModal";

const CONFIG_METADATA: Record<string, { label: string; desc?: string }> = {
  home_banner_top_testo: {
    label: "Testo Banner Promozionale Homepage",
    desc: "Testo del banner promo in alto. Usa il segnaposto {scadenza} per inserire automaticamente la data della promo formattata in italiano ed evidenziata.",
  },
  home_banner_top_titolo: {
    label: "Titolo Banner Promozionale Homepage",
    desc: "Intestazione principale in evidenza nel banner (es. PROMO SPECIALE DI LANCIO STARTUP).",
  },
  home_banner_top_badge: {
    label: "Badge Banner Promozionale Homepage",
    desc: "Etichetta del banner promo (es. Offerta a Tempo Limitato).",
  },
  home_banner_top: {
    label: "Visibilità Banner Promozionale Homepage",
    desc: "Imposta 'true' per visualizzarlo o 'false' per nasconderlo.",
  },
  soglia_punti_mensile: {
    label: "Soglia Punti per 1 Mese Premium Gratuito",
    desc: "Numero di punti necessari affinché un utente guadagni automaticamente 1 mese gratis.",
  },
  soglia_punti_lifetime: {
    label: "Soglia Punti per Accesso Lifetime a Vita",
    desc: "Numero di punti necessari per sbloccare l'accesso Premium a vita.",
  },
  classifica_titolo: {
    label: "Titolo Pagina Classifica",
  },
  classifica_banner_titolo: {
    label: "Titolo Box Regole e Punteggi",
  },
  classifica_testo_1: {
    label: "Spiegazione Regola Base Classifica",
  },
  classifica_testo_2: {
    label: "Spiegazione Premio Mensile",
    desc: "Puoi usare {soglia_mensile} nel testo.",
  },
  classifica_testo_3: {
    label: "Spiegazione Premio Lifetime",
    desc: "Puoi usare {soglia_lifetime} nel testo.",
  },
  footer_testo_principale: {
    label: "Testo Principale Footer",
  },
  footer_testo_amazon: {
    label: "Disclaimer Affiliazione Amazon Footer",
  },
};

export default function AdminConfigTab() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanFeedback, setCleanFeedback] = useState<string | null>(null);

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

  const handleExecuteProductionCleanup = async () => {
    openConfirm(
      "Reset Dati di Test Produzione",
      "ATTENZIONE: Sei sicuro di voler azzerare tutti i dati di test (suggerimenti, voti, contestazioni, punti classifiche e log ricerche)? Questa operazione non tocca film né bloopers.",
      async () => {
        try {
          setCleaning(true);
          setCleanFeedback(null);
          const res = await fetch("/api/admin/cleanup", { method: "POST" });
          const data = await res.json();
          if (res.ok) {
            setCleanFeedback("✅ " + (data.message || "Pulizia completata con successo!"));
            setTimeout(() => window.location.reload(), 1500);
          } else {
            setCleanFeedback("❌ Errore pulizia: " + (data.error || "Errore sconosciuto"));
          }
        } catch (e: any) {
          setCleanFeedback("❌ Errore di rete: " + e.message);
        } finally {
          setCleaning(false);
        }
      }
    );
  };

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
        setCleanFeedback("❌ Errore salvataggio configurazioni");
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
            Personalizza dinamicamente la data limite della promo Startup Lifetime, i messaggi promozionali e regola i blocchi del portale.
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

      {/* 1. SCADENZA PROMO STARTUP LIFETIME (DINAMICA & FORMATO ITALIANO) */}
      {promoConfig && (
        <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-950/20 to-zinc-900 p-5 sm:p-6 space-y-4 shadow-lg shadow-amber-500/5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              ⭐ Scadenza Offerta Promo Lifetime Startup (Dinamica)
            </h4>
            <button
              onClick={() => handleVisibilityToggle(promoConfig.chiave)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                promoConfig.visibile
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-zinc-800 text-zinc-500 border border-zinc-700"
              }`}
            >
              {promoConfig.visibile ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {promoConfig.visibile ? "Visibile" : "Nascosto"}
            </button>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            Seleziona la data limite per sbloccare l&apos;accesso Lifetime gratuito. La data verrà automaticamente convertita in <strong>formato italiano</strong> ed <strong>evidenziata graficamente</strong> nel banner in home e nelle pagine del sito.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
            <input
              type="date"
              value={promoConfig.valore || ""}
              onChange={(e) => handleTextChange(promoConfig.chiave, e.target.value)}
              className="w-full sm:w-64 rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500 shadow-inner"
            />
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-400">Anteprima nel sito:</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black shadow-sm">
                {formatDateItalian(promoConfig.valore || "2026-12-31")}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-zinc-400">
            <span className="font-semibold text-zinc-500">Scorciatoie veloci:</span>
            <button
              type="button"
              onClick={() => handleTextChange(promoConfig.chiave, "2026-12-31")}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-amber-500/50 text-zinc-300 hover:text-white transition"
            >
              31 Dicembre 2026
            </button>
            <button
              type="button"
              onClick={() => handleTextChange(promoConfig.chiave, "2027-01-01")}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-amber-500/50 text-zinc-300 hover:text-white transition"
            >
              1 Gennaio 2027
            </button>
            <button
              type="button"
              onClick={() => handleTextChange(promoConfig.chiave, "2027-12-31")}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-amber-500/50 text-zinc-300 hover:text-white transition"
            >
              31 Dicembre 2027
            </button>
          </div>
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
            {otherConfigs.map((cfg) => {
              const meta = CONFIG_METADATA[cfg.chiave];

              return (
                <div key={cfg.chiave} className="pt-4 first:pt-0 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-bold text-xs text-amber-400 block">
                        {meta?.label || cfg.chiave}
                      </span>
                      {meta?.desc ? (
                        <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{meta.desc}</p>
                      ) : (
                        <span className="font-mono text-[10px] text-zinc-500">Chiave: {cfg.chiave}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleVisibilityToggle(cfg.chiave)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition shrink-0 ${
                        cfg.visibile
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                      }`}
                    >
                      {cfg.visibile ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {cfg.visibile ? "Visibile" : "Nascosto"}
                    </button>
                  </div>

                  {cfg.chiave === "home_banner_top_testo" && !cfg.valore?.includes("{scadenza}") && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                      <span>
                        💡 <strong>Suggerimento:</strong> Includi <code>&#123;scadenza&#125;</code> per collegare la data dinamica della promo a questo testo.
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleTextChange(
                            cfg.chiave,
                            "Registrati o scala la classifica entro il {scadenza} per sbloccare subito l'accesso <b>Premium Lifetime gratuito</b> a vita!"
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 text-zinc-950 font-bold hover:brightness-110 transition shrink-0"
                      >
                        <Sparkles className="h-3 w-3" />
                        Usa segnaposto dinamico
                      </button>
                    </div>
                  )}

                  {(cfg.valore || "").length > 80 ? (
                    <textarea
                      rows={3}
                      value={cfg.valore || ""}
                      onChange={(e) => handleTextChange(cfg.chiave, e.target.value)}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 leading-relaxed font-normal"
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
              );
            })}
          </div>
        )}
      </div>

      {/* SEZIONE MANUTENZIONE PRODUZIONE: RESET DATI DI TEST */}
      <div className="rounded-3xl border-2 border-rose-500/30 bg-gradient-to-r from-rose-950/20 via-zinc-900 to-zinc-950 p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-black text-rose-400 flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Manutenzione Produzione: Reset Dati di Test & Classifiche
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed max-w-2xl">
              Azzera tutti i dati di test generati durante lo sviluppo: cancella i suggerimenti di prova, i voti e le contestazioni, azzera le classifiche (punti), elimina le segnalazioni in attesa di moderazione e svuota la cronologia delle ricerche.
            </p>
          </div>
          <button
            onClick={handleExecuteProductionCleanup}
            disabled={cleaning}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-lg shadow-rose-600/20 active:scale-95 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{cleaning ? "Pulizia in corso..." : "Esegui Pulizia Produzione"}</span>
          </button>
        </div>
        {cleanFeedback && (
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-bold text-zinc-200 mt-2">
            {cleanFeedback}
          </div>
        )}
      </div>

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

