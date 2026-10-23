# 🔒 Audit Sicurezza — FilmBloopers Hub

> **Data:** 2026-10-24  
> **Autore:** Security Auditor  
> **Versione:** 1.0  
> **Classificazione:** CONFIDENZIALE  

---

## 1. Executive Summary

L'applicazione presenta **3 vulnerabilità critiche** (P0), **5 problemi gravi** (P1) e diversi punti di attenzione. La vulnerabilità più urgente è l'**esposizione di credenziali Supabase in chiaro** nel file `reset.html`, un file HTML statico ospitato su GitHub Pages e accessibile pubblicamente.

---

## 2. Classificazione delle Vulnerabilità

### 🔴 P0 — CRITICHE (Richiesta azione immediata)

#### P0-1: Credenziali Supabase hardcoded in `reset.html`

**File:** [`reset.html`](../reset.html) — righe 38-39  
**Tipo:** CWE-798 (Hard-coded Credentials)

```javascript
const SUPABASE_URL = "https://gmiwhscbqvadnlqruhjs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

La **anon key** di Supabase è esposta in un file HTML statico versionato su GitHub. Questa chiave, combinata con l'URL del progetto, consente a chiunque di:
- Eseguire query su tutte le tabelle con RLS disabilitata
- Creare account utente
- Potenzialmente leggere dati sensibili

**Mitigazione immediata:**
1. Verificare che **Row Level Security (RLS)** sia attivo su TUTTE le tabelle
2. Creare una policy restrittiva per ogni tabella
3. Ruotare la anon key se RLS non era attivo

> ⚠️ **Nota:** La anon key è *progettata* per essere pubblica in Supabase, MA solo se RLS è correttamente configurato. Senza RLS, è equivalente a esporre le credenziali del database.

---

#### P0-2: Stripe Secret Key potenzialmente esposta

**File:** [`app.py`](../app.py) — righe 58-61

```python
STRIPE_SECRET_KEY = get_secret("STRIPE_SECRET_KEY")
stripe.api_key = STRIPE_SECRET_KEY
```

La chiave segreta di Stripe viene caricata e assegnata globalmente. Se i secrets di Streamlit non sono configurati e la chiave è in una variabile d'ambiente visibile (es. nei log di deploy), chiunque può:
- Effettuare rimborsi
- Accedere ai dati dei clienti
- Creare pagamenti arbitrari

**Mitigazione:** Verificare che `STRIPE_SECRET_KEY` non sia mai presente in log, variabili d'ambiente visibili, o repository.

---

#### P0-3: Assenza di validazione input su query IA

**File:** [`ai_service.py`](../services/ai_service.py)

I prompt inviati a Gemini includono dati inseriti dall'utente senza sanitizzazione:

```python
prompt = f"""Sei un database cinematografico ufficiale. 
L'utente ha cercato: "{titolo}" (Anno indicato: {anno}, 
Regista/Attore: {cast})."""
```

Un attaccante potrebbe iniettare istruzioni nel prompt per:
- Estrarre il system prompt
- Far generare contenuti inappropriati
- Manipolare i risultati salvati nel database

**Tipo:** Prompt Injection (OWASP LLM01)

---

### 🟠 P1 — GRAVI

#### P1-1: Nessuna validazione dell'email alla registrazione

**File:** [`sidebar.py`](../components/sidebar.py) — righe 253-272

```python
res = supabase.auth.sign_up({"email": em, "password": pw})
if res.user:
    supabase.table("profiles").insert({...}).execute()
```

Non c'è verifica che l'email:
- Sia un formato valido
- Appartenga realmente all'utente (email verification)
- Non sia un indirizzo temporaneo/usa e getta

**Rischio:** Account spam, manipolazione classifica punti.

#### P1-2: Eliminazione massiva senza conferma efficace

**File:** [`esplora_view.py`](../views/esplora_view.py) — righe 117-119

```python
if st.button("🧹 Elimina tutti", key=f"btn_elimina_tutti_{f_info['id']}"): 
    supabase.table("errori").delete().eq("film_id", f_info['id']).execute()
