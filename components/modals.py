import streamlit as st
import time

class ModalsComponent:
    @staticmethod
    @st.dialog("🔒 Informativa sulla Privacy (GDPR)", width="large")
    def modal_privacy():
        st.markdown("""
        ### Informativa sul Trattamento dei Dati Personali (GDPR - Regolamento UE 2016/679)
        La presente informativa descrive le modalità di gestione della piattaforma **FilmBloopers** in riferimento al trattamento dei dati personali degli utenti che la consultano e vi interagiscono.

        **1. Titolare del Trattamento**
        * Titolare: **[Inserire Nome / Titolare o Ditta]**
        * P. IVA / C.F.: `*****`
        * Sede legale: `*****`
        * Contatto email: `supporto@filmbloopers.it` (`*****`)

        **2. Tipologia di Dati Raccolti e Finalità**
        * **Dati di Registrazione:** Indirizzo email e credenziali di accesso crittografate gestite tramite l'infrastruttura sicura di *Supabase*. Finalità: erogazione del servizio, gestione dell'autenticazione e dei piani di abbonamento.
        * **Dati di Interazione e Gamification:** Punti accumulati, voti espressi sui bloopers e motivazioni di contestazione. Finalità: gestione della classifica pubblica della community e assegnazione automatica dei premi.
        * **Log di Navigazione e Ricerche:** Termini di ricerca inseriti nell'archivio e registri di accesso per finalità tecniche, statistiche e di sicurezza informatica.

        **3. Base Giuridica del Trattamento**
        Il trattamento dei dati si fonda sull'esecuzione del contratto di servizio richiesto dall'utente (registrazione e consultazione) e sull'adempimento di obblighi di legge (fiscali e normativi).

        **4. Conservazione dei Dati**
        I dati personali sono conservati per il tempo strettamente necessario al conseguimento delle finalità per cui sono stati raccolti. L'utente può richiedere in qualsiasi momento la cancellazione del proprio account e dei dati associati.

        **5. Diritti degli Interessati**
        Gli utenti possono esercitare i diritti riconosciuti dal GDPR (accesso, rettifica, cancellazione, limitazione, portabilità) inviando una richiesta scritta al Titolare del trattamento.
        """)

    @staticmethod
    @st.dialog("📄 Termini e Condizioni d'Uso", width="large")
    def modal_tos():
        st.markdown("""
        ### Termini e Condizioni d'Uso (ToS)
        **1. Accettazione dei Termini**
        L'accesso e l'utilizzo di FilmBloopers implicano l'accettazione integrale dei presenti Termini di Servizio. Il servizio è riservato a utenti di età superiore ai **14 anni** (ai sensi dell'art. 8 del GDPR).

        **2. Contenuti Generati dagli Utenti (UGC)**
        Gli utenti possono inviare segnalazioni di errori cinematografici e motivazioni di contestazione. L'utente garantisce di essere l'autore dei contenuti inviati e si impegna a non caricare materiale offensivo, diffamatorio o protetto da copyright di terzi senza autorizzazione. L'amministratore si riserva il diritto insindacabile di moderare, correggere o rimuovere qualsiasi contenuto.

        **3. Esclusione del Diritto di Recesso per Servizi Digitali**
        Ai sensi dell'art. 59, comma 1, lettera o) del Codice del Consumo, l'utente riconosce e accetta che, acquistando o sbloccando l'accesso immediato a contenuti e servizi digitali (es. abbonamenti Premium), acconsente all'esecuzione immediata del contratto e **perde il diritto di recesso** di 14 giorni una volta avviata la fruizione o l'attivazione del servizio.

        **4. Punti, Gamification e Abbonamenti**
        I punti guadagnati nella community danno diritto a sbloccare abbonamenti promozionali (es. piani mensili o Lifetime). L'amministratore può modificare i parametri di assegnazione o revocare benefici in caso di abusi o violazioni delle regole della community.
        """)

    @staticmethod
    @st.dialog("🍪 Informativa sui Cookie", width="large")
    def modal_cookie():
        st.markdown("""
        ### Informativa sui Cookie (Cookie Policy)
        La presente Cookie Policy spiega cosa sono i cookie e come vengono utilizzati da **FilmBloopers**.

        **1. Cosa sono i Cookie**
        I cookie sono piccoli file di testo salvati sul dispositivo dell'utente durante la navigazione nei siti web.

        **2. Tipologie di Cookie Utilizzati**
        * **Cookie Tecnici e di Sessione:** Indispensabili per il corretto funzionamento della piattaforma (gestiti tramite Streamlit e Supabase). Permettono di mantenere attiva la sessione di login dell'utente e di gestire le preferenze di navigazione. Per l'uso di tali cookie non è richiesto il consenso preventivo dell'utente.
        * **Cookie di Profilazione o Terze Parti:** La piattaforma non utilizza cookie di profilazione pubblicitaria propri. Eventuali servizi esterni collegati (es. Stripe per i pagamenti o widget di terze parti) applicano le rispettive informative privacy.
        """)

    @staticmethod
    @st.dialog("🛒 Affiliazione Amazon", width="large")
    def modal_amazon(affiliate_tag: str):
        st.markdown(f"""
        ### Informativa Affiliazione Amazon
        In conformità alle direttive AGCOM e agli standard operativi del programma di affiliazione Amazon, si comunica quanto segue:

        * **In qualità di Affiliato Amazon, FilmBloopers riceve un guadagno dagli acquisti idonei** effettuati tramite i link di affiliazione presenti all'interno delle schede dei film (es. tramite tag `{affiliate_tag}`).
        * La presenza di questi link non comporta alcun costo aggiuntivo per l'utente e permette di finanziare il mantenimento e lo sviluppo tecnologico della piattaforma.
        """)

    @staticmethod
    @st.dialog("🌟 Listino Piani e Offerte", width="large")
    def mostra_popup_premium(is_promo: bool, stripe_monthly: str, stripe_lifetime: str, user_logged):
        titolo_modale = "Listino Piani e Offerte Future (Post-Lancio)" if is_promo else "Piani di Abbonamento Premium"
        st.markdown(f"""
            <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-size: 35px;">⭐</span>
                <h3 style="color: #f8fafc; margin: 5px 0 0 0;">{titolo_modale}</h3>
                <p style="color: #94a3b8; font-size: 13px;">Sblocca ricerche IA illimitate, sincronizzazione automatica Letterboxd, inserimento manuale dei bloopers e download completo dell'archivio.</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; color: #f8fafc; font-size: 13px; text-align: left; margin-bottom: 20px;">
                <thead>
                    <tr style="border-bottom: 2px solid #334155;">
                        <th style="padding: 10px; white-space: nowrap;">Funzionalità</th>
                        <th style="padding: 10px; text-align: center; white-space: nowrap;">👤 Ospite</th>
                        <th style="padding: 10px; text-align: center; white-space: nowrap;">📦 Free</th>
                        <th style="padding: 10px; text-align: center; color: #facc15; white-space: nowrap;">⭐ Premium</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #1e293b;">
                        <td style="padding: 10px; white-space: nowrap;">Ricerche in archivio</td>
                        <td style="padding: 10px; text-align: center; color: #22c55e;">Illimitate</td>
                        <td style="padding: 10px; text-align: center; color: #22c55e;">Illimitate</td>
                        <td style="padding: 10px; text-align: center; color: #22c55e;">Illimitate</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #1e293b;">
                        <td style="padding: 10px; white-space: nowrap;">Ricerche IA giornaliere</td>
                        <td style="padding: 10px; text-align: center;">6 / giorno</td>
                        <td style="padding: 10px; text-align: center;">15 / giorno</td>
                        <td style="padding: 10px; text-align: center; color: #facc15; font-weight: bold;">Illimitate</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #1e293b;">
                        <td style="padding: 10px; white-space: nowrap;">Sync Letterboxd</td>
                        <td style="padding: 10px; text-align: center; color: #ef4444;">❌</td>
                        <td style="padding: 10px; text-align: center; color: #ef4444;">❌</td>
                        <td style="padding: 10px; text-align: center; color: #22c55e;">✅</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #1e293b;">
                        <td style="padding: 10px; white-space: nowrap;">Invio suggerimenti</td>
                        <td style="padding: 10px; text-align: center; color: #ef4444;">❌</td>
                        <td style="padding: 10px; text-align: center; color: #22c55e;">✅</td>
                        <td style="padding: 10px; text-align: center; color: #22c55e;">✅</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #1e293b;">
                        <td style="padding: 10px; white-space: nowrap;">Download completo archivio</td>
                        <td style="padding: 10px; text-align: center; color: #ef4444;">❌</td>
                        <td style="padding: 10px; text-align: center; color: #ef4444;">❌</td>
                        <td style="padding: 10px; text-align: center; color: #22c55e;">✅</td>
                    </tr>
                </tbody>
            </table>
        """, unsafe_allow_html=True)
        
        if user_logged is None:
            st.markdown("""
                <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 14px; text-align: center;">
                    <p style="color: #fca5a5; font-size: 13px; margin: 0; line-height: 1.5;">
                        ⚠️ <b>Registrazione richiesta:</b> Effettua il login o registrati per scoprire se puoi accedere alla promo in corso.
                    </p>
                </div>
            """, unsafe_allow_html=True)
        else:
            col_p1, col_p2 = st.columns(2)
            with col_p1:
                st.markdown("#### 📅 Piano Mensile")
                st.markdown("<p style='color: #94a3b8; font-size: 13px;'>Fatturazione mensile, disdici quando vuoi.</p>", unsafe_allow_html=True)
                st.link_button("Abbonati a 0,99€ / mese", stripe_monthly, width='stretch')
            with col_p2:
                st.markdown("#### ♾️ Piano Lifetime")
                st.markdown("<p style='color: #94a3b8; font-size: 13px;'>Pagamento unico, accesso illimitato per sempre.</p>", unsafe_allow_html=True)
                st.link_button("Acquista a 9,99€ una tantum", stripe_lifetime, width='stretch')
 
    @staticmethod
    @st.dialog("⚠️ Conferma Eliminazione Film")
    def dialog_conferma_eliminazione(f_id, f_titolo, supabase_client):
        st.markdown(f"Sei sicuro di voler eliminare definitivamente il film **'{f_titolo}'** e tutti i relativi bloopers associati?")
        st.markdown("")
        col_d1, col_d2 = st.columns(2)
        with col_d1:
            if st.button("✅ Sì, elimina", type="primary", width='stretch'):
                try:
                    supabase_client.table("errori").delete().eq("film_id", f_id).execute()
                    supabase_client.table("films").delete().eq("id", f_id).execute()
                    st.toast(f"Film '{f_titolo}' eliminato con successo!", icon="🗑️")
                    st.session_state.id_film_da_eliminare = None
                    st.session_state.titolo_film_da_eliminare = None
                    time.sleep(0.5)
                    st.rerun()
                except Exception as e:
                    st.error(f"Errore durante l'eliminazione: {e}")
        with col_d2:
            if st.button("❌ Annulla", width='stretch'):
                st.session_state.id_film_da_eliminare = None
                st.session_state.titolo_film_da_eliminare = None
                st.rerun()