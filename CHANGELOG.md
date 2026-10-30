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
  - Integrazione nativa IndexNow (Microsoft Bing, Yandex, Seznam, Naver) con chiave di verifica pubblica `b3106037cdfc4d729c7eac554ef4fb55.txt`.
  - Servizio centralizzato `src/lib/indexnow.ts` e API protetta `src/app/api/admin/indexnow` per sottomissione massiva o mirata delle URL.
  - Nuova card `AdminIndexNowCard` in Console Amministrazione per l'invio rapido del catalogo completo e notifiche automatiche in background sui nuovi film importati.
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

