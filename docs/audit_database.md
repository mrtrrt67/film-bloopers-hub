# 🗄️ Audit Database — FilmBloopers Hub

> **Data:** 2026-10-24  
> **Autore:** PostgreSQL / Supabase DBA  
> **Versione:** 1.0  

---

## 1. Piattaforma Database

| Parametro | Valore |
|-----------|--------|
| **Provider** | Supabase (managed PostgreSQL) |
| **URL** | `gmiwhscbqvadnlqruhjs.supabase.co` |
| **Accesso** | Anon Key (pubblica) + Supabase Auth |
| **ORM / Client** | `supabase-py` (REST via PostgREST) |

---

## 2. Schema Database Ricostruito

> ⚠️ **Nota:** Lo schema è stato ricostruito dal codice sorgente Python, non da un dump SQL diretto. Alcune colonne potrebbero non essere complete.

### 2.1 Tabella `films`

| Colonna | Tipo (stimato) | Nullable | Note |
|---------|---------------|----------|------|
| `id` | UUID (PK) | No | Auto-generato da Supabase |
| `titolo` | TEXT | No | Titolo in italiano |
| `anno` | TEXT | Sì | Anno come stringa |
| `regista` | TEXT | Sì | |
| `attori` | TEXT | Sì | Cast come stringa CSV |
| `genere` | TEXT | Sì | |
| `trama` | TEXT | Sì | |
| `poster_url` | TEXT | Sì | URL da TMDB |

**Operazioni:** SELECT *, INSERT, UPDATE, DELETE  
**Volume stimato:** Centinaia/migliaia di righe (in crescita)

### 2.2 Tabella `errori` (Bloopers)

| Colonna | Tipo (stimato) | Nullable | Note |
|---------|---------------|----------|------|
| `id` | UUID (PK) | No | |
| `film_id` | UUID (FK → films.id) | No | |
| `minuto` | TEXT | No | Formato libero "01:14:25" |
| `categoria` | TEXT | No | Enum implicito (4 valori) |
| `descrizione` | TEXT | No | |
| `approvato` | BOOLEAN | No | Default: false |
| `inserito_da` | TEXT | Sì | Email o "IA (Sistema)" |
| `provenienza` | TEXT | Sì | "utente" o "ia" |
| `creato_il` | TIMESTAMPTZ | Sì | Auto-generato |

**Categorie ammesse (non enforce):**
- Errori di scena / Posizione
- Troupe o microfoni visibili
- Anacronismi
- Errori storici o fattuali

### 2.3 Tabella `profiles`

| Colonna | Tipo (stimato) | Nullable | Note |
|---------|---------------|----------|------|
| `id` | UUID (PK) | No | Corrisponde a auth.users.id |
| `email` | TEXT | No | |
| `tier` | TEXT | No | "free", "premium", "admin" |
| `tipo_abbonamento` | TEXT | Sì | "nessuno", "mensile", "lifetime" |
| `data_scadenza` | DATE | Sì | Solo per abbonamenti mensili |
| `punti` | INTEGER | Sì | Default: 0 |
| `calls_today` | INTEGER | Sì | Contatore giornaliero IA |
| `last_reset_date` | TEXT/DATE | Sì | Data ultimo reset |
| `mesi_accreditati` | INTEGER | Sì | Mesi premium già assegnati |
| `created_at` | TIMESTAMPTZ | Sì | |

### 2.4 Tabella `voti_bloopers`

| Colonna | Tipo (stimato) | Nullable | Note |
|---------|---------------|----------|------|
| `id` | UUID (PK) | No | |
| `user_id` | UUID (FK → profiles.id) | No | |
| `errore_id` | UUID (FK → errori.id) | No | |
| `tipo` | TEXT | No | "conferma" o "contestazione" |
| `motivo` | TEXT | Sì | Solo per contestazioni |
| `created_at` | TIMESTAMPTZ | Sì | |

### 2.5 Tabella `suggerimenti`

| Colonna | Tipo (stimato) | Nullable | Note |
|---------|---------------|----------|------|
| `id` | UUID (PK) | No | |
| `user_id` | UUID | No | |
| `email` | TEXT | No | |
| `messaggio` | TEXT | No | |
| `created_at` | TIMESTAMPTZ | Sì | |

### 2.6 Tabella `configurazioni`

| Colonna | Tipo (stimato) | Nullable | Note |
|---------|---------------|----------|------|
| `chiave` | TEXT (PK) | No | Identificativo unico |
| `valore` | TEXT | Sì | Testo del contenuto |
| `visibile` | BOOLEAN | Sì | Toggle visibilità UI |

**Chiavi conosciute:**
- `promo_lifetime_deadline`, `home_banner_top_titolo`, `home_banner_top_testo`
- `home_banner_top_badge`, `home_archivio`, `home_main_titolo`, `home_main_p1`, `home_main_p2`
- `home_promo_interna`, `home_promo_int_titolo`, `home_inizia_subito`
- `home_visibile_archivio`, `home_visibile_inizia_subito`
- `footer_testo_principale`, `footer_testo_amazon`
- `classifica_titolo`, `classifica_banner_titolo`, `classifica_testo_1/2/3`
- `soglia_punti_mensile`, `soglia_punti_lifetime`

