import streamlit as st
from datetime import date
import time
from components.modals import ModalsComponent

def render_sidebar(supabase, is_promo_active, utente_corrente_e_admin, cb_naviga, cb_apri_modal, cb_logout, AMAZON_AFFILIATE_TAG, STRIPE_MONTHLY_URL, STRIPE_LIFETIME_URL):
    """
    Gestisce interamente il rendering, la navigazione, la ricerca e il blocco utente della barra laterale.
    Restituisce un dizionario o una tupla con i parametri di ricerca se l'utente ha avviato una ricerca.
    """
    btn_cerca = False
    btn_reset = False
    testo_titolo = ""
    testo_anno = ""
    testo_cast = ""

    with st.sidebar:
        # Logo con cornice 3D elegante
        st.image("images/Logo.png", use_container_width=True)
        st.markdown("---")

        def render_nav_btn(label, nome_sezione):
            st.button(
                label, 
                key=f"nav_{nome_sezione}", 
                width='stretch', 
                type="primary" if st.session_state.get("sezione_corrente") == nome_sezione else "secondary", 
                on_click=cb_naviga, 
                args=(nome_sezione,)
            )

        # Sezione Ricerca o Menu di Navigazione
        if st.session_state.get("sezione_corrente") == "🔍 Esplora e Cerca":
            st.markdown("<div style='margin-top: 10px; margin-bottom: 6px; padding-left: 8px;'><span style='color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;'>🔍 Ricerca</span></div>", unsafe_allow_html=True)
            st.button("🔙 Torna al Menu", key="btn_torna_menu", width='stretch', type="secondary", on_click=cb_naviga, args=("🏠 Home",))
            st.markdown("---")
            with st.form("form_ricerca"):
                st.markdown("<span style='font-size: 11px; color: #9ca3af;'>💡 <i>Digita il titolo e premi Invio</i></span>", unsafe_allow_html=True)
                testo_titolo = st.text_input("Titolo o saga:", value=st.session_state.get("termine_cercato", ""), label_visibility="collapsed", placeholder="Titolo o saga...")
                col_anno, col_cast = st.columns([1, 2])
                with col_anno: 
                    testo_anno = st.text_input("Anno:", placeholder="Es. 2010", label_visibility="collapsed")
                with col_cast: 
                    testo_cast = st.text_input("Regista/Attore:", placeholder="Es. Nolan", label_visibility="collapsed")
                
                col_btn1, col_btn2 = st.columns(2)
                with col_btn1: 
                    btn_cerca = st.form_submit_button("🔍 Cerca", width='stretch')
                with col_btn2: 
                    btn_reset = st.form_submit_button("🔄 Reset", width='stretch')
        else:
            st.markdown("""<div style="background: #111827; border: 1px solid #1f2937; border-radius: 10px; padding: 10px; margin-bottom: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);"><div style="color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; padding-left: 4px;">🧭 Navigazione</div>""", unsafe_allow_html=True)
            render_nav_btn("🏠 Home", "🏠 Home")
            render_nav_btn("🔍 Esplora e Cerca", "🔍 Esplora e Cerca")
            st.markdown("</div>", unsafe_allow_html=True)
            
            if st.session_state.get("user"):
                st.markdown("""<div style="background: #111827; border: 1px solid #1f2937; border-radius: 10px; padding: 10px; margin-bottom: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);"><div style="color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; padding-left: 4px;">✍️ Community</div>""", unsafe_allow_html=True)
                render_nav_btn("🏆 Classifica", "🏆 Classifica")
                render_nav_btn("✍️ Segnala un Errore", "✍️ Segnala un Errore")
                render_nav_btn("💬 Invia Suggerimento", "💬 Invia Suggerimento")
                st.markdown("</div>", unsafe_allow_html=True)
                
            user_tier = "free"
            if st.session_state.get("user"):
                if utente_corrente_e_admin(): 
                    user_tier = "admin"
                else:
                    try: 
                        user_tier = supabase.table("profiles").select("tier").eq("id", st.session_state.user.id).execute().data[0].get("tier", "free")
                    except: 
                        pass
                        
            if user_tier in ["premium", "admin"]:
                st.markdown("""<div style="background: #111827; border: 1px solid #1f2937; border-radius: 10px; padding: 10px; margin-bottom: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);"><div style="color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; padding-left: 4px;">⭐ Strumenti Pro</div>""", unsafe_allow_html=True)
                render_nav_btn("🔗 Sync Letterboxd", "🔗 Sync Letterboxd")
                render_nav_btn("📥 Esporta Archivio", "📥 Esporta Archivio")
                st.markdown("</div>", unsafe_allow_html=True)
                
            if utente_corrente_e_admin():
                st.markdown("""<div style="background: #111827; border: 1px solid #1f2937; border-radius: 10px; padding: 10px; margin-bottom: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);"><div style="color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; padding-left: 4px;">🛡️ Amministrazione</div>""", unsafe_allow_html=True)
                render_nav_btn("🛡️ Pannello Admin", "🛡️ Pannello Admin")
                st.markdown("</div>", unsafe_allow_html=True)
                
            with st.expander("⚖️ Note Legali", expanded=False):
                if st.button("🔒 Privacy Policy", width='stretch'): cb_apri_modal("privacy"); st.rerun()
                if st.button("📄 Termini di Servizio", width='stretch'): cb_apri_modal("tos"); st.rerun()
                if st.button("🍪 Cookie Policy", width='stretch'): cb_apri_modal("cookie"); st.rerun()
                if st.button("🛒 Affiliazione Amazon", width='stretch'): cb_apri_modal("amazon"); st.rerun()

        st.markdown("---")
        
        # Blocco Utente / Autenticazione in basso nella sidebar
        if "login_err" not in st.session_state: 
            st.session_state.login_err = ""
            
        if st.session_state.get("user") is None:
            rimanenti_guest = max(0, 6 - st.session_state.get("guest_calls", 0))
            st.markdown(f"""<div style="background: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 8px 10px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;"><span style="color: #9ca3af; font-weight: 500;">Ospite</span><span style="color: #fb923c; font-weight: 600;">👤 {rimanenti_guest}/6 gratis</span></div>""", unsafe_allow_html=True)
            if st.button("💎 Listino Piani", key="btn_popup_ospite"): 
                ModalsComponent.mostra_popup_premium(is_promo_active(), STRIPE_MONTHLY_URL, STRIPE_LIFETIME_URL, None)
            with st.expander("🔑 Accedi o Registrati", expanded=False):
                scelta_auth = st.radio("Azione", ["Accedi", "Registrati"], label_visibility="collapsed")
                if scelta_auth == "Accedi":
                    with st.form("form_login"):
                        em = st.text_input("Email")
                        pw = st.text_input("Password", type="password")
                        if st.form_submit_button("🔑 Login", width='stretch'):
                            login_ok = False
                            try:
                                res = supabase.auth.sign_in_with_password({"email": em, "password": pw})
                                if res.user:
                                    st.session_state.user = res.user
                                    st.session_state.access_token = res.session.access_token if res.session else None
                                    st.session_state.sessione_tracciata = False
                                    login_ok = True
                            except Exception:
                                st.error("Credenziali non valide.")
                            if login_ok: st.rerun()
                    
                    # --- RECUPERO PASSWORD INTEGRATO ---
                    with st.expander("🔑 Password dimenticata?"):
                        with st.form("form_recupero_pw"):
                            email_recupero = st.text_input("Inserisci la tua email", key="input_recupero_pw")
                            if st.form_submit_button("Invia email di ripristino", width='stretch'):
                                if email_recupero:
                                    try:
                                        supabase.auth.reset_password_for_email(email_recupero)
                                        st.success("Controlla la tua casella di posta per le istruzioni di reset.")
                                    except Exception as e:
                                        st.error(f"Errore durante l'invio: {e}")
                                else:
                                    st.warning("Inserisci prima un indirizzo email valido.")
                else:
                    with st.form("form_signup"):
                        em = st.text_input("Email")
                        pw = st.text_input("Password", type="password")
                        if st.form_submit_button("📝 Registrati", width='stretch'):
                            signup_ok = False
                            try:
                                res = supabase.auth.sign_up({"email": em, "password": pw})
                                if res.user: 
                                    supabase.table("profiles").insert({"id": res.user.id, "email": em, "tier": "premium" if is_promo_active() else "free", "tipo_abbonamento": "lifetime" if is_promo_active() else "nessuno"}).execute()
                                    signup_ok = True
                            except Exception:
                                st.error("Errore durante la registrazione.")
                            if signup_ok:
                                st.success("Registrato!")
                                time.sleep(0.5)
                                st.rerun()                        
        else:
            user_email = st.session_state.user.email
            tier, punti_utente, calls_today_val = "free", 0, 0
            is_admin = utente_corrente_e_admin()
            oggi = str(date.today())
            try:
                prof_res = supabase.table("profiles").select("tier, punti, calls_today, last_reset_date").eq("id", st.session_state.user.id).execute()
                if prof_res.data:
                    p_db = prof_res.data[0]
                    tier = p_db.get("tier", "free")
                    punti_utente = p_db.get("punti", 0) or 0
                    last_reset = str(p_db.get("last_reset_date", ""))[:10]
                    calls_db = p_db.get("calls_today", 0) or 0
                    if last_reset != oggi:
                        calls_today_val = 0
                        supabase.table("profiles").update({"calls_today": 0, "last_reset_date": oggi}).eq("id", st.session_state.user.id).execute()
                    else:
                        calls_today_val = calls_db
            except: 
                pass

            badge_text = "🛡️ Admin" if is_admin else ("⭐ Premium" if tier == "premium" else "📦 Free")
            sotto = f"🏆 {punti_utente} pts" if (is_admin or tier=="premium") else f"🏆 {punti_utente} pts | 🔍 {max(0, 15 - calls_today_val)}/15 oggi"
            
            st.markdown(f"""<div style="background: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; font-size: 11px;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;"><span style="color: #f9fafc; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;" title="{user_email}">{user_email}</span><span style="color: #facc15; font-weight: 600; white-space: nowrap;">{badge_text}</span></div><div style="display: flex; justify-content: space-between; align-items: center; color: #9ca3af; font-size: 10px;"><span>{sotto}</span></div></div>""", unsafe_allow_html=True)
            
            st.markdown("<div style='height: 4px;'></div>", unsafe_allow_html=True)
            
            col_act1, col_act2 = st.columns(2)
            with col_act1:
                if not is_admin and tier == "free":
                    if st.button("💎 Piani", width='stretch'): 
                        ModalsComponent.mostra_popup_premium(is_promo_active(), STRIPE_MONTHLY_URL, STRIPE_LIFETIME_URL, st.session_state.user)
                else:
                    st.markdown("")
            with col_act2:
                st.button("🚪 Esci", type="secondary", width='stretch', on_click=cb_logout)

    return btn_cerca, btn_reset, testo_titolo, testo_anno, testo_cast