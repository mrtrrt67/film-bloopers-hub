import json
import re
import unicodedata
import streamlit as st
from urllib.parse import quote_plus

def normalizza(testo):
    if not testo: return ""
    nfkd = unicodedata.normalize('NFKD', str(testo))
    return re.sub(r'[^a-z0-9]', '', "".join([c for c in nfkd if not unicodedata.combining(c)]).lower())

def render_colonna_sinistra(tutti_i_film):
    sq = st.session_state.get("termine_cercato", "")
    
    if sq:
        parole_chiave = [normalizza(p) for p in sq.split() if normalizza(p)]
        fil = []
        for f in tutti_i_film:
            testo_completo = normalizza(
                str(f.get("titolo") or "") + " " + 
                str(f.get("anno") or "") + " " + 
                str(f.get("regista") or "") + " " + 
                str(f.get("attori") or "")
            )
            if all(parola in testo_completo for parola in parole_chiave):
                fil.append(f)
    else:
        fil = tutti_i_film
        
    def ordina_per_anno(x):
        try: return int(x.get("anno", 0))
        except: return 0
    fil.sort(key=ordina_per_anno, reverse=True)

    if not sq: 
        st.info("Inserisci i dati nel box di ricerca nella barra laterale a sinistra.")
        return None
    else:
        st.markdown(f"### 📂 Risultati ({len(fil)})")
        if fil:
            opzioni_film = {f"{f['titolo']} ({f.get('anno', 'N/D')})": f['id'] for f in fil}
            keys_list = list(opzioni_film.keys())
            
            default_idx = 0
            if st.session_state.get("film_selezionato_id") in opzioni_film.values():
                id_cercato = st.session_state.film_selezionato_id
                for idx, (tit, f_id) in enumerate(opzioni_film.items()):
                    if f_id == id_cercato:
                        default_idx = idx
                        break
            else:
                st.session_state.film_selezionato_id = opzioni_film[keys_list[0]]
                
            titolo_scelto = st.radio("Elenco film:", keys_list, index=default_idx, label_visibility="collapsed", key="radio_scelta_film_ordinata")
            st.session_state.film_selezionato_id = opzioni_film[titolo_scelto]
            return st.session_state.film_selezionato_id
        else:
            st.warning("Nessun film trovato con questi criteri.")
    return None
    
def render_scheda_film(f_info, supabase, tmdb_service, ai_service, user, is_admin, amazon_tag):
    poster_url = tmdb_service.get_or_fetch_poster(f_info['id'], f_info['titolo'], f_info.get('anno'), supabase)
    
    st.markdown(f"## 🎥 {f_info['titolo']} ({f_info.get('anno', 'N/D')})")
    st.markdown(
        f"🎬 **Regia:** {f_info.get('regista', 'N/D')}<br>"
        f"👥 **Cast:** {f_info.get('attori', 'N/D')}<br>"
        f"📂 **Genere:** {f_info.get('genere', 'N/D')}", 
        unsafe_allow_html=True
    )
    st.divider()
    
    col_poster, col_info_film = st.columns([1, 2])
    with col_poster:
        if poster_url:
            st.image(poster_url, width='stretch')
        else:
            st.markdown(f"""<div style="background: linear-gradient(135deg, #111827 0%, #0b101b 100%); border: 1px solid #1f2937; border-radius: 14px; padding: 30px 20px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.4); height: 100%; min-height: 320px; display: flex; flex-direction: column; justify-content: center; align-items: center;"><span style="font-size: 50px; margin-bottom: 15px;">🎬</span><h3 style="color: #f9fafc; font-size: 20px; margin: 0 0 10px 0; font-weight: bold;">{f_info['titolo']}</h3><p style="color: #9ca3af; font-size: 14px; margin: 0 0 5px 0;">Anno: <b>{f_info.get('anno', 'N/D')}</b></p></div>""", unsafe_allow_html=True)
    with col_info_film:
        st.markdown(f"""<div style="background: linear-gradient(135deg, #111827 0%, #0d1322 100%); border: 1px solid #1f2937; border-radius: 14px; padding: 24px; box-shadow: 0 8px 24px rgba(0,0,0,0.35); margin-bottom: 15px;"><h3 style="color: #f9fafc; margin-top: 0; font-size: 18px; margin-bottom: 10px;">📖 Trama</h3><p style="color: #d1d5db; font-size: 14px; line-height: 1.6; margin: 0;">{f_info.get('trama', 'Trama non disponibile.')}</p></div>""", unsafe_allow_html=True)
        st.markdown("<span style='color: #93c5fd; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;'>🤖 Strumenti IA</span>", unsafe_allow_html=True)
        
        if st.button("🤖 Aggiorna cast e regia", key=f"btn_completa_{f_info['id']}"): 
            with st.status("🤖 Aggiornamento cast e dettagli in corso...", expanded=True) as status:
                st.write("🔍 Connessione al servizio IA e recupero informazioni...")
                ai_service.completa_cast_e_dettagli(f_info['id'], f_info['titolo'], f_info.get('anno'), supabase, user, is_admin)
                status.update(label="✅ Cast e dettagli aggiornati con successo!", state="complete", expanded=False)
            st.rerun()

        st.markdown("<div style='margin: 12px 0;'></div>", unsafe_allow_html=True)
        st.markdown("<span style='color: #93c5fd; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;'>🌐 Link ed Esplorazione</span>", unsafe_allow_html=True)
        amz_l = f"https://www.amazon.it/s?k={quote_plus(f_info['titolo']+' '+str(f_info.get('anno','')))}&tag={amazon_tag}"
        yt_l = f"https://www.youtube.com/results?search_query={quote_plus(f_info['titolo']+' movie mistakes')}"
        st.markdown(f'<div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-top: 6px;"><a href="{amz_l}" target="_blank" style="display: inline-flex; align-items: center; background-color: #1f2937; color: #f3f4f6; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; text-decoration: none; border: 1px solid #374151;">🛒 Cerca su Amazon</a><a href="{yt_l}" target="_blank" style="display: inline-flex; align-items: center; background-color: rgba(239, 68, 68, 0.15); color: #f87171; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; text-decoration: none; border: 1px solid rgba(239, 68, 68, 0.35);">▶️ Cerca errori su YouTube</a></div>', unsafe_allow_html=True)
        
