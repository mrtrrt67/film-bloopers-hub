"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Lock, Mail, User, ArrowRight, UserCheck, KeyRound, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "login" | "register" | "forgot";
  onSuccess?: () => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  defaultMode = "login",
  onSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">(defaultMode);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const supabase = createClient();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === "login") {
        let targetEmail = email.trim();

        // Se l'utente ha inserito uno username invece dell'email (nessuna @)
        if (!targetEmail.includes("@")) {
          const cleanUsername = targetEmail.replace(/^@/, "").trim();
          const { data: found } = await supabase
            .from("profiles")
            .select("email")
            .ilike("email", `${cleanUsername}@%`)
            .maybeSingle();

          if (found?.email) {
            targetEmail = found.email;
          } else {
            throw new Error(`Nessun account trovato per l'username "${cleanUsername}". Prova ad accedere inserendo la tua email.`);
          }
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            throw new Error("Credenziali non valide. Controlla email/username e password.");
          }
          throw error;
        }

        setSuccessMsg("Accesso effettuato con successo!");
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
          window.location.reload();
        }, 800);
      } else if (mode === "register") {
        if (password.length < 6) {
          throw new Error("La password deve contenere almeno 6 caratteri.");
        }
        if (password !== confirmPassword) {
          throw new Error("Le due password non corrispondono.");
        }

        const cleanUsername =
          username.trim().replace(/^@/, "").replace(/\s+/g, "_") ||
          email.split("@")[0] ||
          "Cacciatore";

        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: cleanUsername,
            },
          },
        });

        if (error) throw error;

        setSuccessMsg("Registrazione completata! Controlla la tua email per verificare l'account.");
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
        }, 2000);
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });

        if (error) throw error;

        setSuccessMsg("Email di recupero inviata! Controlla la tua casella di posta.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Si è verificato un errore durante l'operazione.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/95 p-6 sm:p-8 shadow-2xl shadow-amber-500/10 backdrop-blur-xl">
        {/* Glow */}
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <KeyRound className="h-4 w-4" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              Community FilmBloopers
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {mode === "login"
              ? "Bentornato su FilmBloopers"
              : mode === "register"
              ? "Crea il tuo Account"
              : "Recupera la tua Password"}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {mode === "login"
              ? "Accedi per segnalare bloopers, votare le incongruenze e scalare la classifica."
              : mode === "register"
              ? "Unisciti alla community di appassionati ed entra nella caccia agli errori."
              : "Inserisci la tua email per ricevere il link di ripristino password."}
          </p>
        </div>

        {/* Tab switcher */}
        {mode !== "forgot" && (
          <div className="flex rounded-xl bg-zinc-950 p-1 mb-6 border border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                mode === "login"
                  ? "bg-amber-500 text-zinc-950 shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Accedi
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                mode === "register"
                  ? "bg-amber-500 text-zinc-950 shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Registrati
            </button>
          </div>
        )}

        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-300">
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Username pubblico <span className="text-zinc-500 font-normal">(Nickname)</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="es. Cinefilo99 (opzionale)"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                🔒 Questo nome comparirà come autore dei bloopers e in classifica al posto della tua email.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              {mode === "login" ? "Email o Username" : "Indirizzo Email"}
            </label>
            <div className="relative">
              {mode === "login" ? (
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              ) : (
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              )}
              <input
                type={mode === "login" ? "text" : "email"}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === "login" ? "nome@esempio.com oppure Cinefilo99" : "nome@esempio.com"}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {mode !== "forgot" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-zinc-300">
                  Password
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] font-semibold text-amber-400 hover:underline"
                  >
                    Password dimenticata?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimo 6 caratteri"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {mode === "register" && (
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Conferma Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ripeti la password"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-bold text-zinc-950 shadow-lg shadow-orange-500/20 hover:brightness-110 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span className="animate-pulse">Caricamento...</span>
            ) : mode === "login" ? (
              <>
                <span>Accedi Subito</span>
                <ArrowRight className="h-4 w-4" />
              </>
            ) : mode === "register" ? (
              <>
                <UserCheck className="h-4 w-4" />
                <span>Crea Account Gratuito</span>
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                <span>Invia Link di Ripristino</span>
              </>
            )}
          </button>

          {mode === "register" && (
            <p className="text-[11px] text-zinc-500 text-center leading-normal pt-1">
              Creando un account accetti i nostri{" "}
              <Link
                href="/termini"
                target="_blank"
                className="text-amber-400/90 underline hover:text-amber-300"
              >
                Termini di Servizio
              </Link>{" "}
              e l&apos;
              <Link
                href="/privacy"
                target="_blank"
                className="text-amber-400/90 underline hover:text-amber-300"
              >
                Informativa Privacy
              </Link>.
            </p>
          )}
        </form>

        {mode === "forgot" && (
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-xs font-bold text-zinc-400 hover:text-amber-400 transition-colors"
            >
              ← Torna al login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
