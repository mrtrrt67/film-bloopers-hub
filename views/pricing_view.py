import streamlit as st
import stripe

def render_pricing(price_ids, user_email):
    """Renderizza la pagina dedicata ai piani e agli abbonamenti Stripe con card in stile glassmorphic allineate"""
    
    st.markdown("<h1 style='text-align: center; color: #f9fafc; font-weight: 800; margin-bottom: 5px;'>Scegli il tuo piano</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center; color: #9ca3af; margin-bottom: 30px;'>Sblocca ricerche IA illimitate, sincronizzazione automatica Letterboxd e download completo dell'archivio.</p>", unsafe_allow_html=True)

    col1, col2, col3, col4 = st.columns(4)

    piani = [
        {
            "titolo": "Mensile",
            "prezzo": "0,99 €",
            "sottotitolo": "Al mese",
            "caratteristiche": "• Ricerche IA illimitate<br>• Sync Letterboxd<br>• Download archivio",
            "price_id": price_ids.get("Mensile"),
            "is_subscription": True,
            "btn_label": "Scegli Mensile",
            "btn_key": "btn_mensile"
        },
        {
            "titolo": "Annuale",
            "prezzo": "9,99 €",
            "sottotitolo": "All'anno",
            "caratteristiche": "• Ricerche IA illimitate<br>• Sync Letterboxd<br>• Download archivio",
            "price_id": price_ids.get("Annuale"),
            "is_subscription": True,
            "btn_label": "Scegli Annuale",
            "btn_key": "btn_annuale"
        },
        {
            "titolo": "Lifetime Promo",
            "prezzo": "9,99 €",
            "sottotitolo": "Offerta Lancio",
            "caratteristiche": "• Per sempre senza rinnovi<br>• Vantaggi Premium inclusi",
            "price_id": price_ids.get("Lifetime Promo"),
            "is_subscription": False,
            "btn_label": "Acquista Promo",
            "btn_key": "btn_promo"
        },
        {
            "titolo": "Lifetime Standard",
            "prezzo": "19,99 €",
            "sottotitolo": "Accesso a vita",
            "caratteristiche": "• Per sempre senza rinnovi<br>• Tutte le funzioni sbloccate",
            "price_id": price_ids.get("Lifetime Standard"),
            "is_subscription": False,
            "btn_label": "Acquista Standard",
            "btn_key": "btn_standard"
        }
    ]

    cols = [col1, col2, col3, col4]

    for i, piano in enumerate(piani):
        with cols[i]:
            st.markdown(f"""
                <div style="background: rgba(17, 24, 39, 0.90); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; padding: 22px; text-align: center; margin-bottom: 12px; min-height: 280px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);">
                    <div>
                        <h3 style="color: #f9fafc; font-size: 18px; margin-bottom: 5px;">{piano['titolo']}</h3>
                        <h2 style="color: #fb923c; font-size: 26px; font-weight: 800; margin: 10px 0;">{piano['prezzo']}</h2>
                        <p style="color: #9ca3af; font-size: 12px; margin-bottom: 15px;">{piano['sottotitolo']}</p>
                        <hr style="border-color: rgba(255,255,255,0.08); margin: 10px 0;">
                        <div style="color: #d1d5db; font-size: 13px; text-align: left; line-height: 1.6; margin-bottom: 15px;">
                            {piano['caratteristiche']}
                        </div>
                    </div>
                </div>
            """, unsafe_allow_html=True)
            
            if st.button(piano['btn_label'], use_container_width=True, key=piano['btn_key'], type="primary" if i == 2 else "secondary"):
                if piano['price_id']:
                    url = create_checkout_session(piano['price_id'], piano['is_subscription'], user_email)
                    if url:
                        st.markdown(f'<meta http-equiv="refresh" content="0;url={url}">', unsafe_allow_html=True)
                else:
                    st.error("ID Prezzo Stripe non configurato.")

def create_checkout_session(price_id, is_subscription, user_email):
    """Crea la sessione di checkout Stripe senza parametri deprecati"""
    try:
        mode = "subscription" if is_subscription else "payment"
        checkout_session = stripe.checkout.Session.create(
            line_items=[{"price": price_id, "quantity": 1}],
            mode=mode,
            success_url="https://filmbloopers.online/?success=true",
            cancel_url="https://filmbloopers.online/?canceled=true",
            customer_email=user_email,
        )
        return checkout_session.url
    except Exception as e:
        st.error(f"Errore durante la creazione del pagamento: {e}")
        return None