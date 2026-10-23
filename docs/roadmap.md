# 🗺️ Roadmap — FilmBloopers Hub

> **Data:** 2026-10-24  
> **Versione:** 1.0  
> **Priorità basata su:** Audit Architetturale, Database, Sicurezza, UX/UI, SEO  

---

## Legenda Priorità

| Emoji | Significato |
|-------|------------|
| 🔴 | Bloccante / Critica |
| 🟠 | Alta priorità |
| 🟡 | Media priorità |
| 🟢 | Nice-to-have |

---

## Fase 0 — Hotfix Critici ⏰ Entro 48h

| # | Task | Tipo | Audit Ref. |
|---|------|------|-----------|
| 0.1 | 🔴 Rimuovere il secondo `st.set_page_config()` in app.py | Bug | ARCH P1 |
| 0.2 | 🔴 Verificare RLS attivo su TUTTE le tabelle Supabase | Sicurezza | SEC P0-1 |
| 0.3 | 🔴 Rimuovere pulsante "Elimina tutti bloopers" dalla vista utente (solo admin) | Sicurezza | SEC P1-2 |
| 0.4 | 🔴 Sanitizzare input utente nei prompt IA (prompt injection) | Sicurezza | SEC P0-3 |
| 0.5 | 🔴 Fixare mismatch routing: `cb_logout()` imposta `"🏠 Home"` ma router confronta `"Home"` | Bug | ARCH P6 |

---

## Fase 1 — Stabilizzazione ⏰ Settimana 1-2

| # | Task | Tipo | Audit Ref. |
|---|------|------|-----------|
| 1.1 | 🟠 Pinning versioni in `requirements.txt` | Infra | ARCH P2 |
| 1.2 | 🟠 Rimuovere `google-generativeai` duplicato | Cleanup | ARCH |
| 1.3 | 🟠 Aggiungere `@st.cache_data` su query read-only (films, configurazioni) | Performance | ARCH P3 |
| 1.4 | 🟠 Centralizzare `normalizza()` in `utils/text.py` | Refactor | ARCH P5 |
| 1.5 | 🟠 Sostituire bare `except: pass` con logging `st.logger` | Qualità | ARCH P7 |
| 1.6 | 🟠 Arricchire `.gitignore` (`__pycache__`, `.env`, `*.pyc`, `venv/`) | Infra | SEC P2-3 |
| 1.7 | 🟠 Aggiungere ON DELETE CASCADE su FK database | DB | DB C1 |
| 1.8 | 🟠 Aggiungere indici su `errori(film_id, approvato)`, `profiles(email)` | DB | DB C5 |
| 1.9 | 🟠 Unificare il flusso di reset password (eliminare duplicato) | UX | UX C1 |
| 1.10 | 🟠 Creare `robots.txt` | SEO | SEO 4 |

---

## Fase 2 — Qualità & UX ⏰ Settimana 3-4

| # | Task | Tipo | Audit Ref. |
|---|------|------|-----------|
| 2.1 | 🟡 Aggiungere paginazione alla lista film (`.range(start, end)`) | Performance | DB C7 |
| 2.2 | 🟡 Estrarre logica premi dalla view classifica in service dedicato | Refactor | ARCH P2, DB C8 |
| 2.3 | 🟡 Implementare enum/costanti per routing sezioni | Refactor | ARCH P6 |
| 2.4 | 🟡 Implementare email verification alla registrazione | Sicurezza | SEC P1-1 |
| 2.5 | 🟡 Aggiungere soft delete con retention per bloopers | DB | SEC P1-2 |
| 2.6 | 🟡 Convertire `anno` da TEXT a INTEGER nel database | DB | DB C2 |
| 2.7 | 🟡 Aggiungere CHECK constraints su `categoria`, `tier`, `tipo_abbonamento` | DB | DB C6 |
| 2.8 | 🟡 Aggiungere progress bar/stepper durante operazioni IA lunghe | UX | UX C2 |
| 2.9 | 🟡 Semplificare sidebar con navigazione collassabile | UX | UX C3 |
| 2.10 | 🟡 Spezzare `admin_components.py` (579 righe) in sotto-moduli | Refactor | UX M8 |

---

## Fase 3 — Monetizzazione & Crescita ⏰ Mese 2

| # | Task | Tipo | Audit Ref. |
|---|------|------|-----------|
| 3.1 | 🟡 Implementare webhook Stripe per attivazione automatica premium | Feature | — |
| 3.2 | 🟡 Aggiungere cancellation flow per abbonamenti mensili | Feature | — |
| 3.3 | 🟡 Creare landing page statica SEO-optimized (Next.js/Astro) | SEO | SEO 1 |
| 3.4 | 🟡 Generare pagine statiche per i film più popolari con JSON-LD | SEO | SEO 2 |
| 3.5 | 🟡 Registrare sitemap su Google Search Console | SEO | SEO 7 |
| 3.6 | 🟡 Implementare policy di retention log (90 giorni) | DB | DB §4 |
| 3.7 | 🟡 Integrare il sistema traduzioni (`translations.py`) nella UI | Feature | ARCH P4 |
| 3.8 | 🟡 Rate limiting server-side (Supabase Edge Functions) | Sicurezza | SEC P1-3 |

---

## Fase 4 — Scalabilità & Evoluzione ⏰ Mese 3-4

| # | Task | Tipo |
|---|------|------|
| 4.1 | 🟢 Implementare caching Redis/CDN per poster TMDB | Performance |
| 4.2 | 🟢 Aggiungere sistema di notifiche (email per nuove approvazioni) | Feature |
| 4.3 | 🟢 Dashboard analytics pubblica (statistiche sito) | Feature |
| 4.4 | 🟢 API pubblica REST per accesso ai dati bloopers | Feature |
| 4.5 | 🟢 App mobile (PWA o React Native) | Feature |
| 4.6 | 🟢 Integrazione social sharing (Open Graph, Twitter Cards) | SEO |
| 4.7 | 🟢 Blog SEO con articoli generati semi-automaticamente | SEO |
| 4.8 | 🟢 Acquistare dominio `.it` (`filmbloopers.it`) | SEO |
| 4.9 | 🟢 Implementare CSP headers e audit trail admin | Sicurezza |
| 4.10 | 🟢 Migrazione a framework SSR se necessario | Architettura |

---

## KPI di Monitoraggio

| Metrica | Target Fase 1 | Target Fase 3 |
|---------|--------------|--------------|
| Uptime | > 99% | > 99.5% |
| Tempo risposta p95 | < 3s | < 2s |
| Errori IA / giorno | < 10 | < 5 |
| Utenti registrati | Baseline | +100% |
| Film in catalogo | Baseline | +50% |
| Pagine indicizzate Google | 0 | > 100 |
| Conversion rate Premium | Baseline | > 3% |
