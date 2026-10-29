"use client";

import { useState, useEffect } from "react";
import { 
  Shield, 
  BarChart3, 
  Film, 
  Users, 
  AlertTriangle, 
  FileText, 
  MessageSquare, 
  Sliders, 
  Sparkles,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthModal from "@/components/AuthModal";

// Sotto-componenti modulari per ciascuna tab
import AdminStatsTab from "@/components/admin/AdminStatsTab";
import AdminLogsTab from "@/components/admin/AdminLogsTab";
import AdminFilmsTab from "@/components/admin/AdminFilmsTab";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import AdminModerationTab from "@/components/admin/AdminModerationTab";
import AdminSuggestionsTab from "@/components/admin/AdminSuggestionsTab";
import AdminConfigTab from "@/components/admin/AdminConfigTab";
import AdminErrorBoundary from "@/components/admin/AdminErrorBoundary";

type AdminTab = "stats" | "logs" | "films" | "users" | "moderation" | "suggestions" | "config";

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>("stats");
  const [filmsFilter, setFilmsFilter] = useState<string>("all");
  const [authModalOpen, setAuthModalOpen] = useState(false);

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

  const handleNavigateToFilms = (filter: string = "all") => {
    setFilmsFilter(filter);
    setActiveTab("films");
  };

  if (loadingUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  // Schermata per utenti non amministratori
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
          className="rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-zinc-950 shadow-md hover:brightness-110 active:scale-95 transition"
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

  const tabsConfig: Array<{ id: AdminTab; label: string; icon: any }> = [
    { id: "stats", label: "Traffico & Statistiche", icon: BarChart3 },
    { id: "logs", label: "Log di Sistema", icon: FileText },
    { id: "films", label: "Archivio Film & Manutenzione", icon: Film },
    { id: "users", label: "Gestione Utenti", icon: Users },
    { id: "moderation", label: "Moderazione Bloopers", icon: AlertTriangle },
    { id: "suggestions", label: "Suggerimenti", icon: MessageSquare },
    { id: "config", label: "Testi & Promo", icon: Sliders },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      {/* INTESTAZIONE ADMIN CONSOLE */}
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
            Pannello di Controllo & Gestione Completa
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Accesso amministratore verificato: <strong className="text-zinc-200">{adminEmail}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/esplora"
            className="rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 transition"
          >
            Vai al Catalogo Pubblico &rarr;
          </Link>
        </div>
      </div>

      {/* BARRA TAB DI NAVIGAZIONE */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-4 mb-8 overflow-x-auto scrollbar-none">
        {tabsConfig.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20"
                  : "bg-zinc-900/80 text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* CONTENUTO DELLE TAB */}
      <AdminErrorBoundary key={activeTab} tabName={tabsConfig.find((t) => t.id === activeTab)?.label || activeTab}>
        {activeTab === "stats" && (
          <AdminStatsTab onNavigateToFilms={handleNavigateToFilms} />
        )}

        {activeTab === "logs" && (
          <AdminLogsTab />
        )}

        {activeTab === "films" && (
          <AdminFilmsTab initialFilter={filmsFilter} />
        )}

        {activeTab === "users" && (
          <AdminUsersTab />
        )}

        {activeTab === "moderation" && (
          <AdminModerationTab />
        )}

        {activeTab === "suggestions" && (
          <AdminSuggestionsTab />
        )}

        {activeTab === "config" && (
          <AdminConfigTab />
        )}
      </AdminErrorBoundary>
    </div>
  );
}
