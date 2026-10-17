import streamlit as st
import time

class ModalsComponent:
    @staticmethod
    @st.dialog("🔒 Informativa sulla Privacy (GDPR)", width="large")
    def modal_privacy():
        st.markdown("""
        <div style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">
            <p>La presente informativa descrive le modalità di gestione della piattaforma <b>FilmBloopers</b> in riferimento al trattamento dei dati personali degli utenti.</p>
            <p><b>1. Titolare del Trattamento</b><br>
            * Titolare: <b>[Inserire Nome / Titolare o Ditta]</b><br>
            * P. IVA / C.F.: <code>*****</code><br>
            * Sede legale: <code>*****</code><br>
            * Contatto email: <code>supporto@filmbloopers.it</code></p>
            <p><b>2. Tipologia di Dati Raccolti e Finalità</b><br>
            * <b>Dati di Registrazione:</b> Indirizzo email e credenziali gestite tramite l'infrastruttura sicura di <i>Supabase</i>.<br>
            * <b>Dati di Interazione e Gamification:</b> Punti accumulati, voti espressi sui bloopers e motivazioni di contestazione.<br>
            * <b>Log di Navigazione e Ricerche:</b> Termini di ricerca inseriti nell'archivio e registri di accesso per finalità tecniche e di sicurezza.</p>
            <p><b>3. Base Giuridica del Trattamento</b><br>
            Il trattamento si fonda sull'esecuzione del contratto di servizio richiesto dall'utente e sull'adempimento di obblighi di legge.</p>
            <p><b>4. Conservazione e Diritti</b><br>
            I dati sono conservati per il tempo strettamente necessario. Gli utenti possono esercitare i diritti riconosciuti dal GDPR (accesso, rettifica, cancellazione) inviando una richiesta scritta al Titolare.</p>
        </div>
        """, unsafe_allow_html=True)

    @staticmethod
    @st.dialog("📄 Termini e Condizioni d'Uso", width="large")
    def modal_tos():
        st.markdown("""
        <div style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">
            <p><b>1. Accettazione dei Termini</b><br>
            L'accesso e l'utilizzo di FilmBloopers implicano l'accettazione integrale dei presenti Termini di Servizio. Il servizio è riservato a utenti di età superiore ai <b>14 anni</b>.</p>
            <p><b>2. Contenuti Generati dagli Utenti (UGC)</b><br>
            Gli utenti possono inviare segnalazioni di errori cinematografici e motivazioni di contestazione. L'utente garantisce di essere l'autore dei contenuti inviati e si impegna a non caricare materiale offensivo o protetto da copyright.</p>
            <p><b>3. Esclusione del Diritto di Recesso per Servizi Digitali</b><br>
            Ai sensi dell'art. 59 del Codice del Consumo, l'utente riconosce che acquistando l'accesso immediato a contenuti digitali (es. abbonamenti Premium), acconsente all'esecuzione immediata del contratto e <b>perde il diritto di recesso</b>.</p>
            <p><b>4. Punti e Abbonamenti</b><br>
            I punti guadagnati nella community danno diritto a sbloccare abbonamenti promozionali. L'amministratore può modificarne i parametri o revocare benefici in caso di abusi.</p>
        </div>
        """, unsafe_allow_html=True)

    @staticmethod
    @st.dialog("🍪 Informativa sui Cookie", width="large")
    def modal_cookie():
        st.markdown("""
        <div style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">
            <p>La presente Cookie Policy spiega cosa sono i cookie e come vengono utilizzati da <b>FilmBloopers</b>.</p>
            <p><b>1. Cosa sono i Cookie</b><br>
            I cookie sono piccoli file di testo salvati sul dispositivo dell'utente durante la navigazione nei siti web.</p>
            <p><b>2. Tipologie di Cookie Utilizzati</b><br>
            * <b>Cookie Tecnici e di Sessione:</b> Indispensabili per il corretto funzionamento della piattaforma (gestiti tramite Streamlit e Supabase) per mantenere attiva la sessione di login.<br>
            * <b>Cookie di Terze Parti:</b> Eventuali servizi esterni collegati (es. Stripe per i pagamenti) applicano le rispettive informative privacy.</p>
        </div>
        """, unsafe_allow_html=True)

    @staticmethod
    @st.dialog("🛒 Affiliazione Amazon", width="large")
    def modal_amazon(affiliate_tag: str):
        st.markdown(f"""
        <div style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">
            <p>In conformità alle direttive AGCOM e agli standard operativi del programma di affiliazione Amazon, si comunica quanto segue:</p>
            <p>• <b>In qualità di Affiliato Amazon, FilmBloopers riceve un guadagno dagli acquisti idonei</b> effettuati tramite i link di affiliazione presenti all'interno delle schede dei film (es. tramite tag <code>{affiliate_tag}</code>).</p>
            <p>• La presenza di questi link non comporta alcun costo aggiuntivo per l'utente e permette di finanziare il mantenimento e lo sviluppo tecnologico della piattaforma.</p>
        </div>
        """, unsafe_allow_html=True)

    @staticmethod
    @st.dialog("🌟 Listino Piani e Offerte", width="large")
    def mostra_popup_premium(is_promo: bool, stripe_monthly: str, stripe_lifetime: str, user_logged):
        titolo_modale = "Listino Piani e Offerte Future (Post-Lancio)" if is_promo else "Piani di Abbonamento Premium"
        st.markdown(f"""
            <div style="text-align: center; margin-bottom: 15px;">
                <span style="font-size: 30px;">⭐</span>
                <h3 style="color: #f8fafc; font-size: 18px; margin: 5px 0 0 0;">{titolo_modale}</h3>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 5px;">Sblocca ricerche IA illimitate, sincronizzazione automatica Letterboxd e download completo dell'archivio.</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; color: #f8fafc; font-size: 12px; text-align: left; margin-bottom: 15px;">
                <thead>
                    <tr style="border-bottom: 2px solid #334155;">
                        <th style="padding: 8px;">Funzionalità</th>
                        <th style="padding: 8px; text-align: center;">👤 Ospite</th>
                        <th style="padding: 8px; text-align: center;">📦 Free</th>
                        <th style="padding: 8px; text-align: center; color: #facc15;">⭐ Premium</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid #1e293b;">
                        <td style="padding: 8px;">Ricerche in archivio</td>
                        <td style="padding: 8px; text-align: center; color: #22c55e;">Illimitate</td>
                        <td style="padding: 8px; text-align: center; color: #22c55e;">Illimitate</td>
                        <td style="padding: 8px; text-align: center; color: #22c55e;">Illimitate</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #1e293b;">
                        <td style="padding: 8px;">Ricerche IA giornaliere</td>
                        <td style="padding: 8px; text-align: center;">6 / giorno</td>
                        <td style="padding: 8px; text-align: center;">15 / giorno</td>
                        <td style="padding: 8px; text-align: center; color: #facc15; font-weight: bold;">Illimitate</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #1e293b;">
                        <td style="padding: 8px;">Sync Letterboxd</td>
                        <td style="padding: 8px; text-align: center; color: #ef4444;">❌</td>
                        <td style="padding: 8px; text-align: center; color: #ef4444;">❌</td>
                        <td style="padding: 8px; text-align: center; color: #22c55e;">✅</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #1e293b;">
                        <td style="padding: 8px;">Invio suggerimenti</td>
                        <td style="padding: 8px; text-align: center; color: #ef4444;">❌</td>
                        <td style="padding: 8px; text-align: center; color: #22c55e;">✅</td>
                        <td style="padding: 8px; text-align: center; color: #22c55e;">✅</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #1e293b;">
                        <td style="padding: 8px;">Download completo archivio</td>
                        <td style="padding: 8px; text-align: center; color: #ef4444;">❌</td>
                        <td style="padding: 8px; text-align: center; color: #ef4444;">❌</td>
                        <td style="padding: 8px; text-align: center; color: #22c55e;">✅</td>
                    </tr>
                </tbody>
            </table>
        """, unsafe_allow_html=True)
        
        if user_logged is None:
            st.markdown("""
                <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 12px; text-align: center; margin-top: 10px;">
                    <p style="color: #fca5a5; font-size: 12px; margin: 0;">
                        ⚠️ <b>Registrazione richiesta:</b> Effettua il login o registrati per scoprire se puoi accedere alla promo in corso.
                    </p>
                </div>
            """, unsafe_allow_html=True)
        else:
            col_p1, col_p2 = st.columns(2)
            with col_p1:
                st.markdown("#### 📅 Piano Mensile")
                st.markdown("<p style='color: #94a3b8; font-size: 12px;'>Fatturazione mensile, disdici quando vuoi.</p>", unsafe_allow_html=True)
                st.link_button("Abbonati a 0,99€ / mese", stripe_monthly, width='stretch')
            with col_p2:
                st.markdown("#### ♾️ Piano Lifetime")
                st.markdown("<p style='color: #94a3b8; font-size: 12px;'>Pagamento unico, accesso illimitato per sempre.</p>", unsafe_allow_html=True)
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