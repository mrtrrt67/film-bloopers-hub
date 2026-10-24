import streamlit as st
import stripe

def render_pricing(price_ids, user_email):
    """Renderizza la pagina dei piani con un layout a tabella comparativa pulita e allineata"""
    
    st.markdown("<h1 style='text-align: center; color: #f9fafc; font-weight: 800; margin-bottom: 5px;'>Scegli il tuo piano</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center; color: #9ca3af; margin-bottom: 30px;'>Confronta i piani e sblocca l'esperienza completa di FilmBloopers Hub.</p>", unsafe_allow_html=True)

    # Colonne per i 5 piani
    col0, col1, col2, col3, col4 = st.columns(5)
    cols = [col0, col1, col2, col3, col4]

    piani = [
        {
            "titolo": "Free",
            "prezzo": "0,00 €",
            "sottotitolo": "Gratuito",
            "btn_label": "Piano Attuale",
            "is_free": True,
            "caratteristiche": {
                "Ricerche IA": "15 / giorno",
                "Invio suggerimenti": "Sì",
                "Accesso Community": "Base",
                "Inserimento Bloopers": "—",
                "Segnalazione Errori": "—",
                "Conferma/Contestazione": "—",
                "Sync Letterboxd & Download": "—",
                "Classifica e Premi": "—"
            }
        },
        {
            "titolo": "Mensile",
            "prezzo": "0,99 €",
            "sottotitolo": "Al mese",
            "price_id": price_ids.get("Mensile"),
            "is_subscription": True,
            "btn_label": "Scegli Mensile",
            "caratteristiche": {
                "Ricerche IA": "Illimitate",
                "Invio suggerimenti": "Sì",
                "Accesso Community": "Completo",
                "Inserimento Bloopers": "Sì",
                "Segnalazione Errori": "Sì",
                "Conferma/Contestazione": "Sì",
                "Sync Letterboxd & Download": "Sì",
                "Classifica e Premi": "Sì"
            }
        },
        {
            "titolo": "Annuale",
            "prezzo": "9,99 €",
            "sottotitolo": "All'anno",
            "price_id": price_ids.get("Annuale"),
            "is_subscription": True,
            "btn_label": "Scegli Annuale",
            "caratteristiche": {
                "Ricerche IA": "Illimitate",
                "Invio suggerimenti": "Sì",
                "Accesso Community": "Completo",
                "Inserimento Bloopers": "Sì",
                "Segnalazione Errori": "Sì",
                "Conferma/Contestazione": "Sì",
                "Sync Letterboxd & Download": "Sì",
                "Classifica e Premi": "Sì"
            }
        },
        {
            "titolo": "Lifetime Promo",
            "prezzo": "9,99 €",
            "sottotitolo": "Offerta Lancio",
            "price_id": price_ids.get("Lifetime Promo"),
            "is_subscription": False,
            "btn_label": "Acquista Promo",
            "is_promo": True,
            "caratteristiche": {
                "Ricerche IA": "Illimitate",
                "Invio suggerimenti": "Sì",
                "Accesso Community": "Completo",
                "Inserimento Bloopers": "Sì",
                "Segnalazione Errori": "Sì",
                "Conferma/Contestazione": "Sì",
                "Sync Letterboxd & Download": "Sì",
                "Classifica e Premi": "Prioritari"
            }
        },
        {
            "titolo": "Lifetime Standard",
            "prezzo": "19,99 €",
            "sottotitolo": "Accesso a vita",
            "price_id": price_ids.get("Lifetime Standard"),
            "is_subscription": False,
            "btn_label": "Acquista Standard",
            "caratteristiche": {
                "Ricerche IA": "Illimitate",
                "Invio suggerimenti": "Sì",
                "Accesso Community": "Completo",
                "Inserimento Bloopers": "Sì",
                "Segnalazione Errori": "Sì",
                "Conferma/Contestazione": "Sì",
                "Sync Letterboxd & Download": "Sì",
                "Classifica e Premi": "Sì"
            }
        }
    ]

    # 1. RENDERING INTESTAZIONI E PULSANTI IN ALTO (Tutti perfettamente allineati)
    for i, piano in enumerate(piani):
        with cols[i]:
            with st.container(border=True):
                st.markdown(f"<div style='text-align: center;'><b>{piano['titolo']}</b><br><span style='color: #fb923c; font-size: 18px; font-weight: bold;'>{piano['prezzo']}</span><br><span style='font-size: 10px; color: #9ca3af;'>{piano['sottotitolo']}</span></div>", unsafe_allow_html=True)
                st.markdown("<div style='margin-top: 10px;'></div>", unsafe_allow_html=True)
                
                # Pulsante di scelta piano in alto
                if piano.get("is_free"):
                    st.button(piano['btn_label'], use_container_width=True, disabled=True, key=f"btn_col_{i}")
                else:
                    is_primary = piano.get("is_promo", False)
                    if st.button(piano['btn_label'], use_container_width=True, key=f"btn_col_{i}", type="primary" if is_primary else "secondary"):
                        if piano['price_id']:
                            url = create_checkout_session(piano['price_id'], piano['is_subscription'], user_email)
                            if url:
                                st.markdown(f'<meta http-equiv="refresh" content="0;url={url}">', unsafe_allow_html=True)
                        else:
                            st.error("ID Prezzo Stripe non configurato.")

    st.markdown("<div style='margin-top: 25px;'></div>", unsafe_allow_html=True)
    st.markdown("<h3 style='text-align: center; color: #f9fafc; font-size: 18px; margin-bottom: 15px;'>Dettaglio Funzionalità</h3>", unsafe_allow_html=True)

    # 2. TABELLA COMPARATIVA DELLE CARATTERISTICHE
    tutte_chiavi = list(piani[1]["caratteristiche"].keys())
    
    for chiave in tutte_chiavi:
        cols_riga = st.columns(5)
        for i, piano in enumerate(piani):
            valore = piano["caratteristiche"].get(chiave, "—")
            colore_valore = "#10b981" if valore in ["Sì", "Illimitate", "Prioritari", "Completo"] else ("#9ca3af" if valore != "—" else "#4b5563")
            with cols_riga[i]:
                st.markdown(f"""
                    <div style="background: rgba(17, 24, 39, 0.6); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 6px; padding: 10px; text-align: center; margin-bottom: 6px;">
                        <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">{chiave}</div>
                        <div style="font-size: 12px; font-weight: 600; color: {colore_valore};">{valore}</div>
                    </div>
                """, unsafe_allow_html=True)

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