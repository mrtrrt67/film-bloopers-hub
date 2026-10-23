# 🧪 Piano di Test — FilmBloopers Hub

> **Data:** 2026-10-24  
> **Autore:** QA Lead  
> **Versione:** 1.0  

---

## 1. Strategia di Test

| Livello | Copertura | Strumenti |
|---------|-----------|-----------|
| Unit Test | Services (AI, TMDB, Letterboxd) | pytest |
| Integration Test | Supabase CRUD, Stripe Checkout | pytest + mocking |
| E2E / UI Test | Flussi utente principali | Selenium / Playwright |
| Manual Test | Admin panel, edge cases | Checklist manuale |

---

## 2. Test Case — Autenticazione

| ID | Scenario | Input | Risultato Atteso | Priorità |
|----|----------|-------|-----------------|----------|
| AUTH-01 | Login con credenziali valide | email+pw corretti | Redirect a Home, badge utente visibile | 🔴 |
| AUTH-02 | Login con password errata | email ok, pw errata | Messaggio "Credenziali non valide" | 🔴 |
| AUTH-03 | Registrazione nuovo utente | email valida, pw ≥ 6 | Profilo creato, tier=free o premium (se promo) | 🔴 |
| AUTH-04 | Registrazione con email duplicata | email esistente | Errore Supabase | 🟠 |
| AUTH-05 | Registrazione con pw < 6 caratteri | pw corta | Errore Supabase Auth | 🟠 |
| AUTH-06 | Logout | click "Esci" | session_state pulito, redirect Home | 🔴 |
| AUTH-07 | Reset password — invio email | email registrata | Email inviata, messaggio successo | 🟠 |
| AUTH-08 | Reset password — nuova pw | pw valida e confermata | Password aggiornata, redirect app | 🟠 |
| AUTH-09 | Reset password — pw non coincidenti | pw1 ≠ pw2 | Errore "Le password non coincidono" | 🟡 |

---

## 3. Test Case — Ricerca e Catalogo

| ID | Scenario | Input | Risultato Atteso | Priorità |
|----|----------|-------|-----------------|----------|
| SEARCH-01 | Cerca film esistente nel DB | "Titanic" | Scheda film mostrata senza chiamata IA | 🔴 |
| SEARCH-02 | Cerca film NON esistente | "Film raro sconosciuto" | IA genera film + salvataggio DB | 🔴 |
| SEARCH-03 | Cerca saga completa | "King Kong" | Tutti i capitoli (1933, 1976, 2005, 2017...) | 🟠 |
| SEARCH-04 | Cerca con filtro anno | "Batman", anno 1989 | Solo Batman 1989 | 🟠 |
| SEARCH-05 | Cerca con filtro cast | "Spielberg" | Film di Spielberg | 🟠 |
| SEARCH-06 | Cerca con < 3 caratteri | "AB" | Nessuna ricerca avviata | 🟡 |
| SEARCH-07 | Reset ricerca | click "Reset" | Campi svuotati, lista film pulita | 🟡 |
| SEARCH-08 | Seleziona film dalla lista risultati | click radio button | Scheda film caricata nel pannello destro | 🔴 |

---

## 4. Test Case — Bloopers

| ID | Scenario | Input | Risultato Atteso | Priorità |
|----|----------|-------|-----------------|----------|
| BLOOP-01 | Visualizza bloopers di un film | Film con errori | Lista expander con minuto, categoria, desc | 🔴 |
| BLOOP-02 | Film senza bloopers | Film vuoto | Warning + pulsante "Genera con IA" | 🔴 |
| BLOOP-03 | Genera bloopers con IA | click "Genera" | 6-8 errori salvati e mostrati | 🔴 |
| BLOOP-04 | Cerca altri bloopers | click "Cerca altri" | Nuovi errori non duplicati | 🟠 |
| BLOOP-05 | Vota conferma (👍) | click 👍 come utente loggato | Voto registrato, pulsante primary | 🟠 |
| BLOOP-06 | Vota contestazione (👎) | click 👎 | Campo motivo appare | 🟠 |
| BLOOP-07 | Salva motivo contestazione | testo + click "Salva" | Motivo salvato in DB | 🟡 |
| BLOOP-08 | Voto come ospite | click 👍 senza login | Messaggio "Effettua il login" | 🟡 |
| BLOOP-09 | Toggle voto (annulla) | click stesso voto 2 volte | Voto rimosso | 🟡 |

---

## 5. Test Case — Community

