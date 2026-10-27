"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, CheckCircle, AlertCircle, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        // 1. Se c'è il parametro PKCE code nell'URL, scambialo per una sessione valida
        if (code) {
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr) {
            console.error("Errore scambio codice sessione:", exchangeErr);
            if (isMounted) {
              setError("Il link di recupero password è scaduto o è già stato utilizzato. Richiedi una nuova email di recupero.");
              setVerifying(false);
            }
            return;
          }
          if (isMounted) {
            setSessionReady(true);
            setVerifying(false);
          }
          return;
        }

        // 2. Se non c'è il codice nei query params, controlla se c'è già una sessione attiva (es. hash fragment o sessione esistente)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (isMounted) {
            setSessionReady(true);
            setVerifying(false);
          }
        } else {
          // Attendi eventuale evento PASSWORD_RECOVERY da hash fragment
          const { data: authListener } = supabase.auth.onAuthStateChange((event: any, s: any) => {
            if (!isMounted) return;
            if (event === "PASSWORD_RECOVERY" || s) {
              setSessionReady(true);
              setVerifying(false);
            }
          });

          // Timeout di sicurezza se nessun token viene rilevato dopo 2 secondi
          setTimeout(() => {
            if (isMounted && verifying) {
              setVerifying(false);
            }
          }, 2000);

          return () => {
            authListener.subscription.unsubscribe();
          };
        }
      } catch (err: any) {
        console.error("Errore inizializzazione reset password:", err);
        if (isMounted) {
          setError(err?.message || "Impossibile validare il link di recupero.");
          setVerifying(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("La password deve contenere almeno 6 caratteri.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Le due password inserite non coincidono.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        password,
      });

      if (updateErr) throw updateErr;

      setSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 2500);
    } catch (err: any) {
      setError(err.message || "Impossibile aggiornare la password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-16rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-white">Reimposta la Password</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Inserisci la tua nuova password di accesso per FilmBloopers Hub.
          </p>
        </div>

        {verifying ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
            <p className="text-xs text-zinc-400">Verifica del link di recupero in corso...</p>
          </div>
        ) : error && !sessionReady ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-xl bg-red-950/40 border border-red-800/60 p-3.5 text-xs text-red-300">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">Link non valido o scaduto</span>
                <span>{error}</span>
              </div>
            </div>
            <div className="text-center pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Torna alla home e richiedi un nuovo link
              </Link>
            </div>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center text-center py-4 space-y-3">
            <CheckCircle className="h-10 w-10 text-emerald-400" />
            <h3 className="text-sm font-bold text-emerald-300">Password aggiornata con successo!</h3>
            <p className="text-xs text-zinc-400">Verrai reindirizzato alla home tra pochi secondi...</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-950/40 border border-red-800/60 p-3 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Nuova Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-3.5 pr-10 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Conferma Nuova Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-3.5 pr-10 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-sm font-bold text-zinc-950 shadow-lg shadow-amber-500/20 hover:brightness-110 transition-all disabled:opacity-50"
            >
              {loading ? "Aggiornamento in corso..." : "Salva Nuova Password"}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3 w-3" /> Torna alla home
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
