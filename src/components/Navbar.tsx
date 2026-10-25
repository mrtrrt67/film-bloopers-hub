"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Film, Trophy, Compass, Sparkles, User, LogOut, Menu, X, Shield, LogIn, Lightbulb } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AuthModal from "./AuthModal";

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const supabase = createClient();

  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mrtrrt67@gmail.com").toLowerCase();
  const isAdmin = user && user.email && user.email.toLowerCase() === adminEmail;

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

  const navLinks = [
    { href: "/", label: "Home", icon: Film },
    { href: "/esplora", label: "Esplora & Cerca", icon: Compass },
    { href: "/classifica", label: "Classifica", icon: Trophy },
    { href: "/pricing", label: "Piani Premium", icon: Sparkles },
    { href: "/suggerimenti", label: "Suggerimenti", icon: Lightbulb },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 transition-transform hover:scale-[1.02]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600 shadow-lg shadow-orange-500/20">
              <Film className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-white">
                FilmBloopers<span className="text-amber-400">Hub</span>
              </span>
              <span className="text-[10px] font-medium tracking-widest text-zinc-400 uppercase -mt-1">
                Errori & Ciak Falsi
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? "bg-zinc-800/80 text-amber-400 shadow-inner"
                      : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                  pathname === "/admin"
                    ? "border-amber-400 bg-amber-500/20 text-amber-300"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                Console Admin
              </Link>
            )}
          </nav>

          {/* User Actions */}
          <div className="hidden md:flex items-center gap-2.5">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300">
                  <User className="h-3.5 w-3.5 text-amber-400" />
                  <span className="max-w-[130px] truncate">{user.email}</span>
                  {userProfile?.tipo_abbonamento === "lifetime" ? (
                    <span className="rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black px-1.5 py-0.5">
                      👑 Leggenda
                    </span>
                  ) : userProfile?.tier === "premium" || userProfile?.tipo_abbonamento === "mensile" || userProfile?.tipo_abbonamento === "annuale" ? (
                    <span className="rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-black px-1.5 py-0.5">
                      ⭐ VIP
                    </span>
                  ) : null}
                </div>

                {/* Pulsante Disdici / Gestisci Abbonamento (1 Clic) se abbonato */}
                {(userProfile?.tipo_abbonamento === "mensile" || userProfile?.tipo_abbonamento === "annuale") && (
                  <button
                    onClick={handleManageSubscription}
                    disabled={openingPortal}
                    className="flex items-center gap-1 rounded-lg border border-purple-500/40 bg-purple-500/10 px-2.5 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition-all shadow-sm"
                    title="Disdici quando vuoi con 1 clic o gestisci il metodo di pagamento nel portale Stripe"
                  >
                    <span>{openingPortal ? "Apertura..." : "Gestisci / Disdici"}</span>
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-800 p-2 text-zinc-400 hover:bg-zinc-900 hover:text-red-400 transition-colors"
                  title="Esci"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 px-3.5 py-2 text-sm font-semibold text-zinc-200 hover:text-white transition-all shadow-sm"
                >
                  <LogIn className="h-4 w-4 text-amber-400" />
                  <span>Accedi</span>
                </button>

                <Link
                  href="/esplora"
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-md shadow-orange-500/10 hover:brightness-110 transition-all"
                >
                  <Compass className="h-4 w-4" />
                  Inizia la ricerca
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-zinc-800 bg-zinc-950/95 px-4 pt-2 pb-4 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg ${
                    isActive ? "bg-zinc-800 text-amber-400" : "text-zinc-300 hover:bg-zinc-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400"
              >
                <Shield className="h-4 w-4" />
                Console Amministratore
              </Link>
            )}

            <div className="pt-2 border-t border-zinc-800/80">
              {user ? (
                <div className="space-y-2 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-zinc-300 truncate max-w-[170px]">{user.email}</span>
                      {userProfile?.tipo_abbonamento === "lifetime" ? (
                        <span className="rounded bg-amber-500/20 text-amber-300 text-[10px] font-black px-1.5 py-0.5">
                          👑 Leggenda
                        </span>
                      ) : userProfile?.tier === "premium" || userProfile?.tipo_abbonamento === "mensile" || userProfile?.tipo_abbonamento === "annuale" ? (
                        <span className="rounded bg-purple-500/20 text-purple-300 text-[10px] font-black px-1.5 py-0.5">
                          ⭐ VIP
                        </span>
                      ) : null}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="text-xs font-bold text-red-400 hover:underline"
                    >
                      Esci
                    </button>
                  </div>
                  {(userProfile?.tipo_abbonamento === "mensile" || userProfile?.tipo_abbonamento === "annuale") && (
                    <button
                      onClick={handleManageSubscription}
                      disabled={openingPortal}
                      className="w-full text-center py-2 rounded-lg border border-purple-500/40 bg-purple-500/10 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition"
                    >
                      {openingPortal ? "Apertura Portale Stripe..." : "Gestisci o Disdici Abbonamento (1 Clic)"}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setAuthModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 py-2.5 text-sm font-bold text-white"
                  >
                    <LogIn className="h-4 w-4 text-amber-400" />
                    Accedi / Registrati
                  </button>
                  <Link
                    href="/esplora"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 text-sm font-bold text-zinc-950"
                  >
                    <Compass className="h-4 w-4" />
                    Inizia la ricerca
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </>
  );
}