### 2.7 Tabelle di Logging

#### `log_accessi`
| Colonna | Tipo | Note |
|---------|------|------|
| `tipo` | TEXT | Email o "ospite" |
| `created_at` | TIMESTAMPTZ | Auto |

#### `log_ricerche`
| Colonna | Tipo | Note |
|---------|------|------|
| `termine` | TEXT | Termine cercato |
| `created_at` | TIMESTAMPTZ | Auto |

#### `log_errori_ia`
| Colonna | Tipo | Note |
|---------|------|------|
| `utente` | TEXT | Email o "ospite" |
| `modello` | TEXT | Nome modello Gemini |
| `film` | TEXT | Titolo film |
| `operazione` | TEXT | Tipo operazione |
| `errore_dettaglio` | TEXT | Messaggio errore |
| `created_at` | TIMESTAMPTZ | Auto |

#### `statistiche_ia`
| Colonna | Tipo | Note |
|---------|------|------|
| `modello` | TEXT | Nome modello |
| `tempo_esecuzione` | FLOAT | Secondi |
| `data_chiamata` | TIMESTAMPTZ | Auto |

#### `storico_moderazione`
| Colonna | Tipo | Note |
|---------|------|------|
| `film_titolo` | TEXT | |
| `minuto` | TEXT | |
| `motivo` | TEXT | |
| `azione` | TEXT | Approvata/Rifiutata/Ignorata/... |
| `punti_assegnati` | INTEGER | |

---

## 3. Problemi Critici del Database

### 🔴 C1 — Assenza di Foreign Key enforcement nel codice
L'eliminazione di un film (`films`) **non cancella automaticamente** gli errori correlati. Il codice lo fa manualmente (riga 151-152 `modals.py`), ma se un client bypassa la UI, rimangono record orfani.

**Soluzione:** `ON DELETE CASCADE` sulla FK `errori.film_id → films.id`

### 🔴 C2 — `anno` come TEXT anziché INTEGER
Il campo `anno` è memorizzato come stringa, causando:
- Confronti stringa vs. numeri incoerenti nel codice
- `int(x.get("anno", 0) or 0)` sparso ovunque con try/except
- Ordinamento potenzialmente errato

### 🔴 C3 — `minuto` come TEXT libero
Il campo `minuto` accetta qualsiasi stringa che passi la regex `^[0-9:]+$`. Non c'è validazione del formato (es. `99:99:99` è valido). Impossibile eseguire query di range.

### 🔴 C4 — Query N+1 nella moderazione
Il pannello admin delle contestazioni (riga 537 `admin_components.py`) esegue una query `SELECT * FROM errori WHERE id = ?` **per ogni contestazione**, dentro un loop. Su N contestazioni = N+1 query.

### 🟡 C5 — Nessun indice documentato
Non ci sono evidenze di indici personalizzati su:
- `errori.film_id` (usato in ogni ricerca di bloopers)
- `errori.approvato` (filtro su ogni query pubblica)
- `profiles.email` (usato per login e assegnazione punti)
- `log_accessi.tipo` (aggregazioni admin)

### 🟡 C6 — `categoria` senza CHECK constraint
Le 4 categorie di errori sono hardcoded nella UI ma non validate dal database. Un insert via API o SQL diretto potrebbe inserire categorie arbitrarie.

### 🟡 C7 — Nessuna paginazione
`supabase.table("films").select("*").execute()` carica **tutti i film** in memoria a ogni pageload. Con la crescita del catalogo, questo diventerà un collo di bottiglia.

### 🟡 C8 — Logica di business nel database layer
L'assegnazione automatica del tier premium avviene nella view `render_classifica()` — ovvero **ogni volta che un utente visita la classifica**. Questo dovrebbe essere un trigger PostgreSQL o una Supabase Edge Function.

---

## 4. Politiche di Retention

| Tabella | Retention | Pulizia |
|---------|-----------|---------|
| `log_accessi` | Illimitata | ❌ Nessuna |
| `log_ricerche` | Illimitata | ❌ Nessuna |
| `log_errori_ia` | Illimitata | ❌ Nessuna |
| `statistiche_ia` | Illimitata | ❌ Nessuna (query filtra ultimi 30gg) |
| `storico_moderazione` | Illimitata | ❌ Nessuna |

> ⚠️ **Rischio:** Crescita incontrollata delle tabelle di log senza policy di purging. Necessario un cron job o una policy di retention (es. 90 giorni).

---

## 5. Raccomandazioni

1. **Creare un file di migrazione SQL** con lo schema esplicito e tutti i vincoli
2. **Aggiungere `ON DELETE CASCADE`** su `errori.film_id` e `voti_bloopers.errore_id`
3. **Convertire `anno` in INTEGER**
4. **Aggiungere indici** su `errori(film_id, approvato)`, `profiles(email)`, `voti_bloopers(errore_id)`
5. **Implementare paginazione** con `.range(start, end)` su tutte le query di lista
6. **Spostare la logica premi** in una Supabase Edge Function o trigger
7. **Definire policy di retention** per le tabelle di log (90 giorni)
8. **Aggiungere CHECK constraints** su `categoria`, `tier`, `tipo_abbonamento`
