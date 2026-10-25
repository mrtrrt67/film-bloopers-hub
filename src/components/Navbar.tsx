"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  Film,
  Compass,
  Trophy,
  Sparkles,
  Lightbulb,
  Shield,
  CreditCard,
  LogOut,
  ChevronDown,
  Menu,
  X,
  LogIn,
  ExternalLink
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AuthModal from "./AuthModal";

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
  const isAdmin = user && user.email && user.email.toLowerCase() === adminEmail;

  // Carica utente e profilo
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }: { data: any }) => {
      const u = data?.user || null;
      setUser(u);
      if (u) {
        try {
          const { data: p } = await supabase
            .from("profiles")
            .select("tier, tipo_abbonamento, punti")
            .eq("id", u.id)
            .maybeSingle();
          if (p) setUserProfile(p);
        } catch (e) {
          console.error(e);
        }
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      const u = session?.user || null;
      setUser(u);
      if (u) {
        try {
          const { data: p } = await supabase
            .from("profiles")
            .select("tier, tipo_abbonamento, punti")
            .eq("id", u.id)
            .maybeSingle();
          if (p) setUserProfile(p);
        } catch (e) {
          console.error(e);
        }
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Chiudi menu al cambio pagina
  useEffect(() => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  // Click-outside per chiudere il menu utente
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleManageSubscription = async () => {
    setOpeningPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Impossibile aprire il portale Stripe in questo momento.");
      }
    } catch (e) {
      console.error(e);
      alert("Errore di connessione.");
    } finally {
      setOpeningPortal(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // Navigazione principale leggera, tipografica e ariosa
  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/esplora", label: "Esplora" },
    { href: "/classifica", label: "Classifica" },
    { href: "/pricing", label: "Piani Premium", isHighlight: true },
    { href: "/suggerimenti", label: "Suggerimenti" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/60 bg-zinc-950/75 backdrop-blur-xl transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Logo Minimalista & Moderno */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 shadow-md shadow-orange-500/15 group-hover:scale-105 transition-all">
              <Film className="h-4.5 w-4.5 text-zinc-950" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-black tracking-tight text-white group-hover:text-amber-400 transition-colors">
                FilmBloopers
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                Hub
              </span>
            </div>
          </Link>

          {/* Navigazione Desktop Tipografica (Ariosa, senza icone ingombranti) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    isActive
                      ? "bg-zinc-800/90 text-white shadow-sm border border-zinc-700/60"
                      : link.isHighlight
                      ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 font-bold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Sezione Azioni Utente (Raggruppata e ordinata) */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative" ref={userMenuRef}>
                {/* Trigger Profilo Utente Unificato */}
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border transition-all text-xs ${
                    userMenuOpen
                      ? "border-amber-500/50 bg-zinc-900 shadow-md ring-2 ring-amber-500/20"
                      : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900"
                  }`}
                >
                  {/* Avatar con iniziale */}
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-zinc-950 font-black text-[11px] shadow-sm">
                    {user.email ? user.email.slice(0, 1).toUpperCase() : "U"}
                  </div>

                  {/* Nome/Username compatto */}
                  <span className="max-w-[110px] truncate font-medium text-zinc-200">
                    {user.user_metadata?.username ? `@${user.user_metadata.username.replace(/^@/, "")}` : `@${user.email?.split("@")[0]}`}
                  </span>

                  {/* Badge Abbonamento */}
                  {userProfile?.tipo_abbonamento === "lifetime" ? (
                    <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black px-1.5 py-0.5">
                      👑 Leggenda
                    </span>
                  ) : userProfile?.tier === "premium" || userProfile?.tipo_abbonamento === "mensile" || userProfile?.tipo_abbonamento === "annuale" ? (
                    <span className="rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-black px-1.5 py-0.5">
                      ⭐ VIP
                    </span>
                  ) : null}

                  <ChevronDown
                    className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${
                      userMenuOpen ? "rotate-180 text-amber-400" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu Raffinato */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2.5 w-72 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-2 shadow-2xl backdrop-blur-2xl z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Header Utente nel Dropdown */}
                    <div className="p-3 bg-zinc-900/50 rounded-xl mb-1.5 border border-zinc-800/60">
                      <p className="text-[11px] text-zinc-500">Account Connesso</p>
                      <p className="font-bold text-white truncate text-xs mt-0.5">{user.email}</p>
                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-zinc-800 text-[11px]">
                        <span className="text-zinc-400">
                          {userProfile?.tipo_abbonamento === "lifetime"
                            ? "👑 Accesso a Vita"
                            : userProfile?.tipo_abbonamento === "mensile"
                            ? "⭐ Premium Mensile"
                            : userProfile?.tipo_abbonamento === "annuale"
                            ? "⭐ Premium Annuale"
                            : "Piano Base (Free)"}
                        </span>
                        <span className="font-bold text-amber-400 font-mono">
                          {userProfile?.punti || 0} Punti
                        </span>
                      </div>
                    </div>

                    {/* Voci di Azione */}
                    <div className="space-y-0.5">
                      {/* Gestione Abbonamento Stripe (1 Clic) */}
                      {(userProfile?.tipo_abbonamento === "mensile" || userProfile?.tipo_abbonamento === "annuale") && (
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            handleManageSubscription();
                          }}
                          disabled={openingPortal}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-purple-300 hover:bg-purple-950/30 hover:text-purple-200 transition-colors text-left"
                        >
                          <span className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-purple-400" />
                            <span>{openingPortal ? "Apertura..." : "Gestisci o Disdici (1 Clic)"}</span>
                          </span>
                          <ExternalLink className="h-3 w-3 text-purple-400" />
                        </button>
                      )}

                      {/* Upgrade a Premium se utente Free */}
                      {(!userProfile?.tier || userProfile?.tier === "free") && (
                        <Link
                          href="/pricing"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors font-semibold"
                        >
                          <Sparkles className="h-4 w-4" />
                          <span>Passa a Premium (da 0,99€)</span>
                        </Link>
                      )}

                      {/* Console Admin (inclusa qui per l'amministratore invece che occupare la navbar) */}
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-amber-300 hover:bg-amber-500/10 transition-colors font-bold"
                        >
                          <Shield className="h-4 w-4 text-amber-400" />
                          <span>Console Amministrazione</span>
                        </Link>
                      )}

                      <Link
                        href="/suggerimenti"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors"
                      >
                        <Lightbulb className="h-4 w-4 text-zinc-400" />
                        <span>Invia un Suggerimento</span>
                      </Link>

                      <Link
                        href="/classifica"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors"
                      >
                        <Trophy className="h-4 w-4 text-amber-400" />
                        <span>Classifica Cacciatori</span>
                      </Link>
                    </div>

                    {/* Logout */}
                    <div className="pt-1.5 mt-1.5 border-t border-zinc-800">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Disconnetti</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="text-xs font-semibold text-zinc-300 hover:text-white px-3 py-2 rounded-lg hover:bg-zinc-900 transition-colors"
                >
                  Accedi
                </button>
                <Link
                  href="/esplora"
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-1.5 text-xs font-black text-zinc-950 shadow-md shadow-orange-500/15 hover:brightness-110 active:scale-98 transition-all"
                >
                  <Compass className="h-3.5 w-3.5" />
                  <span>Esplora</span>
                </Link>
              </div>
            )}
          </div>

          {/* Bottone Menu Mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Menu Mobile Pulito & Ordinato */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-zinc-800 bg-zinc-950/95 px-4 pt-3 pb-5 space-y-1 backdrop-blur-2xl">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 text-xs font-bold rounded-lg transition-colors ${
                    isActive
                      ? "bg-zinc-800 text-white"
                      : link.isHighlight
                      ? "text-amber-400 hover:bg-amber-500/10"
                      : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {/* Azioni Profilo su Mobile */}
            <div className="pt-3 mt-2 border-t border-zinc-800/80">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/40 rounded-xl">
                    <span className="text-xs text-zinc-300 truncate max-w-[180px] font-medium">
                      {user.user_metadata?.username ? `@${user.user_metadata.username.replace(/^@/, "")}` : `@${user.email?.split("@")[0]}`}
                    </span>
                    {userProfile?.tipo_abbonamento === "lifetime" ? (
                      <span className="rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black px-2 py-0.5">
                        👑 Leggenda
                      </span>
                    ) : userProfile?.tier === "premium" || userProfile?.tipo_abbonamento === "mensile" || userProfile?.tipo_abbonamento === "annuale" ? (
                      <span className="rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-black px-2 py-0.5">
                        ⭐ VIP
                      </span>
                    ) : null}
                  </div>

                  {/* Disdetta / Gestione 1 Clic se abbonato */}
                  {(userProfile?.tipo_abbonamento === "mensile" || userProfile?.tipo_abbonamento === "annuale") && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleManageSubscription();
                      }}
                      disabled={openingPortal}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 text-xs font-bold text-purple-300 hover:bg-purple-500/20 transition"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>{openingPortal ? "Apertura Portale..." : "Gestisci o Disdici (1 Clic)"}</span>
                    </button>
                  )}

                  {/* Console Amministratore */}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs font-bold text-amber-400"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Console Amministrazione</span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Disconnetti</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setAuthModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-xs font-bold text-white"
                  >
                    <LogIn className="h-4 w-4 text-amber-400" />
                    <span>Accedi o Registrati</span>
                  </button>
                  <Link
                    href="/esplora"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-xs font-black text-zinc-950"
                  >
                    <Compass className="h-4 w-4" />
                    <span>Inizia la ricerca</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Modale Autenticazione */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </>
  );
}
