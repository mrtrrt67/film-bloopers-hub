import { Metadata } from "next";
import Link from "next/link";
import { FileText, ArrowLeft, Scale, Award, ShieldAlert, CreditCard, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Termini e Condizioni di Servizio | FilmBloopers Hub",
  description:
    "Termini e condizioni d'uso della piattaforma FilmBloopers Hub, regole sugli abbonamenti digitali, esclusione recesso e contenuti della community.",
};

export default function TerminiPage() {
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
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Termini e Condizioni di Servizio
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Contratto di utilizzo della piattaforma e condizioni di vendita • Ultimo aggiornamento: {lastUpdated}
              </p>
            </div>
          </div>
        </div>

        {/* Intro */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-3 leading-relaxed text-sm">
          <p className="text-zinc-200">
            Benvenuto su <strong>FilmBloopers Hub</strong>. I presenti Termini e Condizioni disciplinano l&apos;accesso e l&apos;utilizzo della piattaforma, inclusi i contenuti informativi, il database degli errori cinematografici, le funzionalità collaborative della community e i servizi di abbonamento Premium.
          </p>
          <p className="text-xs text-zinc-400">
            Accedendo al sito o registrando un account, l&apos;utente dichiara di aver letto, compreso e accettato integralmente i presenti Termini e l&apos;<Link href="/privacy" className="text-amber-400 hover:underline">Informativa sulla Privacy</Link>.
          </p>
        </div>

        {/* Sezioni */}
        <div className="space-y-6">
          {/* 1. Requisiti di Accesso ed Età */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 text-xs text-amber-400 font-mono">1</span>
              Requisiti di Accesso ed Età Minima
            </h2>
            <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
              <p>
                L&apos;accesso e l&apos;utilizzo dei servizi di registrazione sono riservati a utenti che abbiano compiuto almeno <strong>14 anni</strong> (o l&apos;età minima prevista dalla legislazione del proprio paese per prestare consenso al trattamento dei dati digitali).
              </p>
              <p className="text-zinc-400">
                L&apos;utente si impegna a fornire dati veritieri e a custodire con diligenza le proprie credenziali di autenticazione. Ogni attività svolta tramite l&apos;account è imputabile all&apos;utente titolare.
              </p>
            </div>
          </div>

          {/* 2. Descrizione del Servizio */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 text-xs text-amber-400 font-mono">2</span>
              Natura della Piattaforma e del Servizio
            </h2>
            <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
              <p>
                FilmBloopers Hub è una piattaforma culturale, critica e divulgativa dedicata alla catalogazione e analisi di bloopers, sviste di montaggio, anacronismi, errori storici e ciak falsi nella storia del cinema mondiale.
              </p>
              <p className="text-zinc-400">
                La piattaforma impiega algoritmi intelligenti e modelli di intelligenza artificiale per l&apos;analisi contestuale e per la sintesi dei dati cinematografici. Le segnalazioni hanno scopo divulgativo e di intrattenimento per gli appassionati della settima arte.
              </p>
            </div>
          </div>

          {/* 3. Abbonamenti Digitali ed Esclusione del Recesso */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
              <CreditCard className="h-5 w-5" />
              <span>3. Piani Premium, Pagamenti ed Esclusione del Diritto di Recesso</span>
            </div>
            <div className="text-xs text-zinc-300 space-y-3 leading-relaxed">
              <p>
                La piattaforma offre sia funzionalità gratuite (Free) sia piani a pagamento (<strong>Premium Mensile</strong> ed eventualmente promozionali <strong>Premium Lifetime</strong>) per accedere a ricerche illimitate, funzionalità di moderazione avanzata e vantaggi speciali.
              </p>

              <div className="rounded-xl border border-amber-500/40 bg-zinc-950 p-4 space-y-2">
                <p className="font-bold text-amber-300 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  Informativa ai sensi dell&apos;art. 59, lett. o) del Codice del Consumo (D.Lgs. 206/2005):
                </p>
                <p className="text-[11px] text-zinc-300 leading-normal">
                  Gli abbonamenti Premium forniscono <strong>contenuto digitale mediante supporto non materiale</strong> ad esecuzione immediata.
                  Al momento dell&apos;acquisto, l&apos;utente richiede e acconsente espressamente all&apos;inizio immediato dell&apos;erogazione del servizio digitale e <strong>riconosce che perde il diritto di recesso di 14 giorni</strong> una volta attivato l&apos;accesso alle funzionalità Premium.
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <p><strong>Rinnovo e Disdetta dell&apos;Abbonamento Mensile:</strong></p>
                <p className="text-zinc-400">
                  L&apos;abbonamento mensile si rinnova automaticamente ogni 30 giorni. L&apos;utente può disdire il rinnovo in qualsiasi momento con effetto al termine del periodo pagato, accedendo al portale clienti Stripe o inviando una comunicazione a <a href="mailto:supporto@filmbloopers.it" className="text-amber-400 hover:underline">supporto@filmbloopers.it</a>.
                </p>
              </div>
            </div>
          </div>

          {/* 4. Contenuti Generati dagli Utenti (UGC) */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 text-xs text-amber-400 font-mono">4</span>
              Contenuti Generati dagli Utenti (UGC) e Regole della Community
            </h2>
            <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
              <p>
                Gli utenti possono contribuire segnalando nuovi errori, votando con conferme o contestazioni motivate, o inviando suggerimenti per il miglioramento dell&apos;archivio.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                <li>L&apos;utente garantisce che i contenuti inviati sono frutto della propria osservazione e non violano diritti d&apos;autore di terzi né contengono espressioni ingiuriose, diffamatorie o discriminatorie.</li>
                <li>Inviando una segnalazione, l&apos;utente concede a FilmBloopers Hub una licenza d&apos;uso non esclusiva, gratuita, perpetua e globale per la pubblicazione, revisione e indicizzazione del contenuto nel catalogo.</li>
                <li>I moderatori si riservano il diritto inappellabile di modificare, rifiutare o rimuovere segnalazioni duplicate, non comprovate o contrarie alle linee guida.</li>
              </ul>
            </div>
          </div>

          {/* 5. Gamification e Sistema Punti */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 text-xs text-amber-400 font-mono">5</span>
              Gamification, Classifica e Assegnazione Punti
            </h2>
            <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
              <p>
                Il sistema premia la partecipazione attiva assegnando punti per segnalazioni approvate e voti costruttivi, consentendo di scalare la classifica cacciatori e sbloccare bonus o mesi Premium gratuiti.
              </p>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-1 text-[11px] text-zinc-400">
                <p><strong>Clausola Anti-Abuso:</strong> È severamente vietato l&apos;uso di script automatizzati, bot, voti concordati o account multipli per alterare il punteggio o generare accessi non dovuti.</p>
                <p>In caso di condotte sleali, l&apos;amministrazione può azzerare il punteggio accumulato o disattivare l&apos;account in via permanente.</p>
              </div>
            </div>
          </div>

          {/* 6. Proprietà Intellettuale e Fair Use */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 text-xs text-amber-400 font-mono">6</span>
              Proprietà Intellettuale, Marchi e Fair Use Cinematografico
            </h2>
            <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
              <p>
                Il software, il codice sorgente, l&apos;architettura di visualizzazione e i testi originali di FilmBloopers Hub sono di esclusiva proprietà della piattaforma.
              </p>
              <p className="text-zinc-400">
                I titoli cinematografici, le locandine, le citazioni e i riferimenti ai personaggi citati appartengono ai rispettivi titolari dei diritti d&apos;autore. L&apos;utilizzo sul sito è svolto unicamente con finalità didattiche, critiche e divulgative nel rispetto dell&apos;art. 70 della Legge sul Diritto d&apos;Autore (L. 633/1941) e delle norme sul fair use.
              </p>
            </div>
          </div>

          {/* 7. Limitazione di Responsabilità */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 text-xs text-amber-400 font-mono">7</span>
              Limitazione di Responsabilità
            </h2>
            <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
              <p>
                La piattaforma viene fornita &quot;così com&apos;è&quot; (as is) e &quot;secondo disponibilità&quot;. Sebbene ci adoperiamo per garantire la continuità del servizio e l&apos;accuratezza dei dati storici dei film, non possiamo garantire che il sito sia esente da temporanee interruzioni, errori di terze parti o disservizi di rete.
              </p>
            </div>
          </div>

          {/* 8. Legge Applicabile e Foro Competente */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 text-xs text-amber-400 font-mono">8</span>
              Legge Applicabile e Risoluzione Controversie
            </h2>
            <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
              <p>
                I presenti Termini sono regolati dalla <strong>legge italiana</strong>. Per qualsiasi controversia con utenti qualificabili come consumatori, la competenza territoriale è del foro di residenza o domicilio del consumatore.
              </p>
              <p className="text-zinc-400">
                I consumatori europei possono inoltre avvalersi della piattaforma ODR (Online Dispute Resolution) messa a disposizione dalla Commissione Europea per la risoluzione extragiudiziale: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">ec.europa.eu/consumers/odr</a>.
              </p>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-900 pt-6 text-xs text-zinc-400">
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-amber-400 transition">Informativa Privacy</Link>
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