```

Un singolo clic cancella **tutti i bloopers** di un film. Nessuna conferma, nessun soft delete, nessun backup. Questa funzione è accessibile a qualsiasi utente loggato, non solo agli admin.

#### P1-3: Anti-spam bypassabile

**File:** [`ai_service.py`](../services/ai_service.py) — righe 36-51

Il rate limiting per gli ospiti è basato su `st.session_state`, che è un dato lato client. Basta:
- Aprire una nuova scheda/finestra del browser
- Svuotare i cookie
- Usare la modalità incognito

...per ottenere ulteriori 6 chiamate gratuite.

#### P1-4: Password reset redirect a URL diverso

**File:** [`sidebar.py`](../components/sidebar.py) — riga 233 vs. [`reset.html`](../reset.html) — riga 73

Il link di reset punta a:
```
https://mrtrrt67.github.io/film-bloopers-hub/reset.html
```
Ma il redirect dopo il reset punta a:
```
https://cinemabloopers.streamlit.app/
```
Che potrebbe non essere il dominio attuale (`filmbloopers.online`). Incoerenza che causa confusione utente e potenziale open redirect.

#### P1-5: Cancellazione profili utente senza cascading

**File:** [`admin_components.py`](../components/admin_components.py) — riga 312

```python
supabase.table("profiles").delete().eq("id", p_id).execute()
```

La cancellazione di un profilo admin non elimina:
- Voti dell'utente (`voti_bloopers`)
- Segnalazioni (`errori` con `inserito_da`)
- Suggerimenti
- L'account auth in `auth.users`

---

### 🟡 P2 — ATTENZIONE

| ID | Descrizione | File |
|----|-------------|------|
| P2-1 | Password minima 6 caratteri, nessun requisito di complessità | sidebar.py, reset.html |
| P2-2 | Bare `except: pass` nascondono errori di sicurezza | Diffuso |
| P2-3 | `.gitignore` include solo `.streamlit/`, non `__pycache__`, `.env`, `*.pyc` | .gitignore |
| P2-4 | `avvia_app.bat` contiene path hardcoded `C:\Users\mrtrr\...` | avvia_app.bat |
| P2-5 | Nessun Content Security Policy (CSP) header | — |
| P2-6 | `unsafe_allow_html=True` usato pervasivamente senza sanitizzazione | Tutti i file |
| P2-7 | Nessun audit trail per login/logout | — |
| P2-8 | Admin determinato da confronto email case-insensitive | callbacks.py |

---

## 3. Matrice di Accesso (RBAC)

| Funzionalità | Ospite | Free | Premium | Admin |
|-------------|--------|------|---------|-------|
| Ricerca IA | 6/giorno | 15/giorno | ∞ | ∞ |
| Visualizzazione film | ✅ | ✅ | ✅ | ✅ |
| Segnalazione errori | ❌ | ✅ | ✅ | ✅ |
| Voto bloopers | ❌ | ✅ | ✅ | ✅ |
| **Elimina tutti bloopers** | ❌ | **⚠️ ✅** | **⚠️ ✅** | ✅ |
| Sync Letterboxd | ❌ | ❌ | ✅ | ✅ |
| Esporta archivio | ❌ | ❌ | ✅ | ✅ |
| Pannello admin | ❌ | ❌ | ❌ | ✅ |
| Elimina profili | ❌ | ❌ | ❌ | ✅ |

> ⚠️ Il pulsante "🧹 Elimina tutti" i bloopers è accessibile a **TUTTI gli utenti loggati**, non solo agli admin.

---

## 4. Dipendenze e Supply Chain

| Dipendenza | Versione | Rischio |
|-----------|----------|---------|
| streamlit | Non pinned | ⚠️ Breaking changes automatici |
| supabase | Non pinned | ⚠️ |
| google-genai | Non pinned | ⚠️ |
| google-generativeai | Non pinned | ⚠️ Duplicato |
| stripe | Non pinned | ⚠️ |
| beautifulsoup4 | Non pinned | Basso |
| requests | Non pinned | Basso |
| tornado | Non pinned | ⚠️ CVE storiche note |

---

## 5. Raccomandazioni Prioritarie

### Azione Immediata (Entro 24h)
1. ✅ Verificare RLS attivo su tutte le tabelle Supabase
2. ✅ Rimuovere il pulsante "Elimina tutti" dalla vista utente
3. ✅ Aggiungere sanitizzazione input ai prompt IA

### Azione a Breve (Entro 1 settimana)
4. Implementare email verification alla registrazione
5. Aggiungere soft delete con retention
6. Pinning versioni in requirements.txt
7. Arricchire `.gitignore`

### Azione a Medio Termine
8. Implementare CSP headers
9. Aggiungere audit trail per azioni admin
10. Rate limiting server-side (Supabase Edge Functions o middleware)
11. Implementare CORS policy esplicita
