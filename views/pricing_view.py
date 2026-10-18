import streamlit as st
import stripe

def render_pricing(price_ids, user_email):
    """Renderizza la pagina dei piani usando esclusivamente componenti nativi di Streamlit (zero HTML fragile)"""
    
    st.markdown("<h1 style='text-align: center; color: #f9fafc; font-weight: 800; margin-bottom: 5px;'>Scegli il tuo piano</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center; color: #9ca3af; margin-bottom: 30px;'>Confronta i piani e sblocca l'esperienza completa di FilmBloopers Hub.</p>", unsafe_allow_html=True)

    col0, col1, col2, col3, col4 = st.columns(5)

    piani = [
        {
            "titolo": "Free",
            "prezzo": "0,00 €",
            "sottotitolo": "Gratuito",
            "voci": [
                "• Ricerche limitate (15/giorno)",
                "• Invio suggerimenti",
                "• Accesso community"
            ],
            "is_free": True
        },
        {
            "titolo": "Mensile",
            "prezzo": "0,99 €",
            "sottotitolo": "Al mese",
            "voci": [
                "• Ricerche IA illimitate",
                "• Inserimento bloopers",
                "• Segnalazione errori",
                "• Conferma/Contestazione",
                "• Sync Letterboxd & Download",
                "• Classifica e premi"
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
                "• Ricerche IA illimitate",
                "• Inserimento bloopers",
                "• Segnalazione errori",
                "• Conferma/Contestazione",
                "• Sync Letterboxd & Download",
                "• Classifica e premi"
            ],
            "price_id": price_ids.get("Annuale"),
            "is_subscription": True,
            "btn_label": "Scegli Annale",
            "btn_key": "btn_annuale"
        },
        {
            "titolo": "Lifetime Promo",
            "prezzo": "9,99 €",
            "sottotitolo": "Offerta Lancio",
            "voci": [
                "• Accesso a vita senza rinnovi",
                "• Funzioni Premium incluse",
                "• Classifica e premi dedicati"
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
                "• Accesso a vita senza rinnovi",
                "• Funzioni sbloccate",
                "• Vantaggi illimitati"
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
            # Usiamo st.container con bordo nativo di Streamlit per card pulite e stabili
            with st.container(border=True):
                st.subheader(piano["titolo"])
                st.markdown(f"### **{piano['prezzo']}**")
                st.caption(piano["sottotitolo"])
                st.divider()
                
                # Stampiamo le voci in modo pulito e nativo
                for voce in piano["voci"]:
                    st.markdown(f"<span style='font-size: 12px; color: #d1d5db;'>{voce}</span>", unsafe_allow_html=True)
                
                # Spaziatore verticale per spingere i pulsanti alla stessa altezza visiva
                st.markdown("<div style='margin-top: 20px;'></div>", unsafe_allow_html=True)
                
                if piano.get("is_free"):
                    st.info("Piano Attuale")
                else:
                    is_primary = (i == 3) # Evidenzia Lifetime Promo
                    if st.button(piano['btn_label'], use_container_width=True, key=piano['btn_key'], type="primary" if is_primary else "secondary"):
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