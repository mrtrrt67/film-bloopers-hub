"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-950/40 border border-red-800/60 p-3 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="flex flex-col items-center text-center py-4 space-y-3">
            <CheckCircle className="h-10 w-10 text-emerald-400" />
            <h3 className="text-sm font-bold text-emerald-300">Password aggiornata con successo!</h3>
            <p className="text-xs text-zinc-400">Verrai reindirizzato alla home tra pochi secondi...</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Nuova Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Conferma Nuova Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
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