def render_elenco_bloopers(f_info, supabase, ai_service, user, is_admin, cb_vota_blooper, cb_salva_motivo):
    errs = supabase.table("errori").select("*").eq("film_id", f_info['id']).eq("approvato", True).execute().data or []
    voti = supabase.table("voti_bloopers").select("*").in_("errore_id", [e['id'] for e in errs]).execute().data or []
    
    st.divider()
    if not errs:
        st.warning("⚠️ L'archivio non contiene ancora bloopers per questa pellicola.")
        if st.button("🤖 Genera i primi errori con l'IA", key=f"btn_gen_primi_{f_info['id']}", width='stretch'): 
            with st.status("🤖 Generazione iniziale dei bloopers con l'IA...", expanded=True) as status:
                st.write("🤖 Interrogazione del modello di intelligenza artificiale...")
                ai_service.genera_errori_per_film(f_info['id'], f_info['titolo'], f_info.get('anno'), f_info.get('regista'), f_info.get('attori'), supabase, user, is_admin)
                status.update(label="✅ Generazione completata con successo!", state="complete", expanded=False)
            st.rerun() 
    else:
        col_tit_err, col_btn_err, col_pulisci_err = st.columns([2, 1, 1])
        with col_tit_err: st.markdown(f"### 🔍 Errori e Incongruenze ({len(errs)})")
        
        with col_btn_err:
            avvia_cerca_altri = st.button("🤖 Cerca altri", key=f"btn_cerca_altri_{f_info['id']}")
            
        with col_pulisci_err:
            if st.button("🧹 Elimina tutti", key=f"btn_elimina_tutti_{f_info['id']}"): 
                supabase.table("errori").delete().eq("film_id", f_info['id']).execute()
                st.rerun()

        if avvia_cerca_altri:
            with st.status("🤖 Ricerca approfondita di nuovi bloopers...", expanded=True) as status:
                st.write("🤖 Analisi in corso con i modelli IA...")
                r = ai_service.cerca_altri_errori_specifici(f_info['id'], f_info['titolo'], f_info.get('anno'), supabase, user, is_admin)
                status.update(label="✅ Ricerca completata!", state="complete", expanded=False)
            if r > 0: 
                st.success(f"Aggiunti {r} errori!") 
            st.rerun()

        for e in errs:
            conf = sum(1 for v in voti if v.get('errore_id') == e['id'] and v.get('tipo') == 'conferma')
            cont = sum(1 for v in voti if v.get('errore_id') == e['id'] and v.get('tipo') == 'contestazione')
            att = round((conf / (conf+cont)*100)) if (conf+cont)>0 else 100
            str_stato = " | ✅ Verificato" if att>=70 and conf>=2 else (" | ⚠️ Contestato" if att<40 and cont>=2 else "")
            
            m_v = next((v.get('tipo') for v in voti if v.get('errore_id') == e['id'] and user and v.get('user_id') == user.id), None)
            
            with st.expander(f"⏱️ Minuto `{e['minuto']}` — Categoria: **{e['categoria']}**{str_stato}"):
                st.write(e['descrizione'])
                st.markdown(f"<span style='color: #9ca3af; font-size: 11px;'>✍️ Autore: <b>{e.get('inserito_da','IA')}</b> | 📊 Attendibilità: <b>{att}%</b> ({conf} 👍, {cont} 👎)</span>", unsafe_allow_html=True)
                if not user: 
                    st.markdown("<span style='color: #9ca3af; font-size: 11px; margin-top: 5px; display: block;'>🔒 Effettua il login per votare.</span>", unsafe_allow_html=True)
                else:
                    v1, v2, v3 = st.columns([0.5, 0.5, 6.0])
                    v1.button("👍", key=f"c_{e['id']}", type="primary" if m_v == "conferma" else "secondary", on_click=cb_vota_blooper, args=(e['id'], m_v, "conferma", user.id))
                    v2.button("👎", key=f"x_{e['id']}", type="primary" if m_v == "contestazione" else "secondary", on_click=cb_vota_blooper, args=(e['id'], m_v, "contestazione", user.id))
                    if m_v == "contestazione":
                        motivo = next((v.get('motivo') for v in voti if v.get('errore_id') == e['id'] and v.get('user_id') == user.id and v.get('motivo')), "")
                        st.text_input("Motivo della contestazione:", value=motivo, key=f"mt_{e['id']}")
                        st.button("💾 Salva motivo", key=f"sm_{e['id']}", on_click=cb_salva_motivo, args=(e['id'], user.id, f"mt_{e['id']}"))