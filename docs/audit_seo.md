# 🔍 Audit SEO — FilmBloopers Hub

> **Data:** 2026-10-24  
> **Autore:** SEO Specialist  
> **Versione:** 1.0  

---

## 1. Panoramica SEO

### Dominio e Hosting

| Parametro | Valore | Valutazione |
|-----------|--------|-------------|
| **Dominio principale** | `filmbloopers.online` | ✅ Keyword nel dominio |
| **TLD** | `.online` | ⚠️ Meno autorevole di `.com/.it` |
| **App URL** | `cinemabloopers.streamlit.app` | 🔴 Subdomain Streamlit = zero authority SEO |
| **Reset page** | `mrtrrt67.github.io/film-bloopers-hub/reset.html` | ⚠️ Terzo dominio |
| **Framework** | Streamlit (SPA WebSocket) | 🔴 Non indicizzabile |

### Il Problema Fondamentale

> 🔴 **Streamlit NON è indicizzabile dai motori di ricerca.**  
> L'applicazione è una Single Page Application (SPA) basata su WebSocket che carica tutto il contenuto via JavaScript/AJAX. Google non può:
> - Crawlare le pagine interne (film, bloopers, classifica)
> - Indicizzare il contenuto generato dinamicamente
> - Seguire la navigazione interna basata su `session_state`
> - Leggere i meta tag iniettati via `<script>` (riga 6-9 `styles.py`)

---

## 2. Analisi dei Meta Tag

### 2.1 Title Tag

```python
# In app.py (riga 5-9) — PRIMO set_page_config
page_title = "FilmBloopers Hub - Errori e Curiosità dai Film"

# In app.py (riga 37-42) — SECONDO set_page_config (BUG!)
page_title = "Archivio Errori e Incongruenze Cinematografiche"

# In utils/styles.py (riga 8) — Override JavaScript
window.parent.document.title = "Archivio Errori e Incongruenze Cinematografiche | Bloopers";
```

**Problemi:**
- 3 titoli diversi per la stessa pagina
- Il primo `set_page_config` viene sovrascritto
- Il title JavaScript non è letto dai crawler

### 2.2 Meta Description
❌ **Assente.** Nessun meta description è definito in alcun punto dell'applicazione.

### 2.3 Open Graph / Social
❌ **Assente.** Nessun tag OG (og:title, og:description, og:image) per condivisioni social.

### 2.4 Favicon
✅ `page_icon="images/Logo.png"` — Funziona come favicon di Streamlit.

---

## 3. Analisi Sitemap

**File:** [`sitemap.xml`](../sitemap.xml)

```xml
<urlset>
  <url><loc>https://filmbloopers.online/</loc></url>
  <url><loc>https://filmbloopers.online/?sezione=Esplora</loc></url>
  <url><loc>https://filmbloopers.online/?sezione=Classifica</loc></url>
  <url><loc>https://filmbloopers.online/?sezione=Premium</loc></url>
</urlset>
```

**Problemi:**
| Criterio | Stato | Dettaglio |
|----------|-------|-----------|
| URL reali | 🔴 | I parametri `?sezione=` non funzionano — la navigazione è basata su `session_state` |
| `<lastmod>` | 🔴 | Assente su tutti gli URL |
| Film individuali | 🔴 | Nessun URL per i singoli film |
| robots.txt | 🔴 | Non presente |
| Sottomissione GSC | ❓ | Non verificabile |

---

## 4. Struttura URL

### Stato Attuale
```
https://filmbloopers.online/               → Tutto qui (SPA)
https://filmbloopers.online/?code=xxx       → Reset password
```

### Struttura Ideale (Non implementabile con Streamlit)
```
https://filmbloopers.online/                      → Home
https://filmbloopers.online/esplora               → Catalogo
https://filmbloopers.online/film/king-kong-2005    → Scheda film
https://filmbloopers.online/classifica             → Leaderboard
https://filmbloopers.online/premium                → Pricing
```

---

## 5. Contenuti e Keywords

### 5.1 Keywords Target (Stimate)

| Keyword | Volume (IT) | Posizionamento Attuale |
|---------|-------------|----------------------|
| "errori nei film" | ~2.400/mese | ❌ Non indicizzato |
| "bloopers film" | ~1.900/mese | ❌ Non indicizzato |
| "errori cinematografici" | ~720/mese | ❌ Non indicizzato |
| "incongruenze film" | ~480/mese | ❌ Non indicizzato |
| "errori di continuità film" | ~320/mese | ❌ Non indicizzato |
| "movie mistakes italiano" | ~260/mese | ❌ Non indicizzato |

### 5.2 Contenuto Generato

L'app genera e conserva contenuto ad alto valore SEO:
- **Schede film** con trama, cast, anno, genere
- **Bloopers dettagliati** con timestamp e descrizioni
- **Voti e attendibilità** della community
- **Statistiche** e classifiche

> ⚠️ Questo contenuto è **completamente invisibile** ai motori di ricerca perché risiede nel database Supabase e viene caricato via JavaScript.

---

## 6. Performance e Core Web Vitals

| Metrica | Impatto SEO | Stima |
|---------|------------|-------|
| **LCP** (Largest Contentful Paint) | Alto | ⚠️ ~3-5s (Streamlit cold start) |
| **FID** (First Input Delay) | Medio | ⚠️ WebSocket connection time |
| **CLS** (Cumulative Layout Shift) | Medio | 🔴 Streamlit re-render causa shift |
| **TTFB** (Time to First Byte) | Alto | 🔴 Cold start Streamlit fino a 10s |

---

## 7. Scoring SEO Complessivo

| Area | Score | Peso | Punteggio Pesato |
|------|-------|------|-----------------|
| Indicizzabilità | 1/10 | 30% | 0.3 |
| Meta Tags | 2/10 | 15% | 0.3 |
| Struttura URL | 1/10 | 15% | 0.15 |
| Contenuti | 7/10 | 20% | 1.4 |
| Performance | 3/10 | 10% | 0.3 |
| Mobile | 5/10 | 10% | 0.5 |
| **TOTALE** | | | **2.95 / 10** |

---

## 8. Raccomandazioni

### 🔴 Strategiche (Architetturali)

1. **Creare una landing page statica SSR** (Next.js / Astro) su `filmbloopers.online/` con:
   - Meta tag completi (title, description, OG, schema.org)
   - Pre-rendering delle schede film più popolari
   - Link all'app Streamlit per le funzionalità interattive

2. **Generare pagine statiche per i film** dal database:
   - `/film/titanic-1997` con structured data JSON-LD
   - Ogni pagina con H1 unico, meta description, og:image (poster TMDB)

3. **Implementare un blog** con articoli SEO-oriented:
   - "I 10 errori più clamorosi in Titanic"
   - "Tutti i bloopers della saga Star Wars"

### 🟡 Tattiche (Immediate)

4. **Creare `robots.txt`**:
```
User-agent: *
Allow: /
Sitemap: https://filmbloopers.online/sitemap.xml
```

5. **Aggiornare `sitemap.xml`** con `<lastmod>` e URL reali

6. **Aggiungere Structured Data** (JSON-LD) con schema `Movie` e `Review`

7. **Registrare la sitemap** su Google Search Console

8. **Implementare canonical URL** per evitare contenuto duplicato

9. **Acquistare un dominio `.it`** (`filmbloopers.it`) per il mercato italiano target
