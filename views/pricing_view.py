import streamlit as st
import stripe

def render_pricing(price_ids, user_email):
    """Renderizza la pagina dedicata ai piani con card e tooltip informativi corretti"""
    
    # CSS per i tooltip informativi
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
            width: 190px;
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

    piani = [
        {
            "titolo": "Free",
            "prezzo": "0,00 €",
            "sottotitolo": "Gratuito",
            "voci": [
                ("Ricerche limitate", "Fino a 15 ricerche IA al giorno."),
                ("Invio suggerimenti", "Proponi miglioramenti alla piattaforma."),
                ("Accesso community", "Esplora l'archivio e le classifiche pubbliche.")
            ],
            "is_free": True
        },
        {
            "titolo": "Mensile",
            "prezzo": "0,99 €",
            "sottotitolo": "Al mese",
            "voci": [
                ("Ricerche IA illimitate", "Nessun limite giornaliero nelle ricerche."),
                ("Inserimento bloopers", "Aggiungi nuovi errori cinematografici."),
                ("Segnalazione errori", "Segnala imprecisioni sui bloopers."),
                ("Conferma/Contestazione", "Vota e contesta i bloopers della community."),
                ("Sync Letterboxd & Download", "Sincronizza watchlist e scarica l'archivio."),
                ("Classifica e premi", "Partecipa alla classifica con premi esclusivi.")
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
                ("Ricerche IA illimitate", "Nessun limite giornaliero nelle ricerche."),
                ("Inserimento bloopers", "Aggiungi nuovi errori cinematografici."),
                ("Segnalazione errori", "Segnala imprecisioni sui bloopers."),
                ("Conferma/Contestazione", "Vota e contesta i bloopers della community."),
                ("Sync Letterboxd & Download", "Sincronizza watchlist e scarica l'archivio."),
                ("Classifica e premi", "Partecipa alla classifica con premi esclusivi.")
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
                ("Accesso a vita", "Paghi una sola volta, per sempre senza rinnovi."),
                ("Funzioni Premium", "Tutti i vantaggi Premium inclusi permanentemente."),
                ("Classifica e premi", "Partecipazione prioritaria con vantaggi dedicati.")
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
                ("Accesso a vita", "Paghi una sola volta, per sempre senza rinnovi."),
                ("Funzioni sbloccate", "Accesso completo a tutti gli strumenti avanzati."),
                ("Vantaggi illimitati", "Supporto e funzioni prioritarie nel tempo.")
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
            # Renderizziamo l'intestazione della card con HTML pulito
            st.markdown(f"""
                <div style="background: rgba(17, 24, 39, 0.90); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 10px; min-height: 140px; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);">
                    <h3 style="color: #f9fafc; font-size: 15px; margin-bottom: 4px;">{piano['titolo']}</h3>
                    <h2 style="color: #fb923c; font-size: 20px; font-weight: 800; margin: 6px 0;">{piano['prezzo']}</h2>
                    <p style="color: #9ca3af; font-size: 11px; margin: 0;">{piano['sottotitolo']}</p>
                </div>
            """, unsafe_allow_html=True)
            
            # Renderizziamo ogni singola voce con il suo tooltip HTML interpretato correttamente
            for titolo_voce, desc_voce in piano["voci"]:
                st.markdown(f"""
                    <div style="background: rgba(17, 24, 39, 0.6); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 6px; padding: 6px 10px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #d1d5db;">
                        <span>• {titolo_voce}</span>
                        <span class="tooltip-container">
                            <span class="info-icon">i</span>
                            <span class="tooltip-text">{desc_voce}</span>
                        </span>
                    </div>
                """, unsafe_allow_html=True)

            # Spaziatura e pulsante di azione allineato in basso
            st.markdown("<div style='margin-bottom: 10px;'></div>", unsafe_allow_html=True)
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
    """Crea la sessione di checkout Stripe"""
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