import streamlit as st
import stripe

def render_pricing(price_ids, user_email):
    """Renderizza la pagina dedicata ai piani e agli abbonamenti Stripe"""
    st.markdown("<h1 style='text-align: center;'>Scegli il tuo piano</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center; color: gray;'>Sblocca ricerche IA illimitate, sincronizzazione automatica Letterboxd e download completo dell'archivio.</p>", unsafe_allow_html=True)
    st.write("")

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.markdown("### Mensile")
        st.markdown("### **0,99 €**")
        st.markdown("Al mese")
        st.write("---")
        st.markdown("- Ricerche IA illimitate\n- Sync Letterboxd\n- Download archivio")
        if st.button("Scegli Mensile", use_container_width=True, key="btn_mensile"):
            url = create_checkout_session(price_ids["Mensile"], user_email)
            if url:
                st.markdown(f'<meta http-equiv="refresh" content="0;url={url}">', unsafe_allow_html=True)

    with col2:
        st.markdown("### Annuale")
        st.markdown("### **9,99 €**")
        st.markdown("All'anno")
        st.write("---")
        st.markdown("- Ricerche IA illimitate\n- Sync Letterboxd\n- Download archivio")
        if st.button("Scegli Annuale", use_container_width=True, key="btn_annuale"):
            url = create_checkout_session(price_ids["Annuale"], user_email)
            if url:
                st.markdown(f'<meta http-equiv="refresh" content="0;url={url}">', unsafe_allow_html=True)

    with col3:
        st.markdown("### Lifetime Promo")
        st.markdown("### **9,99 €**")
        st.markdown("Offerta Lancio")
        st.write("---")
        st.markdown("- Per sempre senza rinnovi\n- Vantaggi Premium inclusi")
        if st.button("Acquista Promo", use_container_width=True, key="btn_promo"):
            url = create_checkout_session(price_ids["Lifetime Promo"], user_email)
            if url:
                st.markdown(f'<meta http-equiv="refresh" content="0;url={url}">', unsafe_allow_html=True)

    with col4:
        st.markdown("### Lifetime Standard")
        st.markdown("### **19,99 €**")
        st.markdown("Accesso a vita")
        st.write("---")
        st.markdown("- Per sempre senza rinnovi\n- Tutte le funzioni sbloccate")
        if st.button("Acquista Standard", use_container_width=True, key="btn_standard"):
            url = create_checkout_session(price_ids["Lifetime Standard"], user_email)
            if url:
                st.markdown(f'<meta http-equiv="refresh" content="0;url={url}">', unsafe_allow_html=True)

def create_checkout_session(price_id, user_email):
    """Funzione di supporto per creare la sessione Stripe"""
    try:
        mode = "subscription" if price_id in [st.secrets.get("STRIPE_PRICE_MONTHLY"), st.secrets.get("STRIPE_PRICE_YEARLY")] else "payment"
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
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