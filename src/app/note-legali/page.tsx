import { Metadata } from "next";
import Link from "next/link";
import { Scale, ArrowLeft, ShoppingCart, Film, AlertTriangle, ShieldCheck, Mail, Building } from "lucide-react";

export const metadata: Metadata = {
  title: "Note Legali, Trasparenza & Disclaimer | FilmBloopers Hub",
  description:
    "Dati societari, informativa sull'Affiliazione Amazon, attribuzione TMDB e disclaimer sul copyright cinematografico di FilmBloopers Hub.",
};

export default function NoteLegaliPage() {
  const lastUpdated = "24 Ottobre 2026";
  const amazonTag = process.env.NEXT_PUBLIC_AMAZON_TAG || "filmbloopers-21";

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
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Note Legali & Riferimenti Societari
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Informazioni ai sensi dell&apos;art. 35 D.P.R. 633/72 e direttive AGCOM • Ultimo aggiornamento: {lastUpdated}
              </p>
            </div>
          </div>
        </div>

        {/* Intro */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-3 leading-relaxed text-sm">
          <p className="text-zinc-200">
            In questa sezione sono raccolte le informazioni societarie obbligatorie, la dichiarazione di trasparenza per i programmi di affiliazione commerciale (Amazon), l&apos;attribuzione delle licenze dei fornitori di metadati e i disclaimer relativi alla proprietà intellettuale.
          </p>
        </div>

        {/* Sezioni */}
        <div className="space-y-6">
          {/* 1. Dati Societari ed Editoriali */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building className="h-5 w-5 text-amber-400" />
              1. Dati Societari e Contatti
            </h2>
            <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
              <p>Ai sensi della normativa vigente, si rendono noti i riferimenti identificativi della piattaforma:</p>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-[11px] text-zinc-300 space-y-1.5">
                <p><strong>Piattaforma:</strong> FilmBloopers Hub (filmbloopers.online)</p>
                <p><strong>Ragione Sociale / Titolare:</strong> FilmBloopers Hub</p>
                <p><strong>Partita IVA / Codice Fiscale:</strong> 12345678901</p>
                <p><strong>Sede Legale:</strong> Via Roma 1, 10121 Torino (TO) - Italia</p>
                <p><strong>Email di contatto:</strong> <a href="mailto:supporto@filmbloopers.it" className="text-amber-400 hover:underline">supporto@filmbloopers.it</a></p>
                <p><strong>Posta Elettronica Certificata (PEC):</strong> <span className="text-zinc-400">filmbloopers@pec.it</span></p>
                <p><strong>Hosting Provider:</strong> Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723 (USA)</p>
              </div>
            </div>
          </div>

          {/* 2. Dichiarazione di Affiliazione Amazon */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-3">
            <h2 className="text-base font-bold text-amber-300 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-amber-400" />
              2. Trasparenza Affiliazione Commerciale Amazon
            </h2>
            <div className="text-xs text-zinc-300 space-y-2.5 leading-relaxed">
              <p>
                In conformità alle linee guida dell&apos;<strong>AGCOM</strong> in materia di trasparenza pubblicitaria e agli standard operativi del programma <em>Amazon Associates</em>:
              </p>
              <div className="rounded-xl border border-amber-500/30 bg-zinc-950 p-4 text-[11px] text-zinc-200 space-y-2">
                <p className="font-bold text-amber-400">
                  &quot;In qualità di Affiliato Amazon, FilmBloopers Hub riceve un guadagno dagli acquisti idonei.&quot;
                </p>
                <p className="text-zinc-400">
                  All&apos;interno delle schede film sono presenti link di affiliazione (riconoscibili tramite tag partner es. <code>{amazonTag}</code>) che reindirizzano verso lo store di Amazon.it per l&apos;acquisto di edizioni fisiche (DVD, Blu-ray, 4K) o visualizzazione in streaming.
                </p>
                <p className="text-zinc-400">
                  L&apos;utilizzo di tali link <strong>non comporta alcun sovrapprezzo per l&apos;utente</strong> e contribuisce al sostentamento dei costi di server, API e sviluppo tecnologico della piattaforma.
                </p>
              </div>
            </div>
          </div>

          {/* 3. Attribuzione API TMDB */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Film className="h-5 w-5 text-amber-400" />
              3. Attribuzione The Movie Database (TMDB)
            </h2>
            <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
              <div className="flex items-center gap-2 pb-1">
                <span className="rounded bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                  TMDB API Partner
                </span>
              </div>
              <p>
                Questo prodotto e il presente sito web utilizzano le API pubbliche di <strong>The Movie Database (TMDB)</strong> per la fornitura di sinossi, titoli originali, registi, cast e locandine cinematografiche.
              </p>
              <p className="text-zinc-400">
                In ottemperanza ai Termini d&apos;Uso di TMDB, si dichiara formalmente che:
                <em> &quot;Questo prodotto utilizza l&apos;API TMDB ma non è approvato o certificato da TMDB.&quot;</em>
              </p>
            </div>
          </div>

          {/* 4. Disclaimer Copyright e Fair Use Cinematografico */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              4. Proprietà Intellettuale & Fair Use Cinematografico
            </h2>
            <div className="text-xs text-zinc-300 space-y-2.5 leading-relaxed">
              <p>
                Tutti i marchi registrati, i loghi, i titoli delle opere cinematografiche, i nomi dei registi, attori e personaggi, nonché le locandine citate su questo sito appartengono ai rispettivi proprietari e aventi diritto (case di produzione, distributori e registi).
              </p>
              <p className="text-zinc-400">
                La loro citazione e la riproduzione parziale di informazioni hanno finalità esclusivamente <strong>critiche, didattiche, di discussione e divulgazione cinematografica</strong>, rientrando a pieno titolo nelle tutele dell&apos;<strong>art. 70 della Legge 22 aprile 1941 n. 633</strong> (Protezione del diritto d&apos;autore) e dell&apos;art. 10 della Convenzione di Berna.
              </p>
              <p className="text-zinc-400">
                La piattaforma non diffonde copie pirata, non contiene file torrent né fornisce collegamenti a streaming illegali di film.
              </p>
            </div>
          </div>

          {/* 5. Procedura di Segnalazione (Notice & Takedown) */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Mail className="h-5 w-5 text-amber-400" />
              5. Segnalazioni di Violazione Copyright (Notice & Take Down)
            </h2>
            <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
              <p>
                Qualora il titolare di un diritto d&apos;autore ritenga che un contenuto caricato dagli utenti o presente nel database violi la propria proprietà intellettuale o i propri diritti morali, può inviare una segnalazione motivata a:
              </p>
              <div className="pt-1">
                <a
                  href="mailto:supporto@filmbloopers.it?subject=Segnalazione%20Copyright%20Notice%20and%20Takedown"
                  className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  supporto@filmbloopers.it (Oggetto: Notice & Take Down)
                </a>
              </div>
              <p className="text-[11px] text-zinc-400">
                Il nostro team provvederà a verificare la segnalazione e ad adottare i provvedimenti del caso (inclusa la rimozione tempestiva del contenuto) entro 48 ore lavorative.
              </p>
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
            <Link href="/cookie" className="hover:text-amber-400 transition">Cookie Policy</Link>
          </div>
          <span className="text-[11px] text-zinc-500">FilmBloopers Hub © {new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
}
