import { Metadata } from "next";
import Link from "next/link";
import { Cookie, ArrowLeft, CheckCircle, ShieldCheck, Settings, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Informativa sui Cookie (Cookie Policy) | FilmBloopers Hub",
  description:
    "Informativa completa sull'utilizzo dei cookie tecnici e di terze parti su FilmBloopers Hub in conformità alla Direttiva ePrivacy e al GDPR.",
};

export default function CookiePage() {
  const lastUpdated = "24 Ottobre 2026";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Navigation & Header */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-amber-400 transition mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Torna alla Home
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Cookie className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Informativa sui Cookie (Cookie Policy)
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Linee guida sull&apos;uso dei cookie e delle tecnologie di tracciamento • Ultimo aggiornamento: {lastUpdated}
              </p>
            </div>
          </div>
        </div>

        {/* Intro */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-3 leading-relaxed text-sm">
          <p className="text-zinc-200">
            La presente Cookie Policy descrive le tipologie di cookie e tecnologie similari impiegate su <strong>FilmBloopers Hub</strong> (&quot;Sito&quot;), le finalità per le quali vengono installati e come l&apos;utente può gestire o revocare le proprie preferenze.
          </p>
          <p className="text-xs text-zinc-400">
            Trattiamo la riservatezza delle informazioni con il massimo rigore: non utilizziamo cookie di profilazione pubblicitaria invasiva né rivendiamo abitudini di navigazione a terze parti.
          </p>
        </div>

        {/* Sezioni */}
        <div className="space-y-6">
          {/* 1. Cosa sono i Cookie */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 text-xs text-amber-400 font-mono">1</span>
              Cosa sono i Cookie?
            </h2>
            <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
              <p>
                I cookie sono brevi frammenti di testo (lettere e/o numeri) che permettono al server web di memorizzare sul client (il browser) informazioni da riutilizzare nel corso della medesima visita al sito (cookie di sessione) o in seguito, anche a distanza di giorni (cookie persistenti).
              </p>
              <p className="text-zinc-400">
                I cookie vengono memorizzati in base alle preferenze dell&apos;utente dal singolo browser sullo specifico dispositivo utilizzato (computer, tablet, smartphone).
              </p>
            </div>
          </div>

          {/* 2. Tipologie di Cookie Utilizzati */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 text-xs text-amber-400 font-mono">2</span>
              Tipologie di Cookie Utilizzati su FilmBloopers Hub
            </h2>

            <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
              {/* Cookie Tecnici Essenziali */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    Cookie Tecnici & di Sessione (Strettamente Necessari)
                  </h3>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Sempre Attivi</span>
                </div>
                <p className="text-zinc-300">
                  Sono indispensabili per il corretto funzionamento del sito e per garantire la sicurezza delle transazioni e dell&apos;autenticazione. Senza questi cookie non sarebbe possibile effettuare il login, mantenere attiva la sessione utente o ricordare il consenso privacy.
                </p>
                <div className="rounded-lg bg-zinc-950 p-3 font-mono text-[11px] text-zinc-400 space-y-1">
                  <p>• <code>sb-*-auth-token</code>: Gestito dall&apos;infrastruttura sicura di Supabase per conservare il token JWT di autenticazione crittografato.</p>
                  <p>• <code>theme / ui_prefs</code>: Memorizza temporaneamente le preferenze grafiche dell&apos;interfaccia.</p>
                </div>
                <p className="text-[11px] text-zinc-400">
                  <em>Base giuridica:</em> Esecuzione del servizio richiesto dall&apos;utente (Art. 122 del Codice Privacy). Non richiedono consenso preventivo.
                </p>
              </div>

              {/* Cookie di Terze Parti */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-2">
                <h3 className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="h-4 w-4 text-amber-400" />
                  Servizi di Terze Parti Integrati
                </h3>
                <p className="text-zinc-400">
                  Navigando su FilmBloopers Hub, alcuni servizi esterni possono rilasciare cookie tecnici funzionali per finalità specifiche:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-zinc-400 pt-1">
                  <li>
                    <strong>Stripe Payments:</strong> Durante il processo di checkout di abbonamenti Premium, Stripe impiega cookie anti-frode e identificativi di sessione (es. <code>__stripe_mid</code>, <code>__stripe_sid</code>) necessari a garantire la sicurezza delle transazioni finanziarie nel rispetto degli standard bancari PCI-DSS.
                  </li>
                  <li>
                    <strong>Affiliazione Amazon:</strong> Cliccando sui pulsanti &quot;Acquista su Amazon&quot; o &quot;Cerca Blu-ray&quot; all&apos;interno delle schede film, l&apos;utente viene reindirizzato ad Amazon.it tramite link di affiliazione con tag di tracciamento dedicato. La gestione di tali cookie ricade sotto la policy di Amazon Europe S.à r.l.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* 3. Assenza di Profilazione Pubblicitaria Diretta */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 text-xs text-amber-400 font-mono">3</span>
              Nessuna Profilazione Pubblicitaria Invasiva
            </h2>
            <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
              <p>
                FilmBloopers Hub <strong>non impiega cookie di profilazione pubblicitaria proprietari</strong> per tracciare il comportamento degli utenti o inviare annunci personalizzati tramite network di retargeting.
              </p>
            </div>
          </div>

          {/* 4. Come Disabilitare i Cookie nel Browser */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 text-xs text-amber-400 font-mono">4</span>
              Come Gestire o Disabilitare i Cookie
            </h2>
            <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
              <p>
                L&apos;utente può bloccare o cancellare in qualsiasi momento i cookie modificando le impostazioni del proprio browser. La disattivazione totale dei cookie tecnici potrebbe tuttavia compromettere la possibilità di accedere al proprio account o completare acquisti.
              </p>
              <p className="text-zinc-400">Di seguito i link alle istruzioni dei principali browser:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                <a
                  href="https://support.google.com/chrome/answer/95647"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg border border-zinc-800 bg-zinc-950 text-center hover:border-amber-500/50 hover:text-amber-400 transition"
                >
                  Google Chrome ↗
                </a>
                <a
                  href="https://support.mozilla.org/it/kb/protezione-antitracciamento-avanzata-firefox-desktop"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg border border-zinc-800 bg-zinc-950 text-center hover:border-amber-500/50 hover:text-amber-400 transition"
                >
                  Mozilla Firefox ↗
                </a>
                <a
                  href="https://support.apple.com/it-it/guide/safari/sfri11471/mac"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg border border-zinc-800 bg-zinc-950 text-center hover:border-amber-500/50 hover:text-amber-400 transition"
                >
                  Apple Safari ↗
                </a>
                <a
                  href="https://support.microsoft.com/it-it/windows/gestire-i-cookie-in-microsoft-edge-168dab11-0753-043d-7c16-ede5947fc64d"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg border border-zinc-800 bg-zinc-950 text-center hover:border-amber-500/50 hover:text-amber-400 transition"
                >
                  Microsoft Edge ↗
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-900 pt-6 text-xs text-zinc-400">
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-amber-400 transition">Informativa Privacy</Link>
            <span>•</span>
            <Link href="/termini" className="hover:text-amber-400 transition">Termini e Condizioni</Link>
            <span>•</span>
            <Link href="/note-legali" className="hover:text-amber-400 transition">Note Legali</Link>
          </div>
          <span className="text-[11px] text-zinc-500">FilmBloopers Hub © {new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
}
