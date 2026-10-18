import streamlit as st
import stripe

def render_pricing(price_ids, user_email):
    """Renderizza la pagina dedicata ai piani (Free e Premium) con card in stile glassmorphic allineate e tooltip informativi"""
    
    # CSS personalizzato per i tooltip informativi (icona "i") al passaggio del mouse
    st.markdown("""
        <style>
        .tooltip-container {
            position: relative;
            display: inline-flex;
            align-items: center;
            margin-left: 6px;
            cursor: help;
        }
        .info-icon {
            display: inline-flex;
            justify-content: center;
            align-items: center;
            width: 15px;
            height: 15px;
            background-color: rgba(156, 163, 175, 0.2);
            color: #9ca3af;
            border-radius: 50%;
            font-size: 10px;
            font-weight: bold;
            font-family: sans-serif;
        }
        .tooltip-container:hover .info-icon {
            background-color: #fb923c;
            color: #111827;
        }
        .tooltip-text {
            visibility: hidden;
            width: 200px;
            background-color: #1f2937;
            color: #f9fafc;
            text-align: left;
            border-radius: 6px;
            padding: 8px 10px;
            position: absolute;
            z-index: 100;
            bottom: 125%;
            left: 50%;
            transform: translateX(-50%);
            opacity: 0;
            transition: opacity 0.2s;
            font-size: 11px;
            line-height: 1.4;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }
        .tooltip-container:hover .tooltip-text {
            visibility: visible;
            opacity: 1;
        }
        </style>
    """, unsafe_allow_html=True)

    st.markdown("<h1 style='text-align: center; color: #f9fafc; font-weight: 800; margin-bottom: 5px;'>Scegli il tuo piano</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center; color: #9ca3af; margin-bottom: 30px;'>Confronta i piani e sblocca l'esperienza completa di FilmBloopers Hub.</p>", unsafe_allow_html=True)

    col0, col1, col2, col3, col4 = st.columns(5)

    # Definizione delle voci con le relative descrizioni dettagliate per i tooltip
    piani = [
        {
            "titolo": "Free",
            "prezzo": "0,00 €",
            "sottotitolo": "Gratuito",
            "voci": [
                ("Ricerche limitate", "Puoi effettuare fino a un massimo di 15 ricerche intelligenti con IA al giorno."),
                ("Invio suggerimenti", "Proponi miglioramenti o nuove idee direttamente alla piattaforma."),
                ("Accesso community", "Esplora l'archivio esistente e visualizza le classifiche pubbliche.")
            ],
            "is_free": True
        },
        {
            "titolo": "Mensile",
            "prezzo": "0,99 €",
            "sottotitolo": "Al mese",
            "voci": [
                ("Ricerche IA illimitate", "Interroga l'intelligenza artificiale per cercare film e saghe senza alcun limite giornaliero."),
                ("Inserimento bloopers", "Contribuisci aggiungendo nuovi errori e incongruenze cinematografiche scoperte da te."),
                ("Segnalazione errori", "Segnala correzioni o imprecisioni sui bloopers presenti nel database."),
                ("Conferma/Contestazione", "Vota, conferma o contesta i bloopers inseriti dagli altri utenti della community."),
                ("Sync Letterboxd & Download", "Sincronizza automaticamente la tua watchlist e scarica l'archivio completo in formato tabellare."),
                ("Classifica e premi", "Partecipa attivamente alla classifica della community e competi per vincere premi esclusivi.")
            ],
            "price_id": price_ids.get("Mensile"),
            "is_subscription": True,
            "btn_label": "Scegli Mensile",
            "btn_key": "btn_mensile"
        },
        {
            "titolo": "Annuale",
            "prezzo": "9,99 €",
            "sottotitolo": "All'anno",
            "voci": [
                ("Ricerche IA illimitate", "Interroga l'intelligenza artificiale per cercare film e saghe senza alcun limite giornaliero."),
                ("Inserimento bloopers", "Contribuisci aggiungendo nuovi errori e incongruenze cinematografiche scoperte da te."),
                ("Segnalazione errori", "Segnala correzioni o imprecisioni sui bloopers presenti nel database."),
                ("Conferma/Contestazione", "Vota, conferma o contesta i bloopers inseriti dagli altri utenti della community."),
                ("Sync Letterboxd & Download", "Sincronizza automaticamente la tua watchlist e scarica l'archivio completo in formato tabellare."),
                ("Classifica e premi", "Partecipa attivamente alla classifica della community e competi per vincere premi esclusivi.")
            ],
            "price_id": price_ids.get("Annuale"),
            "is_subscription": True,
            "btn_label": "Scegli Annuale",
            "btn_key": "btn_annuale"
        },
        {
            "titolo": "Lifetime Promo",
            "prezzo": "9,99 €",
            "sottotitolo": "Offerta Lancio",
            "voci": [
                ("Accesso a vita", "Paghi una sola volta e mantieni tutti i vantaggi Premium per sempre, senza alcun rinnovo automatico."),
                ("Funzioni Premium incluse", "Ricerche illimitate, inserimento bloopers, segnalazioni e sincronizzazione Letterboxd sempre sbloccate."),
                ("Classifica e premi dedicati", "Partecipazione prioritaria alla classifica con vantaggi esclusivi riservati ai primi iscritti.")
            ],
            "price_id": price_ids.get("Lifetime Promo"),
            "is_subscription": False,
            "btn_label": "Acquista Promo",
            "btn_key": "btn_promo"
        },
        {
            "titolo": "Lifetime Standard",
            "prezzo": "19,99 €",
            "sottotitolo": "Accesso a vita",
            "voci": [
                ("Accesso a vita", "Paghi una sola volta e mantieni tutti i vantaggi Premium per sempre, senza alcun rinnovo automatico."),
                ("Tutte le funzioni sbloccate", "Sblocco completo e permanente di qualsiasi strumento avanzato presente e futuro della piattaforma."),
                ("Vantaggi illimitati", "Supporto prioritario e accesso illimitato a tutte le funzionalità della community.")
            ],
            "price_id": price_ids.get("Lifetime Standard"),
            "is_subscription": False,
            "btn_label": "Acquista Standard",
            "btn_key": "btn_standard"
        }
    ]

    cols = [col0, col1, col2, col3, col4]

    for i, piano in enumerate(piani):
        with cols[i]:
            # Generazione dinamica della lista con le icone "i" e i tooltip
            html_voci = ""
            for titolo_voce, desc_voce in piano["voci"]:
                html_voci += f"""
                    <div style="margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                        <span>• {titolo_voce}</span>
                        <span class="tooltip-container">
                            <span class="info-icon">i</span>
                            <span class="tooltip-text">{desc_voce}</span>
                        </span>
                    </div>
                """

            st.markdown(f"""
                <div style="background: rgba(17, 24, 39, 0.90); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 12px; min-height: 330px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);">
                    <div>
                        <h3 style="color: #f9fafc; font-size: 16px; margin-bottom: 5px;">{piano['titolo']}</h3>
                        <h2 style="color: #fb923c; font-size: 22px; font-weight: 800; margin: 8px 0;">{piano['prezzo']}</h2>
                        <p style="color: #9ca3af; font-size: 11px; margin-bottom: 12px;">{piano['sottotitolo']}</p>
                        <hr style="border-color: rgba(255,255,255,0.08); margin: 8px 0;">
                        <div style="color: #d1d5db; font-size: 12px; text-align: left; line-height: 1.4; margin-bottom: 10px;">
                            {html_voci}
                        </div>
                    </div>
                </div>
            """, unsafe_allow_html=True)
            
            if piano.get("is_free"):
                st.markdown("<div style='text-align: center; color: #9ca3af; font-size: 12px; padding: 10px;'>Piano Attuale</div>", unsafe_allow_html=True)
            else:
                if st.button(piano['btn_label'], use_container_width=True, key=piano['btn_key'], type="primary" if i == 3 else "secondary"):
                    if piano['price_id']:
                        url = create_checkout_session(piano['price_id'], piano['is_subscription'], user_email)
                        if url:
                            st.markdown(f'<meta http-equiv="refresh" content="0;url={url}">', unsafe_allow_html=True)
                    else:
                        st.error("ID Prezzo Stripe non configurato.")

def create_checkout_session(price_id, is_subscription, user_email):
    """Crea la sessione di checkout Stripe reindirizzando correttamente in caso di annullamento"""
    try:
        mode = "subscription" if is_subscription else "payment"
        checkout_session = stripe.checkout.Session.create(
            line_items=[{"price": price_id, "quantity": 1}],
            mode=mode,
            success_url="https://filmbloopers.online/?success=true",
            cancel_url="https://filmbloopers.online/?sezione=Premium&canceled=true",
            customer_email=user_email,
        )
        return checkout_session.url
    except Exception as e:
        st.error(f"Errore durante la creazione del pagamento: {e}")
        return None