| ID | Scenario | Risultato Atteso | Priorità |
|----|----------|-----------------|----------|
| COMM-01 | Visualizza classifica | Top 20 utenti con punti, grado, posizione | 🟠 |
| COMM-02 | Premio mensile automatico | Utente con ≥ soglia_mensile pts → tier premium | 🔴 |
| COMM-03 | Premio lifetime automatico | Utente con ≥ soglia_lifetime pts → lifetime | 🔴 |
| COMM-04 | Segnala errore con formato minuto valido | Segnalazione inserita con approvato=false | 🟠 |
| COMM-05 | Segnala errore con formato minuto invalido | Errore "Formato minuto non valido" | 🟡 |
| COMM-06 | Invia suggerimento | Messaggio salvato in tabella suggerimenti | 🟡 |

---

## 6. Test Case — Stripe / Premium

| ID | Scenario | Risultato Atteso | Priorità |
|----|----------|-----------------|----------|
| STRIPE-01 | Click su piano Mensile | Redirect a Stripe Checkout (mode=subscription) | 🔴 |
| STRIPE-02 | Click su piano Lifetime | Redirect a Stripe Checkout (mode=payment) | 🔴 |
| STRIPE-03 | Click su piano Free | Pulsante disabilitato | 🟡 |
| STRIPE-04 | Pagamento completato | Redirect a `?success=true` | 🟠 |
| STRIPE-05 | Pagamento annullato | Redirect a `?canceled=true` | 🟡 |
| STRIPE-06 | Scadenza abbonamento mensile | Tier downgrade a free automatico | 🔴 |

---

## 7. Test Case — Strumenti Pro

| ID | Scenario | Risultato Atteso | Priorità |
|----|----------|-----------------|----------|
| TOOL-01 | Sync Letterboxd con username valido | Film visti/watchlist sincronizzati | 🟠 |
| TOOL-02 | Sync Letterboxd con username inesistente | Warning "Impossibile trovare film" | 🟡 |
| TOOL-03 | Esporta CSV Film | Download file archivio_film.csv | 🟠 |
| TOOL-04 | Esporta CSV Bloopers | Download file archivio_errori.csv | 🟠 |
| TOOL-05 | Accesso strumenti pro come Free | Menu non visibile | 🟠 |

---

## 8. Test Case — Admin

| ID | Scenario | Risultato Atteso | Priorità |
|----|----------|-----------------|----------|
| ADM-01 | Accesso pannello come non-admin | Sezione non visibile | 🔴 |
| ADM-02 | Approva segnalazione + punti | Errore approvato, punti assegnati | 🔴 |
| ADM-03 | Rifiuta segnalazione | Errore eliminato, log moderazione | 🟠 |
| ADM-04 | Modifica tier utente | Profilo aggiornato | 🟠 |
| ADM-05 | Elimina profilo utente | Profilo rimosso (verificare cascading) | 🟠 |
| ADM-06 | Modifica testi Home/Promo | Configurazioni aggiornate, UI riflette | 🟡 |
| ADM-07 | Rilancia poster TMDB mancante | Poster recuperato e salvato | 🟡 |
| ADM-08 | Gestisci contestazione (salva correzione) | Errore aggiornato, punti assegnati | 🟠 |
| ADM-09 | Elimina film da archivio | Film + errori correlati eliminati | 🟠 |

---

## 9. Test Case — Sicurezza

| ID | Scenario | Risultato Atteso | Priorità |
|----|----------|-----------------|----------|
| SEC-01 | Rate limit ospite (7° ricerca IA) | Messaggio "Limite raggiunto" | 🔴 |
| SEC-02 | Rate limit Free (16° ricerca IA) | Messaggio "Limite piano Free" | 🔴 |
| SEC-03 | Anti-spam (2 click in < 3 secondi) | Messaggio "Protezione anti-spam" | 🟠 |
| SEC-04 | Accesso admin con email non-admin | Pannello admin NON visibile | 🔴 |
| SEC-05 | XSS via titolo film | HTML non eseguito nell'UI | 🔴 |
| SEC-06 | Prompt injection via campo ricerca | IA non rivela system prompt | 🟠 |

---

## 10. Test di Regressione

Dopo ogni deploy, eseguire:

- [ ] AUTH-01 (Login)
- [ ] AUTH-06 (Logout)
- [ ] SEARCH-01 (Cerca film esistente)
- [ ] SEARCH-02 (Cerca film nuovo → IA)
- [ ] BLOOP-01 (Visualizza bloopers)
- [ ] STRIPE-01 (Checkout Stripe)
- [ ] ADM-01 (Accesso admin protetto)
- [ ] SEC-01 (Rate limit)

---

## 11. Ambiente di Test

| Parametro | Valore |
|-----------|--------|
| **Browser primari** | Chrome 128+, Firefox 130+, Safari 18+ |
| **Mobile** | Chrome Android, Safari iOS |
| **Supabase** | Ambiente di staging (consigliato) |
| **Stripe** | Test mode con chiavi `sk_test_` / `pk_test_` |
