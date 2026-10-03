import streamlit as st
from datetime import date, datetime, timedelta
import re

def render_classifica(supabase):
    # 1. Recupero configurazioni e soglie dinamiche dal database
    try:
        res_conf = supabase.table("configurazioni").select("chiave, valore, visibile").execute().data or []
        conf_dict = {c["chiave"]: c for c in res_conf}
    except:
        conf_dict = {}

    # Conversione dinamica delle soglie punti con fallback di sicurezza
    try:
        soglia_mensile = int(conf_dict.get("soglia_punti_mensile", {}).get("valore", "50"))
    except:
        soglia_mensile = 50

    try:
        soglia_lifetime = int(conf_dict.get("soglia_punti_lifetime", {}).get("valore", "10000"))
    except:
        soglia_lifetime = 10000

    # 2. Testi dinamici con sostituzione automatica dei segnaposti
    titolo_pagina = conf_dict.get("classifica_titolo", {}).get("valore", "Classifica Cacciatori di Bloopers")
    banner_titolo = conf_dict.get("classifica_banner_titolo", {}).get("valore", "Come funziona il sistema di punti e premi?")
    
    t1 = conf_dict.get("classifica_testo_1", {}).get("valore", "Contribuisci segnalando nuovi errori o facendo validare le tue segnalazioni dall'amministratore.")
    t2_raw = conf_dict.get("classifica_testo_2", {}).get("valore", "⭐ <b>Premio Mensile (Ogni {soglia_mensile} punti):</b> Ogni volta che accumuli {soglia_mensile} punti, sblocchi automaticamente <b>1 mese di abbonamento Premium gratuito</b>.")
    t3_raw = conf_dict.get("classifica_testo_3", {}).get("valore", "👑 <b>Premio Lifetime ({soglia_lifetime} punti):</b> Raggiungi la vetta della community arrivando a {soglia_lifetime} punti per sbloccare l'accesso <b>Lifetime gratuito a vita</b>!")

    t2 = t2_raw.replace("{soglia_mensile}", str(soglia_mensile))
    t3 = t3_raw.replace("{soglia_lifetime}", str(soglia_lifetime))

    st.subheader(f"🏆 {titolo_pagina}")
    
    banner_visibile = bool(conf_dict.get("classifica_banner_titolo", {}).get("visibile", True))
    if banner_visibile:
        st.markdown(f"""<div style="background: linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(15, 23, 42, 0.9) 100%); border: 1px solid rgba(59, 130, 246, 0.35); border-radius: 14px; padding: 20px; margin-bottom: 25px;"><h4 style="color: #60a5fa; margin-top: 0; margin-bottom: 10px;">📜 {banner_titolo}</h4><ul style="color: #cbd5e1; font-size: 13px; line-height: 1.6; margin-bottom: 0; padding-left: 20px;"><li><b>Guadagna punti:</b> {t1}</li><li>{t2}</li><li>{t3}</li></ul></div>""", unsafe_allow_html=True)

    try:
        users = supabase.table("profiles").select("*").order("punti", desc=True).limit(20).execute().data or []
        oggi = date.today()

        # 3. Assegnazione automatica e cumulativa dei premi
        for u in users:
            u_id = u.get("id")
            pts = int(u.get("punti", 0) or 0)
            tier_attuale = u.get("tier", "free")
            tipo_sub_attuale = u.get("tipo_abbonamento", "mensile")
            scadenza_attuale = u.get("data_scadenza")
            
            # Forziamo la conversione a intero per evitare conflitti di tipo
            mesi_gia_accreditati = int(u.get("mesi_accreditati", 0) or 0)

            # A. Controllo soglia Lifetime
            if pts >= soglia_lifetime:
                if tier_attuale != "premium" or tipo_sub_attuale != "lifetime":
                    supabase.table("profiles").update({
                        "tier": "premium",
                        "tipo_abbonamento": "lifetime",
                        "data_scadenza": None
                    }).eq("id", u_id).execute()
                    u["tier"] = "premium"
                    u["tipo_abbonamento"] = "lifetime"

            # B. Controllo soglia Mensile (con accumulo dinamico dei mesi)
            elif pts >= soglia_mensile:
                mesi_spettanti = pts // soglia_mensile
                
                # Se l'utente ha guadagnato nuovi mesi rispetto a quelli registrati
                if mesi_spettanti > mesi_gia_accreditati:
                    diff_mesi = mesi_spettanti - mesi_gia_accreditati
                    
                    # Determina la data di partenza per il calcolo della nuova scadenza
                    try:
                        if scadenza_attuale:
                            dt_scad = datetime.strptime(str(scadenza_attuale)[:10], "%Y-%m-%d").date()
                            base_date = dt_scad if dt_scad >= oggi else oggi
                        else:
                            base_date = oggi
                    except:
                        base_date = oggi

                    # Aggiunge 30 giorni per ogni mese sbloccato
                    nuova_scadenza = base_date + timedelta(days=30 * diff_mesi)

                    supabase.table("profiles").update({
                        "tier": "premium",
                        "tipo_abbonamento": "mensile",
                        "data_scadenza": str(nuova_scadenza),
                        "mesi_accreditati": mesi_spettanti
                    }).eq("id", u_id).execute()
                    
                    u["tier"] = "premium"
                    u["tipo_abbonamento"] = "mensile"
                    u["data_scadenza"] = str(nuova_scadenza)

        col_h1, col_h2, col_h3, col_h4 = st.columns([1, 3, 2, 2])
        col_h1.markdown("**Pos**"); col_h2.markdown("**Utente**"); col_h3.markdown("**Grado**"); col_h4.markdown("**Punti 🏆**")
        st.markdown("<hr style='margin: 4px 0; border-color: #334155;'>", unsafe_allow_html=True)
        
        for i, u in enumerate(users, 1):
            email_raw = u.get("email", "")
            if st.session_state.user and email_raw.lower() == st.session_state.user.email.lower(): 
                email_d = f"{email_raw} <b>(Tu)</b>"
            else: 
                email_d = (email_raw[:2]+"***@"+email_raw.split("@")[1]) if "@" in email_raw else "Utente"
            pts = u.get("punti", 0)
            
            # Grado dinamico allineato alle soglie del database
            if pts >= soglia_lifetime:
                grado = "👑 Leggenda"
            elif pts >= soglia_mensile:
                grado = "⭐ VIP"
            elif pts >= 20:
                grado = "🎬 Critico"
            else:
                grado = "🔍 Cacciatore"

            c1, c2, c3, c4 = st.columns([1, 3, 2, 2])
            c1.markdown(f"**{i}°**")
            c2.markdown(email_d, unsafe_allow_html=True)
            c3.markdown(f"<span style='color: #93c5fd; font-size: 12px;'>{grado}</span>", unsafe_allow_html=True)
            c4.markdown(f"**{pts}** pt")
            st.markdown("<hr style='margin: 4px 0; border-color: #1e293b;'>", unsafe_allow_html=True)
    except Exception as e: 
        st.error(f"Errore caricamento classifica: {e}")   

