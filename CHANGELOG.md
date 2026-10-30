# Changelog

Tutte le modifiche rilevanti a questo progetto sono documentate in questo file.

Il formato è basato su [Keep a Changelog](https://keepachangelog.com/it/1.0.0/) e aderisce a [Semantic Versioning](https://semver.org/lang/it/).

---

## [2.1.0] - 2026-10-30 - Stable Release

Questa release segna il consolidamento stabile della piattaforma Next.js 16 con architettura server/client moderna, piena conformità GDPR/Analytics, isolamento delle metriche e console amministrativa completa e resiliente.

### ✨ Funzionalità & Miglioramenti
- **Console Amministrazione Avanzata (`/admin`)**:
  - **Traffico & Statistiche**: prospetto accessi univoci, metriche utenti per tier, chiamate/errori IA degli ultimi 30 giorni, top ricerche aggregate, rilevamento locandine duplicate e prospetto voti bloopers.
  - **Log di Sistema Segmentati**: filtri dedicati per *Tutti gli Accessi*, *👤 Utenti Registrati* (con risoluzione dello username reale dal profilo) e *👻 Visite Ospiti (Anonimo)* con conteggi in tempo reale.
  - **Filtro Dati di Test & Privacy**: esclusione automatica dell'amministratore e degli account di test nelle statistiche di produzione, preservando i dati di test nell'ambiente di staging.
  - **Gestione & Manutenzione Film**: ricerca automatica locandine TMDB mancanti e batch generation di bloopers IA.
  - **Moderazione & Suggerimenti**: approvazione o scarto segnalazioni utenti e gestione dei feedback.
  - **Configurazione Dinamica**: gestione annunci, testi e promo banner in tempo reale senza redeploy.

- **Deduplicazione Visite a Più Livelli**:
  - Blocco lato client contro i doppi montaggi React 19 (`AccessTracker` con cooldown sincronizzato in `sessionStorage` e `localStorage`).
  - Debounce in-memory e server-side su endpoint `/api/track-visit`.
  - Deduplicazione automatica in lettura su `/api/admin/logs` e `/api/admin/stats` con unificazione dei twin records entro 4 secondi.
  - Auto-pulizia su PostgreSQL dei record duplicati storici autorizzata tramite sessione admin.

- **Conformità GDPR & Web Analytics**:
  - Integrazione nativa Google Analytics 4 (`G-J9PFHEC6T4`) con Google Consent Mode v2.
  - Cookie Banner GDPR personalizzato con gestione granulare delle preferenze (Necessari, Analitici, Marketing).
  - Pulsante flottante permanente per la revisione del consenso.

- **SEO & Search Console**:
- **Disponibilità Streaming & Monetizzazione Amazon-First ("Dove Vederlo")**:
  - Integrazione ufficiale dati JustWatch via TMDB Watch Providers API per l'Italia (`append_to_response=watch/providers`).
  - Strategia di monetizzazione commerciale "Amazon-First":
    - Se presente su Prime Video (flatrate o noleggio/acquisto): Hero CTA prominente brandizzata con link tracciato (`filmbloopers-21`), evidenziando se il film è incluso con l'abbonamento Prime o a noleggio/acquisto digitale.
    - Se assente da Prime Video: Hero CTA dedicata per trovare l'Edizione Fisica da collezione (DVD, Blu-ray & Steelbook 4K) su Amazon.
  - Sezione informativa con badge ufficiali ad alta risoluzione per le piattaforme attive in abbonamento in Italia (Paramount+, Netflix, Disney+, Now, Apple TV, ecc.).
  - Pulsanti di riproduzione diretta in stile IMDb: apertura immediata su `primevideo.com` (o app Prime Video) per avviare il film, e deep-link per avviare lo streaming su Paramount+, Netflix, Disney+, Apple TV e Now.
  - Interfaccia grafica curata sia per Desktop (card dedicata nella barra laterale sotto la locandina) che per Mobile (card responsive compatta ed elegante sopra i bloopers).

- **Valutazione Cinematografica & Badge Ufficiale IMDb (`src/lib/tmdb.ts`, `src/app/film/[slug]/page.tsx`)**:
  - Integrazione della valutazione cinematografica su base 10 e dell'identificativo ufficiale IMDb (`imdb_id`) tramite TMDB con cache in-memory a latenza zero.
  - Badge visivo con stellina dorata, punteggio su base 10 e logo giallo ufficiale `IMDb` con link diretto alla scheda del film su desktop e mobile.
  - Pulsante dedicato ad alta visibilità nella barra laterale desktop e barra azioni mobile per consultare la scheda IMDb con un clic.
  - Dati strutturati Schema.org JSON-LD aggiornati con blocco `aggregateRating` per abilitare le stelline di recensione ⭐ nei risultati di ricerca Google.

- **Sincronizzazione Live Conteggi Bloopers & Curiosità Home/Esplora**:
  - Passaggio della Homepage (`src/app/page.tsx`) a rendering dinamico real-time (`force-dynamic`) con caricamento parallelo in `Promise.all`.
  - Risolto il disallineamento generato dalla precedente cache statica/ISR durante l'importazione di nuovi film.
  - Nuovo helper universale `extractCount` in Home, Catalogo Esplora e Raccomandazioni per mappare con precisione sia array che oggetti PostgREST.

- **Motore di Raccomandazione SEO "Potrebbero piacerti anche" (`src/lib/recommendations.ts`)**:
  - Algoritmo oggettivo di correlazione cinematografica multi-fattoriale: saghe e franchise (+80 pt), stesso regista (+50 pt), attori condivisi (+15 pt/attore), generi in comune (+10 pt/genere) e decade affine (+5 pt).
  - Cache in-memory del catalogo con risposta istantanea (<1ms) e zero carico sul DB.
  - Sezione dedicata con 5 film correlati, badge esplicativi di affinità ("Stessa saga", "Regia: ...", "Genere affine") e internal linking ottimizzato per la scansione dei crawler.

- **Favicon & Google Search Branding**:
  - Adozione del pacchetto favicon ad alta risoluzione conforme alle linee guida di Google Search (multipli di 48px: 192x192, 512x512, ico e apple-touch-icon).
  - Configurazione completa in public/ e routing nativo App Router (src/app/icon.png, src/app/apple-icon.png, src/app/favicon.ico).
  - Aggiornamento di manifest.webmanifest e site.webmanifest con branding coordinato.

  - Integrazione nativa IndexNow (Microsoft Bing, Yandex, Seznam, Naver) con chiave di verifica pubblica `b3106037cdfc4d729c7eac554ef4fb55.txt`.
  - Servizio centralizzato `src/lib/indexnow.ts` con tracciamento differenziale delle pagine già inviate e invio mirato solo delle URL mancanti.
  - Nuova API `src/app/api/admin/indexnow` e card interattiva `AdminIndexNowCard` con contatori in tempo reale (Pagine Totali, Già Inviate, Mancanti) e sottomissione incrementale con un clic.
  - Notifiche automatiche in background sui nuovi film importati.
  - Dati strutturati Schema.org JSON-LD (WebSite con `alternateName` e Organization) per il posizionamento corretto del Site Name ("FilmBloopers Hub") su Google.
  - Generazione dinamica di `robots.txt` e `sitemap.xml` con revalidate orario.
  - Metadata OpenGraph e Twitter Card dinamici per ogni scheda film.

- **Resilienza Architetturale**:
  - Layout server-side dinamico per `/admin` (`force-dynamic`, `revalidate: 0`) per prevenire problemi di cache obsoleta sulle CDN Edge.
  - `AdminErrorBoundary` modulare con reset automatico al cambio di scheda.
  - Sanitizzazione difensiva di tutti i payload di errore e gestione sicura delle stringhe complesse e JSON nei log IA.

---

## [2.0.0] - 2026-10-24 - Initial Next.js Modern Architecture

- Riscrittura completa da Streamlit a Next.js 16 (App Router), React 19, TypeScript e Tailwind CSS.
- Integrazione Supabase SSR per autenticazione, profili e database relazionale.
- Integrazione The Movie Database (TMDB) API per import e metadati film.
- Integrazione Google Gemini API per estrazione e generazione intelligente bloopers/curiosità.
- Integrazione Stripe per abbonamenti Premium (Checkout, Webhook, Portale Clienti).

