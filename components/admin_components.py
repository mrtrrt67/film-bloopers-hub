import streamlit as st
import pandas as pd
from datetime import date, datetime, timedelta

class AdminComponent:
    @staticmethod
    def render_admin_panel(supabase, tutti_i_film, amazon_dashboard_url, cb_approva, cb_rifiuta, cb_salva_corr, cb_elimina_blooper, cb_ignora_cont):
        st.subheader("🔒 Area Riservata Amministratore")
        
        # Mappa dei film in memoria per accesso istantaneo
        film_dict = {f.get('id'): f.get('titolo', 'Film') for f in tutti_i_film}

        # Tabs ridotte ed unificate
        tab_stats, tab_utenti, tab_film, tab_sugg, tab_testi, tab_mod = st.tabs([
            "📊 Traffico & Statistiche", 
            "👥 Gestione Utenti", 
            "📋 Archivio Film", 
            "💬 Suggerimenti", 
            "📝 Testi, Promo & Visibilità",
            "⚠️ Moderazione & Segnalazioni"
        ])
        
        with tab_stats:
            st.markdown("### 📊 Console Traffico in Tempo Reale")
            
            # --- 1. METRICHE UTENTI ---
            try:
                prof_res = supabase.table("profiles").select("tier, calls_today, last_reset_date").execute()
                tutti_profili = prof_res.data if prof_res.data else []
                totale_utenti = len(tutti_profili)
                utenti_free = sum(1 for p in tutti_profili if p.get("tier") == "free")
                utenti_premium = sum(1 for p in tutti_profili if p.get("tier") == "premium")
            except: 
                totale_utenti, utenti_free, utenti_premium = 0, 0, 0

            # --- 2. METRICHE INTELLIGENZA ARTIFICIALE (SOLO OGGI) ---
            try:
                periodo_storico = (datetime.utcnow() - timedelta(days=30)).isoformat() + "Z"
                stat_ia = supabase.table("statistiche_ia").select("*").gte("data_chiamata", periodo_storico).execute().data or []
                err_ia = supabase.table("log_errori_ia").select("*").gte("created_at", periodo_storico).order("created_at", desc=True).execute().data or []
                
                df_succ_m = pd.DataFrame(stat_ia) if stat_ia else pd.DataFrame()
                df_err_m = pd.DataFrame(err_ia) if err_ia else pd.DataFrame()
                
                oggi_str = datetime.now().strftime('%d/%m/%Y')
                
                if not df_succ_m.empty and 'data_chiamata' in df_succ_m.columns:
                    df_succ_m['dt'] = pd.to_datetime(df_succ_m['data_chiamata'], utc=True).dt.tz_convert('Europe/Rome')
                    df_succ_m['giorno'] = df_succ_m['dt'].dt.strftime('%d/%m/%Y')
                    chiamate_riuscite_oggi = len(df_succ_m[df_succ_m['giorno'] == oggi_str])
                else:
                    chiamate_riuscite_oggi = 0

                if not df_err_m.empty and 'created_at' in df_err_m.columns:
                    df_err_m['dt'] = pd.to_datetime(df_err_m['created_at'], utc=True).dt.tz_convert('Europe/Rome')
                    df_err_m['giorno'] = df_err_m['dt'].dt.strftime('%d/%m/%Y')
                    errori_ia_oggi = len(df_err_m[df_err_m['giorno'] == oggi_str])
                else:
                    errori_ia_oggi = 0

            except Exception:
                stat_ia, err_ia, chiamate_riuscite_oggi, errori_ia_oggi = [], [], 0, 0

            col_m1, col_m2, col_m3, col_m4, col_m5, col_m6 = st.columns(6)
            col_m1.metric("👥 Utenti", totale_utenti)
            col_m2.metric("📦 Free", utenti_free)
            col_m3.metric("⭐ Premium", utenti_premium)
            col_m4.metric("🤖 IA Riuscite (Oggi)", chiamate_riuscite_oggi)
            col_m5.metric("⚠️ Errori IA (Oggi)", errori_ia_oggi)
            col_m6.metric("🎬 Film", len(tutti_i_film))
            
            st.markdown("---")
            
            # --- 3. PROSPETTO ANALITICO GIORNALIERO PER MODELLO (CON TOTALE) ---
            st.markdown("#### 🤖 Prospetto Prestazioni IA Giornaliero per Modello")
            try:
                df_succ = pd.DataFrame(stat_ia) if stat_ia else pd.DataFrame(columns=['data_chiamata', 'modello'])
                df_err = pd.DataFrame(err_ia) if err_ia else pd.DataFrame(columns=['created_at', 'modello'])

                if not df_succ.empty:
                    df_succ['dt'] = pd.to_datetime(df_succ['data_chiamata'], utc=True).dt.tz_convert('Europe/Rome')
                    df_succ['giorno_sort'] = df_succ['dt'].dt.normalize()
                    df_succ['giorno'] = df_succ['dt'].dt.strftime('%d/%m/%Y')
                else:
                    df_succ['giorno'] = []
                    df_succ['giorno_sort'] = []
                    df_succ['modello'] = []

                if not df_err.empty:
                    df_err['dt'] = pd.to_datetime(df_err['created_at'], utc=True).dt.tz_convert('Europe/Rome')
                    df_err['giorno_sort'] = df_err['dt'].dt.normalize()
                    df_err['giorno'] = df_err['dt'].dt.strftime('%d/%m/%Y')
                else:
                    df_err['giorno'] = []
                    df_err['giorno_sort'] = []
                    df_err['modello'] = []

                s_group = df_succ.groupby(['giorno', 'giorno_sort', 'modello']).size().reset_index(name='Riuscite') if not df_succ.empty and 'modello' in df_succ.columns else pd.DataFrame(columns=['giorno', 'giorno_sort', 'modello', 'Riuscite'])
                e_group = df_err.groupby(['giorno', 'giorno_sort', 'modello']).size().reset_index(name='Fallite') if not df_err.empty and 'modello' in df_err.columns else pd.DataFrame(columns=['giorno', 'giorno_sort', 'modello', 'Fallite'])

                if not s_group.empty or not e_group.empty:
                    df_prospetto = pd.merge(s_group, e_group, on=['giorno', 'giorno_sort', 'modello'], how='outer').fillna(0)
                    df_prospetto['Riuscite'] = df_prospetto['Riuscite'].astype(int)
                    df_prospetto['Fallite'] = df_prospetto['Fallite'].astype(int)
                    df_prospetto['Totale Richieste'] = df_prospetto['Riuscite'] + df_prospetto['Fallite']
                    
                    df_prospetto['Tasso di Successo (%)'] = df_prospetto.apply(
                        lambda row: round((row['Riuscite'] / row['Totale Richieste']) * 100, 2) if row['Totale Richieste'] > 0 else 0.0,
                        axis=1
                    )
                    df_prospetto = df_prospetto.sort_values(by=['giorno_sort', 'Totale Richieste'], ascending=[False, False])
                    
                    tot_riusc = df_prospetto['Riuscite'].sum()
                    tot_fall = df_prospetto['Fallite'].sum()
                    tot_rich = df_prospetto['Totale Richieste'].sum()
                    tasso_tot = round((tot_riusc / tot_rich) * 100, 2) if tot_rich > 0 else 0.0

                    df_totale_row = pd.DataFrame({
                        'giorno': ['TOTALE GENERALE'],
                        'giorno_sort': [pd.NaT],
                        'modello': ['Tutti i modelli'],
                        'Riuscite': [tot_riusc],
                        'Fallite': [tot_fall],
                        'Totale Richieste': [tot_rich],
                        'Tasso di Successo (%)': [tasso_tot]
                    })
                    
                    df_prospetto = pd.concat([df_prospetto, df_totale_row], ignore_index=True)
                    df_prospetto = df_prospetto.drop(columns=['giorno_sort'])
                    df_prospetto = df_prospetto.rename(columns={'giorno': 'Data', 'modello': 'Modello'})
                    
                    colonne_ord = ['Data', 'Modello', 'Riuscite', 'Fallite', 'Totale Richieste', 'Tasso di Successo (%)']
                    df_prospetto = df_prospetto[[c for c in colonne_ord if c in df_prospetto.columns]]
                    
                    def highlight_totale(row):
                        if row['Data'] == 'TOTALE GENERALE':
                            return ['background-color: #1e3a8a; font-weight: bold; color: #f8fafc;' for _ in row]
                        return ['' for _ in row]

                    st.dataframe(
                        df_prospetto.style
                        .format({'Tasso di Successo (%)': '{:.2f}'})
                        .apply(highlight_totale, axis=1), 
                        width='stretch', 
                        hide_index=True
                    )
                else:
                    st.info("Nessun dato di utilizzo IA registrato di recente.")
            except Exception as e:
                st.info("Impossibile generare il prospetto giornaliero per modello.")

            st.markdown("<br>", unsafe_allow_html=True)
            
            # --- 4. TABELLA UTILIZZO MODELLI PER GIORNO ---
            st.markdown("#### 📅 Utilizzo Modelli per Giorno (Ultimi 30g)")
            if stat_ia:
                df_stat = pd.DataFrame(stat_ia)
                df_stat['dt'] = pd.to_datetime(df_stat['data_chiamata'], utc=True).dt.tz_convert('Europe/Rome')
                df_stat['giorno_sort'] = df_stat['dt'].dt.normalize()
                df_stat['giorno'] = df_stat['dt'].dt.strftime('%d/%m/%Y')
                
                df_pivot = df_stat.pivot_table(
                    index=['giorno', 'giorno_sort'],
                    columns='modello',
                    values='tempo_esecuzione',
                    aggfunc='count',
                    fill_value=0
                ).reset_index()
                
                cols_modelli = [c for c in df_pivot.columns if c not in ['giorno', 'giorno_sort']]
                df_pivot['Totale'] = df_pivot[cols_modelli].sum(axis=1)
                df_pivot = df_pivot.sort_values(by='giorno_sort', ascending=False).drop(columns=['giorno_sort'])
                df_pivot = df_pivot.rename(columns={'giorno': 'Data'})
                
                colonne_ordinate = ['Data', 'Totale'] + [c for c in df_pivot.columns if c not in ['Data', 'Totale']]
                df_pivot = df_pivot[colonne_ordinate]
                
                st.dataframe(df_pivot, width='stretch', hide_index=True)
            else:
                st.info("Nessuna chiamata all'IA registrata di recente.")
                
            st.markdown("<br>", unsafe_allow_html=True)
            
            st.markdown(f"#### ⚠️ Log Errori IA (Ultimi {len(err_ia)})")
            if err_ia:
                df_err = pd.DataFrame(err_ia)
                df_err['created_at'] = pd.to_datetime(df_err['created_at'], utc=True).dt.tz_convert('Europe/Rome').dt.strftime('%d/%m %H:%M')
                df_err = df_err[['created_at', 'utente', 'film', 'modello', 'errore_dettaglio']]
                df_err.columns = ['Data', 'Utente', 'Film', 'Tipo Errore / Modello', 'Dettaglio Tecnico']
                st.dataframe(df_err, width='stretch', hide_index=True)
            else:
                st.success("Nessun errore IA registrato! 🎉")

            st.markdown("---")
            st.markdown("### 🛒 Dashboard Affiliazioni Amazon")
            st.link_button("📊 Apri Dashboard Amazon Affiliati", amazon_dashboard_url)
            st.markdown("---")
            
            col_st1, col_st2 = st.columns(2)
            
            with col_st1:
                st.markdown("#### 🎬 Film / Saghe più cercati")
                try:
                    res_ric = supabase.table("log_ricerche").select("termine, created_at").order("created_at", desc=True).execute()
                    termini = res_ric.data if res_ric.data else []
                    if termini:
                        df_ric = pd.DataFrame(termini)
                        df_ric['termine'] = df_ric['termine'].astype(str).str.title().str.strip()
                        top_ric = df_ric.groupby('termine').agg(Ricerche=('termine', 'count'), Ultima_Ricerca=('created_at', 'max')).reset_index()
                        top_ric = top_ric.sort_values(by=['Ricerche', 'Ultima_Ricerca'], ascending=[False, False])
                        df_mostra = top_ric[['termine', 'Ricerche']].head(10)
                        df_mostra.columns = ['Termine di Ricerca', 'Ricerche']
                        st.dataframe(df_mostra, width='stretch', hide_index=True)
                    else:
                        st.info("Nessuna ricerca registrata al momento.")
                except Exception:
                    pass  
                    
            with col_st2:
                st.markdown("#### 🔥 Bloopers più votati / discussi")
                try:
                    err_res = supabase.table("errori").select("id, minuto, descrizione, film_id, creato_il").eq("approvato", True).execute()
                    tutti_errori = err_res.data if err_res.data else []
                    
                    if tutti_errori:
                        voti_res = supabase.table("voti_bloopers").select("errore_id").execute()
                        voti_list = voti_res.data if voti_res.data else []
                        
                        voti_counts = {}
                        for v in voti_list:
                            e_id = v.get('errore_id')
                            if e_id:
                                voti_counts[e_id] = voti_counts.get(e_id, 0) + 1
                                
                        lista_errori_ranking = []
                        for ed in tutti_errori:
                            e_id = ed.get('id')
                            tot_voti = voti_counts.get(e_id, 0)
                            f_titolo = film_dict.get(ed.get("film_id"), "Film")
                            
                            lista_errori_ranking.append({
                                'errore_id': e_id,
                                'Totale Voti': tot_voti,
                                'creato_il': ed.get('creato_il', ''),
                                'minuto': ed.get('minuto', '00:00'),
                                'descrizione': ed.get('descrizione', ''),
                                'film_titolo': f_titolo
                            })
                            
                        df_ranking = pd.DataFrame(lista_errori_ranking)
                        df_ranking = df_ranking.sort_values(by=['Totale Voti', 'creato_il'], ascending=[False, False])
                        
                        for row in df_ranking.head(5).to_dict('records'):
                            st.markdown(f"""
                                <div style="background: #111827; border: 1px solid #1f2937; border-radius: 10px; padding: 12px; margin-bottom: 10px;">
                                    <div style="color: #60a5fa; font-size: 13px; font-weight: bold;">🎬 {row['film_titolo']} (Minuto {row['minuto']})</div>
                                    <div style="color: #cbd5e1; font-size: 12px; margin: 4px 0;">{row['descrizione'][:100]}...</div>
                                    <div style="color: #facc15; font-size: 11px;">🔥 <b>{row['Totale Voti']}</b> interazioni dalla community</div>
                                </div>
                            """, unsafe_allow_html=True)
                    else:
                        st.info("Nessun blooper approvato al momento.")
                except Exception: 
                    pass
                
        with tab_utenti:
            st.markdown("### 👥 Gestione Utenti & Abbonamenti Premium")
            try:
                profili = supabase.table("profiles").select("*").order("created_at", desc=True).execute().data or []
                oggi = str(date.today())
                for p in profili:
                    p_id, p_email, p_tier = p.get("id"), p.get("email", "N/D"), p.get("tier", "free")
                    p_tipo_sub, p_scadenza = p.get("tipo_abbonamento", "lifetime"), p.get("data_scadenza", str(date.today() + timedelta(days=30)))
                    raw_data = p.get("created_at")
                    p_data = pd.to_datetime(raw_data).strftime('%d/%m/%Y %H:%M') if raw_data else "N/D"
                    
                    last_reset = p.get("last_reset_date")
                    last_reset_str = str(last_reset)[:10] if last_reset else ""
                    calls_reali_oggi = p.get('calls_today', 0) if last_reset_str == oggi else 0
                    
                    str_ricerche = f"| 🔍 {calls_reali_oggi} oggi" if p_tier != "admin" else "| 🛡️ Illimitate"
                    
                    with st.container():
                        col_u1, col_u2, col_u3, col_u4, col_u5 = st.columns([2.0, 1.1, 1.1, 1.4, 1.2])
                        col_u1.markdown(f"**{p_email}**<br><span style='color: #9ca3af; font-size: 10px;'>📅 {p_data} {str_ricerche} | 🏆 {p.get('punti',0)} pts</span>", unsafe_allow_html=True)
                        nuovo_tier = col_u2.selectbox("Tier", ["free", "premium", "admin"], index=["free", "premium", "admin"].index(p_tier) if p_tier in ["free", "premium", "admin"] else 0, key=f"sel_tier_{p_id}", label_visibility="collapsed")
                        with col_u3:
                            if nuovo_tier == "premium": nuovo_tipo = st.selectbox("Tipo", ["mensile", "lifetime"], index=0 if p_tipo_sub == "mensile" else 1, key=f"sel_tipo_{p_id}", label_visibility="collapsed")
                            else: nuovo_tipo = "nessuno"; st.markdown("<span style='color: #64748b; font-size: 11px;'>N/A</span>", unsafe_allow_html=True)
                        with col_u4:
                            if nuovo_tier == "premium" and nuovo_tipo == "mensile":
                                dt_obj = datetime.strptime(str(p_scadenza)[:10], "%Y-%m-%d").date() if p_scadenza else date.today() + timedelta(days=30)
                                nuova_data_scadenza = st.date_input("Scadenza", value=dt_obj, format="DD/MM/YYYY", key=f"date_scad_{p_id}", label_visibility="collapsed")
                            else: nuova_data_scadenza = None; st.markdown("<span style='color: #64748b; font-size: 11px;'>Illimitato</span>", unsafe_allow_html=True)
                        with col_u5:
                            cs, cr, cd = st.columns(3)
                            if cs.button("💾", key=f"save_{p_id}"):
                                ud = {"tier": nuovo_tier, "tipo_abbonamento": nuovo_tipo}
                                if nuovo_tier == "premium" and nuovo_tipo == "mensile" and nuova_data_scadenza: ud["data_scadenza"] = str(nuova_data_scadenza)
                                elif nuovo_tier != "premium": ud["data_scadenza"] = None
                                supabase.table("profiles").update(ud).eq("id", p_id).execute(); st.toast("Aggiornato!", icon="✅"); st.rerun()
                            if cr.button("🔄", key=f"reset_{p_id}"): supabase.table("profiles").update({"calls_today": 0}).eq("id", p_id).execute(); st.rerun()
                            if cd.button("🗑️", key=f"del_{p_id}"): supabase.table("profiles").delete().eq("id", p_id).execute(); st.rerun()
                    st.markdown("<hr style='margin: 4px 0; border-color: #1f2937;'>", unsafe_allow_html=True)
            except: pass

        with tab_film:
            st.markdown("### 📋 Elenco completo film in archivio")
            if tutti_i_film:
                co1, co2 = st.columns(2)
                co = co1.selectbox("Ordina per:", ["Titolo", "Anno", "Regista", "Genere"], key="criterio")
                vo = co2.selectbox("Direzione:", ["Crescente", "Decrescente"], key="verso")
                km = {"Titolo": "titolo", "Anno": "anno", "Regista": "regista", "Genere": "genere"}
                f_ord = sorted(tutti_i_film, key=lambda x: (x.get(km[co]) is None, x.get(km[co])), reverse=vo.startswith("Decr"))
                st.markdown("---")
                ch1, ch2, ch3, ch4, ch5, ch6 = st.columns([2.5, 1, 2, 2.5, 1.5, 0.8])
                ch1.markdown("**Titolo**"); ch2.markdown("**Anno**"); ch3.markdown("**Regista**"); ch4.markdown("**Cast**"); ch5.markdown("**Genere**"); ch6.markdown("**Elimina**")
                st.markdown("<hr style='margin: 4px 0; border-color: #1f2937;'>", unsafe_allow_html=True)
                for f in f_ord:
                    cr1, cr2, cr3, cr4, cr5, cr6 = st.columns([2.5, 1, 2, 2.5, 1.5, 0.8])
                    cr1.write(f.get("titolo")); cr2.write(f.get("anno")); cr3.write(f.get("regista")); cr4.write(f.get("attori")); cr5.write(f.get("genere"))
                    if cr6.button("🗑️", key=f"del_f_row_{f['id']}"):
                        st.session_state.id_film_da_eliminare = f['id']
                        st.session_state.titolo_film_da_eliminare = f['titolo']
                        st.rerun()
                    st.markdown("<hr style='margin: 4px 0; border-color: #131d31;'>", unsafe_allow_html=True)

        with tab_sugg:
            st.markdown("### 💬 Suggerimenti e Feedback")
            try:
                sugg = supabase.table("suggerimenti").select("*").order("created_at", desc=True).execute().data or []
                if sugg:
                    for s in sugg:
                        c1, c2 = st.columns([5, 1])
                        c1.markdown(f"**Da:** `{s.get('email')}` — <span style='color:#9ca3af;'>{s.get('created_at','')[:16].replace('T',' ')}</span>", unsafe_allow_html=True)
                        c1.write(s.get("messaggio"))
                        if c2.button("🗑️️ Elimina", key=f"dels_{s['id']}"): supabase.table("suggerimenti").delete().eq("id", s['id']).execute(); st.rerun()
                        st.markdown("<hr style='margin: 4px 0; border-color: #1f2937;'>", unsafe_allow_html=True)
            except: pass

        with tab_testi:
            st.markdown("### 📝 Gestione Unificata: Scadenza Promo, Testi e Visibilità")
            st.markdown("Gestisci la scadenza della promozione tramite il calendario (in formato italiano), modifica i testi delle sezioni (puoi usare `{scadenza}` per richiamare la data) e regola la visibilità dei blocchi.")
            
            try:
                res_config = supabase.table("configurazioni").select("*").order("chiave").execute()
                configs = res_config.data if res_config.data else []
            except Exception as e:
                st.error(f"❌ Errore nel caricamento delle configurazioni: {e}")
                configs = []
                
            if not configs:
                st.warning("⚠️ Nessuna configurazione trovata nella tabella `configurazioni`.")
            else:
                cfg_dict = {item["chiave"]: item for item in configs}
                
                with st.form("form_gestione_unificata"):
                    st.markdown("#### ⭐ Scadenza Promo Startup")
                    current_deadline_str = cfg_dict.get("promo_lifetime_deadline", {}).get("valore", "2026-12-31")
                    try:
                        init_date = datetime.strptime(current_deadline_str, "%Y-%m-%d").date()
                    except:
                        init_date = date(2026, 12, 31)
                    
                    scad_date = st.date_input("Data limite per Promo (GG/MM/AAAA)", value=init_date, format="DD/MM/YYYY")
                    scad_formatted = scad_date.strftime("%Y-%m-%d")
                    scad_visibile = bool(cfg_dict.get("promo_lifetime_deadline", {}).get("visibile", True))
                    
                    st.markdown("---")
                    st.markdown("#### 💬 Testi e Visibilità delle Sezioni")
                    
                    modifiche_salvate = {}
                    modifiche_salvate["promo_lifetime_deadline"] = {"valore": scad_formatted, "visibile": scad_visibile}
                    
                    for item in configs:
                        chiave = item["chiave"]
                        if chiave == "promo_lifetime_deadline":
                            continue
                            
                        valore_attuale = item.get("valore", "") or ""
                        visibile_attuale = bool(item.get("visibile", True))
                        
                        st.markdown(f"**Chiave:** `{chiave}`")
                        col_txt, col_vis = st.columns([4, 1])
                        
                        with col_txt:
                            if len(valore_attuale) > 80:
                                nuovo_valore = st.text_area("Testo", value=valore_attuale, key=f"cfg_txt_{chiave}", label_visibility="collapsed")
                            else:
                                nuovo_valore = st.text_input("Testo", value=valore_attuale, key=f"cfg_txt_{chiave}", label_visibility="collapsed")
                                
                        with col_vis:
                            nuova_visibilita = st.checkbox("Visibile", value=visibile_attuale, key=f"cfg_vis_{chiave}")
                            
                        modifiche_salvate[chiave] = {"valore": nuovo_valore, "visibile": nuova_visibilita}
                        st.markdown("---")
                        
                    btn_salva_tutti = st.form_submit_button("💾 Salva Tutte le Modifiche", use_container_width=True)
                    
                    if btn_salva_tutti:
                        try:
                            for chiave, dati in modifiche_salvate.items():
                                supabase.table("configurazioni").update({
                                    "valore": dati["valore"],
                                    "visibile": dati["visibile"]
                                }).eq("chiave", chiave).execute()
                                
                            # Feedback visivo di successo potenziato con toast e messaggio esplicito
                            st.toast("✅ Modifiche salvate con successo!", icon="🎉")
                            st.success("✅ Configurazioni, testi e scadenze aggiornati con successo sul database!")
                            st.rerun()
                        except Exception as e:
                            st.error(f"❌ Errore durante il salvataggio: {e}")

        with tab_mod:
            st.markdown("#### 📥 Nuove Segnalazioni di Errori in Attesa")
            try:
                pend = supabase.table("errori").select("*").eq("approvato", False).order("creato_il", desc=True).execute().data or []
                if pend:
                    for p in pend:
                        f_tit = film_dict.get(p["film_id"], "Film")
                        raw_dt = p.get('creato_il')
                        data_formattata = pd.to_datetime(raw_dt, utc=True).tz_convert('Europe/Rome').strftime('%d/%m/%Y %H:%M') if raw_dt else "N/D"
                        
                        st.markdown(f"🎬 **Film:** {f_tit} | ⏱️ **Minuto:** `{p['minuto']}` | 📂 **Cat:** {p['categoria']} | 📅 **Inserito il:** `{data_formattata}`", unsafe_allow_html=True)
                        st.markdown(f"✍️ **Da:** `{p.get('inserito_da')}`<br>💬 **Desc:** {p['descrizione']}", unsafe_allow_html=True)
                        with st.form(f"fa_{p['id']}"):
                            ca1, ca2, ca3 = st.columns(3)
                            ca1.number_input("Punti", 1, 50, 10, key=f"pt_{p['id']}")
                            ca2.form_submit_button("✅ Approva", on_click=cb_approva, args=(p['id'], p.get('inserito_da'), f_tit, p['minuto'], p['descrizione'], f"pt_{p['id']}"))
                            ca3.form_submit_button("🗑️ Rifiuta", on_click=cb_rifiuta, args=(p['id'], f_tit, p['minuto'], p['descrizione']))
                        st.markdown("<hr style='margin: 15px 0; border-color: #1f2937;'>", unsafe_allow_html=True)
                else: 
                    st.info("Nessuna segnalazione in attesa.")
            except Exception: 
                pass

            st.markdown("#### ⚠️ Contestazioni su Errori Esistenti")
            try:
                cont = supabase.table("voti_bloopers").select("*").eq("tipo", "contestazione").execute().data or []
                cont = [c for c in cont if c.get("motivo")]
                if cont:
                    for c in cont:
                        err_res = supabase.table("errori").select("*").eq("id", c["errore_id"]).execute()
                        if not err_res.data: continue
                        err = err_res.data[0]
                        f_tit = film_dict.get(err["film_id"], "Film")
                        
                        raw_dt_c = c.get('created_at') or c.get('creato_il')
                        data_c_formattata = pd.to_datetime(raw_dt_c, utc=True).tz_convert('Europe/Rome').strftime('%d/%m/%Y %H:%M') if raw_dt_c else "N/D"
                        
                        st.markdown(f"🎬 **Film:** {f_tit} | 📅 **Contestato il:** `{data_c_formattata}`<br>💬 **Motivo utente:** <span style='color: #fca5a5;'><b>{c['motivo']}</b></span>", unsafe_allow_html=True)
                        with st.form(f"fc_{c['id']}"):
                            st.text_input("Minuto", value=err['minuto'], key=f"m_c_{c['id']}")
                            st.text_area("Descrizione", value=err['descrizione'], key=f"d_c_{c['id']}")
                            st.number_input("Punti", 1, 50, 10, key=f"p_c_{c['id']}")
                            cm1, cm2, cm3 = st.columns(3)
                            cm1.form_submit_button("✅ Salva Correzione", on_click=cb_salva_corr, args=(c['id'], err['id'], c['user_id'], f_tit, c['motivo'], f"m_c_{c['id']}", f"d_c_{c['id']}", f"p_c_{c['id']}"))
                            cm2.form_submit_button("🗑️ Elimina Blooper", on_click=cb_elimina_blooper, args=(err['id'], c['id'], f_tit, err['minuto'], c['motivo']))
                            cm3.form_submit_button("❌ Ignora", on_click=cb_ignora_cont, args=(c['id'], f_tit, err['minuto'], c['motivo']))
                        st.markdown("<hr style='margin: 15px 0; border-color: #1f2937;'>", unsafe_allow_html=True)
                else: 
                    st.info("Nessuna contestazione attiva.")
            except Exception: 
                pass

            st.markdown("#### ✅ Archivio Segnalazioni Utente Approvate")
            try:
                approvati = supabase.table("errori").select("*").eq("approvato", True).eq("provenienza", "utente").order("id", desc=True).limit(50).execute().data or []
                if approvati:
                    for app_item in approvati:
                        f_tit = film_dict.get(app_item["film_id"], "Film")
                        raw_dt_a = app_item.get('creato_il')
                        data_a_formattata = pd.to_datetime(raw_dt_a, utc=True).tz_convert('Europe/Rome').strftime('%d/%m/%Y %H:%M') if raw_dt_a else "N/D"
                        
                        col_app1, col_app2 = st.columns([5, 1])
                        col_app1.markdown(f"🎬 **{f_tit}** (Minuto `{app_item['minuto']}`) — <span style='color: #9ca3af; font-size: 11px;'>📅 Inserito il: {data_a_formattata} | Da: `{app_item.get('inserito_da','N/D')}`</span><br><span style='font-size: 13px; color: #cbd5e1;'>{app_item['descrizione']}</span>", unsafe_allow_html=True)
                        if col_app2.button("🗑️ Elimina", key=f"del_app_{app_item['id']}"):
                            supabase.table("errori").delete().eq("id", app_item['id']).execute()
                            st.success("Blooper eliminato!")
                            st.rerun()
                        st.markdown("<hr style='margin: 8px 0; border-color: #1f2937;'>", unsafe_allow_html=True)
                else:
                    st.info("Nessuna segnalazione utente approvata in archivio.")
            except Exception:
                pass