def render_segnala_errore(supabase, tutti_i_film):
    st.subheader("✍️ Invia una nuova segnalazione")
    st.caption("Le segnalazioni vengono inviate in moderazione.")
    fd = {f["titolo"]: f["id"] for f in tutti_i_film}
    with st.form("fs"):
        f_s = st.selectbox("Film di riferimento:", list(fd.keys()) if fd else ["Nessun film"])
        m = st.text_input("Minuto esatto (es. 01:14:25):", placeholder="Es. 01:14:25 o 45")
        c = st.selectbox("Categoria:", ["Errori di scena / Posizione", "Troupe o microfoni visibili", "Anacronismi", "Errori storici o fattuali"])
        d = st.text_area("Descrizione dettagliata:")
        
        if st.form_submit_button("Invia alla Moderazione") and st.session_state.user:
            m_pulito = m.strip()
            
            if not m_pulito:
                m_pulito = "00:00"
            
            if not re.match(r'^[0-9:]+$', m_pulito):
                st.error("❌ Formato minuto non valido! Puoi inserire solo numeri e due punti (es. 01:14:25).")
            else:
                supabase.table("errori").insert({
                    "film_id": fd[f_s], 
                    "minuto": m_pulito, 
                    "categoria": c, 
                    "descrizione": d, 
                    "approvato": False, 
                    "inserito_da": st.session_state.user.email,
                    "provenienza": "utente"
                }).execute()
                st.success("✅ Segnalazione inviata con successo!")

def render_suggerimenti(supabase):
    st.subheader("💬 Invia un Suggerimento o Feedback")
    with st.form("fsg"):
        msg = st.text_area("Le tue idee o suggerimenti:")
        if st.form_submit_button("Invia Suggerimento", use_container_width=True) and st.session_state.user:
            supabase.table("suggerimenti").insert({
                "user_id": st.session_state.user.id, 
                "email": st.session_state.user.email, 
                "messaggio": msg
            }).execute()
            st.success("✅ Suggerimento inviato con successo!")