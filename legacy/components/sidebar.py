from datetime import date
import time
from components.modals import ModalsComponent
import streamlit as st


def render_sidebar(
    supabase,
    is_promo_active,
    utente_corrente_e_admin,
    cb_naviga,
    cb_apri_modal,
    cb_logout,
    AMAZON_AFFILIATE_TAG,
    STRIPE_MONTHLY_URL,
    STRIPE_LIFETIME_URL,
):
  btn_cerca = False
  testo_titolo = ""
  testo_anno = ""
  testo_cast = ""

  with st.sidebar:
    # --- LOGO VETTORIALE SU SINGOLA RIGA (ANTI-BUG MARKDOWN) ---
    st.markdown(
        '<div style="text-align: center; margin-bottom: 25px; padding-top:'
        ' 15px;"><svg xmlns="http://www.w3.org/2000/svg" width="54" height="54"'
        ' viewBox="0 0 24 24" fill="none" stroke="#f9fafc" stroke-width="1.2"'
        ' stroke-linecap="round" stroke-linejoin="round" style="filter:'
        ' drop-shadow(0px 4px 10px rgba(0,0,0,0.4)); margin-bottom: 8px;"><path'
        ' d="M4 11V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2"></path><path d="M4 11v8a2'
        ' 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8H4Z"></path><path d="m4 11'
        ' 4-4"></path><path d="m8 11 4-4"></path><path d="m12 11'
        ' 4-4"></path><path d="m16 11 4-4"></path></svg><h2 style="color:'
        ' #f9fafc; font-size: 24px; font-weight: 300; margin: 0; letter-spacing:'
        ' 1px;">Film<strong style="font-weight:'
        ' 800;">Bloopers</strong></h2><div style="width: 25px; height: 2px;'
        ' background: #fb923c; margin: 8px auto 0 auto; border-radius: 2px;'
        ' box-shadow: 0 0 8px rgba(251, 146, 60, 0.6);"></div></div>',
        unsafe_allow_html=True,
    )
    st.markdown("---")

    def render_nav_btn(label, nome_sezione):
      st.button(
          label,
          key=f"nav_{nome_sezione}",
          use_container_width=True,
          type=(
              "primary"
              if st.session_state.get("sezione_corrente") == nome_sezione
              else "secondary"
          ),
          on_click=cb_naviga,
          args=(nome_sezione,),
      )

    if st.session_state.get("sezione_corrente") == "Esplora e Cerca":
      st.button(
          "Torna a Home",
          key="btn_torna_menu",
          use_container_width=True,
          type="secondary",
          on_click=cb_naviga,
          args=("Home",),
      )
      st.markdown("<div style='margin-top: 20px;'></div>", unsafe_allow_html=True)

      # --- RICERCA CON FORM (Supporto Tasto Invio) ---
      st.markdown(
          "<p style='font-size: 13px; color: #f9fafc; font-weight: 600;"
          " margin-bottom: 10px;'>Ricerca Intelligente</p>",
          unsafe_allow_html=True,
      )

      with st.form("form_ricerca_sidebar", border=False):
        testo_titolo = st.text_input(
            "Titolo o saga:",
            label_visibility="collapsed",
            placeholder="Titolo film o saga...",
        )

        col_anno, col_cast = st.columns(2)
        with col_anno:
          testo_anno = st.text_input(
              "Anno:", placeholder="Anno", label_visibility="collapsed"
          )
        with col_cast:
          testo_cast = st.text_input(
              "Regista/Attore:",
              placeholder="Regista/Attore",
              label_visibility="collapsed",
          )

        st.markdown(
            "<div style='margin-top: 8px;'></div>", unsafe_allow_html=True
        )

        # Il form_submit_button scatta premendo Invio in uno dei campi
        btn_cerca = st.form_submit_button(
            "Cerca Film", use_container_width=True, type="primary"
        )
    else:
      with st.expander("Navigazione Principale", expanded=True):
        render_nav_btn("Home", "Home")
        render_nav_btn("Esplora e Cerca", "Esplora e Cerca")

        # Stile CSS aggressivo e mirato per forzare il colore verde smeraldo sul pulsante Premium
        st.markdown("""
            <style>
            div[data-testid="stSidebar"] button:has(div:text("Premium")),
            div[data-testid="stSidebar"] button:has(p:text("Premium")),
            div[data-testid="stSidebar"] button[kind="secondary"]:has(div),
            div[data-testid="stSidebar"] button {
                /* Seleziona il bottone specifico della sezione Premium */
            }
            /* Selettore mirato basato sull'etichetta del testo all'interno dei bottoni della sidebar */
            div[data-testid="stSidebar"] button p, div[data-testid="stSidebar"] button div {
                color: inherit;
            }
            /* Forza il colore verde per il bottone Premium ovunque si trovi nella sidebar */
            div[data-testid="stSidebar"] button[key="nav_Premium"] {
                border: 1px solid #10b981 !important;
                color: #10b981 !important;
            }
            div[data-testid="stSidebar"] button[key="nav_Premium"] p {
                color: #10b981 !important;
            }
            </style>
        """, unsafe_allow_html=True)
        render_nav_btn("Premium", "Premium")
        
      if st.session_state.get("user"):
        with st.expander("Community", expanded=True):
          render_nav_btn("Classifica", "Classifica")
          render_nav_btn("Segnala un Errore", "Segnala un Errore")
          render_nav_btn("Invia Suggerimento", "Invia Suggerimento")

      user_tier = "free"
      if st.session_state.get("user"):
        if utente_corrente_e_admin():
          user_tier = "admin"
        else:
          try:
            user_tier = (
                supabase.table("profiles")
                .select("tier")
                .eq("id", st.session_state.user.id)
                .execute()
                .data[0]
                .get("tier", "free")
            )
          except:
            pass

      if user_tier in ["premium", "admin"]:
        with st.expander("Strumenti Pro", expanded=False):
          render_nav_btn("Sync Letterboxd", "Sync Letterboxd")
          render_nav_btn("Esporta Archivio", "Esporta Archivio")

      if utente_corrente_e_admin():
        with st.expander("Amministrazione", expanded=False):
          render_nav_btn("Pannello Admin", "Pannello Admin")

    st.markdown("---")

    if "login_err" not in st.session_state:
      st.session_state.login_err = ""

    if st.session_state.get("user") is None:
      rimanenti_guest = max(0, 6 - st.session_state.get("guest_calls", 0))

      st.markdown(
          f"""<div class="glass-container" style="padding: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;"><span style="color: #9ca3af; font-weight: 500;">Ospite</span><span style="color: #fb923c; font-weight: 600;">{rimanenti_guest}/6 gratis</span></div>""",
          unsafe_allow_html=True,
      )

      with st.expander("Accedi o Registrati", expanded=False):
        scelta_auth = st.radio(
            "Azione",
            ["Accedi", "Registrati", "Recupera Password"],
            label_visibility="collapsed",
        )

        if scelta_auth == "Accedi":
          with st.form("form_accedi", border=False):
            em = st.text_input(
                "Email", placeholder="tua@email.com", key="inp_login_email"
            )
            pw = st.text_input(
                "Password",
                type="password",
                placeholder="••••••••",
                key="inp_login_pw",
            )
            if st.form_submit_button("Login", use_container_width=True):
              login_ok = False
              try:
                res = supabase.auth.sign_in_with_password(
                    {"email": em, "password": pw}
                )
                if res.user:
                  st.session_state.user = res.user
                  st.session_state.access_token = (
                      res.session.access_token if res.session else None
                  )
                  st.session_state.sessione_tracciata = False
                  login_ok = True
              except Exception:
                st.error("Credenziali non valide.")
              if login_ok:
                st.rerun()

        elif scelta_auth == "Recupera Password":
          st.markdown(
              "<span style='font-size: 11px; color: #9ca3af;'>Inserisci"
              " l'email per ricevere il link.</span>",
              unsafe_allow_html=True,
          )
          with st.form("form_recupero", border=False):
            email_recupero = st.text_input(
                "Tua Email", placeholder="tua@email.com", key="inp_reset_email"
            )
            if st.form_submit_button(
                "Invia Email di Recupero", use_container_width=True
            ):
              if email_recupero:
                try:
                  supabase.auth.reset_password_for_email(
                      email_recupero,
                      options={
                          "email_redirect_to": (
                              "https://mrtrrt67.github.io/film-bloopers-hub/reset.html"
                          )
                      },
                  )
                  st.success("Email inviata! Controlla la posta.")
                except Exception as e:
                  st.error(f"Errore: {e}")
              else:
                st.warning("Inserisci l'email.")
        else:
          with st.form("form_registrazione", border=False):
            em = st.text_input(
                "Email", placeholder="tua@email.com", key="inp_signup_email"
            )
            pw = st.text_input(
                "Password",
                type="password",
                placeholder="••••••••",
                key="inp_signup_pw",
            )
            if st.form_submit_button("Registrati", use_container_width=True):
              signup_ok = False
              try:
                res = supabase.auth.sign_up({"email": em, "password": pw})
                if res.user:
                  supabase.table("profiles").insert({
                      "id": res.user.id,
                      "email": em,
                      "tier": "premium" if is_promo_active() else "free",
                      "tipo_abbonamento": (
                          "lifetime" if is_promo_active() else "nessuno"
                      ),
                  }).execute()
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
        prof_res = (
            supabase.table("profiles")
            .select("tier, punti, calls_today, last_reset_date")
            .eq("id", st.session_state.user.id)
            .execute()
        )
        if prof_res.data:
          p_db = prof_res.data[0]
          tier = p_db.get("tier", "free")
          punti_utente = p_db.get("punti", 0) or 0
          last_reset = str(p_db.get("last_reset_date", ""))[:10]
          calls_db = p_db.get("calls_today", 0) or 0
          if last_reset != oggi:
            calls_today_val = 0
            supabase.table("profiles").update(
                {"calls_today": 0, "last_reset_date": oggi}
            ).eq("id", st.session_state.user.id).execute()
          else:
            calls_today_val = calls_db
      except:
        pass

      badge_text = (
          "Admin"
          if is_admin
          else ("Premium" if tier == "premium" else "Free")
      )
      sotto = (
          f"{punti_utente} pts"
          if (is_admin or tier == "premium")
          else f"{punti_utente} pts | {max(0, 15 - calls_today_val)}/15 oggi"
      )

      st.markdown(
          f"""<div class="glass-container" style="padding: 10px; margin-bottom: 12px; font-size: 11px;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;"><span style="color: #f9fafc; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;" title="{user_email}">{user_email}</span><span style="color: #facc15; font-weight: 600; white-space: nowrap;">{badge_text}</span></div><div style="display: flex; justify-content: space-between; align-items: center; color: #9ca3af; font-size: 10px;"><span>{sotto}</span></div></div>""",
          unsafe_allow_html=True,
      )

      with st.expander("Azioni Account", expanded=False):
        col_act1, col_act2 = st.columns(2)
        with col_act1:
          if not is_admin and tier == "free":
            if st.button("Piani", use_container_width=True):
              ModalsComponent.mostra_popup_premium(
                  is_promo_active(),
                  STRIPE_MONTHLY_URL,
                  STRIPE_LIFETIME_URL,
                  st.session_state.user,
              )
          else:
            st.button("Piani", use_container_width=True, disabled=True)
        with col_act2:
          st.button(
              "Esci", type="secondary", use_container_width=True, on_click=cb_logout
          )

  return btn_cerca, False, testo_titolo, testo_anno, testo_cast