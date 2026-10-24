import { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Mail, Lock, Database, Globe, UserCheck, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Informativa sulla Privacy (GDPR) | FilmBloopers Hub",
  description:
    "Informativa completa sul trattamento dei dati personali ai sensi del Regolamento UE 2016/679 (GDPR) di FilmBloopers Hub.",
};

export default function PrivacyPage() {
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
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Informativa sulla Privacy (GDPR)
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Conforme al Regolamento Generale sulla Protezione dei Dati (UE 2016/679) • Ultimo aggiornamento: {lastUpdated}
              </p>
            </div>
          </div>
        </div>

        {/* Intro Banner */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-3 leading-relaxed text-sm">
          <p className="text-zinc-200">
            La presente informativa descrive le modalità di gestione della piattaforma <strong>FilmBloopers Hub</strong> (&quot;Piattaforma&quot; o &quot;Sito&quot;) in riferimento al trattamento dei dati personali degli utenti che la consultano o che usufruiscono dei servizi registrati, delle funzionalità della community e degli abbonamenti Premium.
          </p>
          <p className="text-xs text-zinc-400">
            Il rispetto della tua privacy e la sicurezza delle tue informazioni personali costituiscono una priorità assoluta. Adottiamo standard di sicurezza di livello enterprise (cifratura end-to-end, hashing bcrypt e conformità PCI-DSS per le transazioni economiche).
          </p>
        </div>

        {/* Articoli Privacy */}
        <div className="space-y-6">
          {/* 1. Titolare del Trattamento */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 text-xs text-amber-400 font-mono">1</span>
              Titolare del Trattamento
            </h2>
            <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
              <p>Il Titolare del Trattamento dei dati personali raccolti tramite il sito è:</p>
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-4 font-mono text-[11px] text-zinc-300 space-y-1">
                <p><strong>Denominazione:</strong> FilmBloopers Hub</p>
                <p><strong>Partita IVA / C.F.:</strong> 12345678901</p>
                <p><strong>Sede Legale:</strong> Via Roma 1, 10121 Torino (TO) - Italia</p>
                <p><strong>Email di contatto per la privacy:</strong> <a href="mailto:supporto@filmbloopers.it" className="text-amber-400 hover:underline">supporto@filmbloopers.it</a></p>
              </div>
            </div>
          </div>

          {/* 2. Tipologia di Dati Raccolti */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 text-xs text-amber-400 font-mono">2</span>
              Tipologia di Dati Raccolti
            </h2>
            <div className="space-y-4 text-xs text-zinc-300 leading-relaxed">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Lock className="h-4 w-4 text-amber-400" />
                    <span>Dati dell&apos;Account</span>
                  </div>
                  <p className="text-zinc-400">
                    Indirizzo email e password cifrata. La gestione dell&apos;autenticazione è affidata alla sicurezza certificata di <strong>Supabase Auth</strong>.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Database className="h-4 w-4 text-amber-400" />
                    <span>Attività & Gamification</span>
                  </div>
                  <p className="text-zinc-400">
                    Punti reputazione accumulati, voti espressi sui bloopers (conferme/contestazioni), motivazioni scritte e suggerimenti inviati.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Globe className="h-4 w-4 text-amber-400" />
                    <span>Log Tecnici & Ricerche</span>
                  </div>
                  <p className="text-zinc-400">
                    Query di ricerca nell&apos;archivio film, indirizzo IP anonimizzato, tipo di browser e timestamp per finalità di sicurezza anti-abuso.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <UserCheck className="h-4 w-4 text-amber-400" />
                    <span>Dati di Pagamento (Stripe)</span>
                  </div>
                  <p className="text-zinc-400">
                    I dati delle carte di credito sono gestiti esclusivamente da <strong>Stripe Inc.</strong> (PCI-DSS Livello 1). FilmBloopers Hub non visualizza né memorizza numeri di carte.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Finalità e Base Giuridica */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 text-xs text-amber-400 font-mono">3</span>
              Finalità e Base Giuridica del Trattamento
            </h2>
            <div className="text-xs text-zinc-300 space-y-2.5 leading-relaxed">
              <p>Il trattamento dei tuoi dati personali è effettuato esclusivamente per le seguenti finalità:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
                <li><strong>Esecuzione del Contratto (Art. 6.1.b GDPR):</strong> Creazione e mantenimento dell&apos;account, accesso alle funzionalità di ricerca e fruizione degli abbonamenti Premium.</li>
                <li><strong>Gestione della Community e Classifiche:</strong> Assegnazione dei punti reputazione legati alle segnalazioni e calcolo della classifica cacciatori.</li>
                <li><strong>Legittimo Interesse e Sicurezza (Art. 6.1.f GDPR):</strong> Protezione della piattaforma contro attacchi informatici, frodi, abusi dei sistemi AI o tentativi di brute-force.</li>
                <li><strong>Obblighi Legali e Fiscali (Art. 6.1.c GDPR):</strong> Adempimento degli obblighi di contabilità e fatturazione connessi all&apos;acquisto di abbonamenti a pagamento.</li>
              </ul>
            </div>
          </div>

          {/* 4. Fornitori Terzi e Sub-Responsabili */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 text-xs text-amber-400 font-mono">4</span>
              Destinatari dei Dati e Servizi Terzi
            </h2>
            <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
              <p>I tuoi dati non saranno mai venduti o ceduti a fini di marketing diretto. Per l&apos;erogazione del servizio ci avvaliamo dei seguenti fornitori con adeguate garanzie di conformità GDPR:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-[11px]">
                  <strong className="text-white block">Supabase Inc.</strong>
                  <span className="text-zinc-400">Database relazionale e gestione delle sessioni con crittografia at-rest e server in Unione Europea.</span>
                </div>
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-[11px]">
                  <strong className="text-white block">Stripe Payments Europe Ltd.</strong>
                  <span className="text-zinc-400">Gestione dei pagamenti online, conformità PCI-DSS e prevenzione frodi (Dublino, Irlanda).</span>
                </div>
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-[11px]">
                  <strong className="text-white block">Vercel Inc.</strong>
                  <span className="text-zinc-400">Hosting dell&apos;infrastruttura web edge e CDN globale con crittografia TLS 1.3.</span>
                </div>
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-[11px]">
                  <strong className="text-white block">The Movie Database (TMDB)</strong>
                  <span className="text-zinc-400">Fornitore di metadati e locandine cinematografiche pubbliche tramite API REST.</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Conservazione dei Dati */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 text-xs text-amber-400 font-mono">5</span>
              Periodo di Conservazione
            </h2>
            <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
              <p>
                I dati relativi all&apos;account sono conservati per l&apos;intera durata di registrazione al servizio. In caso di richiesta di cancellazione dell&apos;account, i dati personali vengono eliminati o resi anonimi entro 30 giorni, fatti salvi gli obblighi di conservazione previsti dalla legge (es. fatture e transazioni fiscali per 10 anni).
              </p>
              <p className="text-zinc-400">
                I log tecnici di sicurezza e di traffico del sito vengono cancellati automaticamente dopo un periodo massimo di 90 giorni.
              </p>
            </div>
          </div>

          {/* 6. Diritti dell'Interessato */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 text-xs text-amber-400 font-mono">6</span>
              I Tuoi Diritti (Artt. 15-22 GDPR)
            </h2>
            <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
              <p>In qualunque momento hai il diritto di:</p>
              <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                <li><strong>Accesso:</strong> Ottenere la conferma se sia in corso un trattamento di tuoi dati e riceverne copia.</li>
                <li><strong>Rettifica:</strong> Richiedere l&apos;aggiornamento o la correzione di dati inesatti o incompleti.</li>
                <li><strong>Cancellazione (&quot;Diritto all&apos;oblio&quot;):</strong> Chiedere l&apos;eliminazione definitiva del tuo profilo e dei dati personali associati.</li>
                <li><strong>Limitazione & Opposizione:</strong> Opporti al trattamento o chiederne la limitazione per motivi legittimi.</li>
                <li><strong>Portabilità dei Dati:</strong> Ricevere i dati personali in un formato strutturato, di uso comune e leggibile da dispositivo automatico.</li>
                <li><strong>Reclamo:</strong> Proporre reclamo all&apos;Autorità Garante per la Protezione dei Dati Personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">www.garanteprivacy.it</a>).</li>
              </ul>
            </div>
          </div>

          {/* 7. Come Esercitare i Diritti */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-3">
            <h2 className="text-base font-bold text-amber-300 flex items-center gap-2">
              <Mail className="h-5 w-5 text-amber-400" />
              Come Esercitare i Tuoi Diritti
            </h2>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Per qualsiasi chiarimento in merito alla privacy o per esercitare uno dei tuoi diritti GDPR, puoi inviare una richiesta scritta al nostro supporto dedicato:
            </p>
            <div className="pt-1">
              <a
                href="mailto:supporto@filmbloopers.it?subject=Richiesta%20Esercizio%20Diritti%20GDPR"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:brightness-110 transition"
              >
                <Mail className="h-4 w-4" />
                Scrivi a supporto@filmbloopers.it
              </a>
            </div>
          </div>
        </div>

        {/* Footer Links Correlati */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-900 pt-6 text-xs text-zinc-400">
          <div className="flex items-center gap-4">
            <Link href="/termini" className="hover:text-amber-400 transition">Termini e Condizioni</Link>
            <span>•</span>
            <Link href="/cookie" className="hover:text-amber-400 transition">Cookie Policy</Link>
            <span>•</span>
            <Link href="/note-legali" className="hover:text-amber-400 transition">Note Legali</Link>
          </div>
          <span className="text-[11px] text-zinc-500">FilmBloopers Hub © {new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
}
