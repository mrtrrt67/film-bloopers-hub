import json
import re
import unicodedata
import streamlit as st
import pandas as pd
from services.letterboxd_service import LetterboxdService

def normalizza(testo):
    if not testo: return ""
    nfkd = unicodedata.normalize('NFKD', str(testo))
    return re.sub(r'[^a-z0-9]', '', "".join([c for c in nfkd if not unicodedata.combining(c)]).lower())

def render_sync_letterboxd(supabase, tutti_i_film, ai_service, is_admin_func):
    st.subheader("🍿 I Tuoi Film con Bloopers su Letterboxd")
    st.markdown("Inserisci il tuo **nome utente Letterboxd**: il sistema scansionerà automaticamente visti e watchlist per confrontarli con l'archivio.")
    
    with st.form("form_letterboxd_scraping_completo"):
        usr = st.text_input("Nome utente Letterboxd:", value=st.session_state.sync_username, placeholder="Inserisci username...")
        btn_lb = st.form_submit_button("🔄 Avvia Sincronizzazione Completa", use_container_width=True)
        
    if btn_lb and usr:
        st.session_state.sync_username = usr.strip().lower()
        with st.spinner("Scansione in corso..."):
            films_utente_lista = LetterboxdService.scansiona_profilo(st.session_state.sync_username)
            if not films_utente_lista: 
                st.warning("Impossibile trovare film per questo profilo.")
            else:
                db_films_lista = [{"id": f.get("id"), "titolo": f.get("titolo"), "anno": str(f.get("anno", ""))} for f in tutti_i_film]
                db_by_norm = {}
                for dbf in db_films_lista:
                    norm = normalizza(dbf["titolo"])
                    if norm not in db_by_norm: db_by_norm[norm] = []
                    db_by_norm[norm].append(dbf)

                match_mappa = {}
                matched_norm_titles = set()

                for fu in films_utente_lista:
                    norm_u = normalizza(fu["titolo"])
                    fu_anno = str(fu["anno"]).strip()
                    is_visto_item = (fu["status"] == 'visto')
                    if norm_u in db_by_norm and norm_u not in matched_norm_titles:
                        candidates = db_by_norm[norm_u]
                        matched_db = next((c for c in candidates if str(c.get("anno", "")).strip() == fu_anno), None)
                        if not matched_db:
                            candidates.sort(key=lambda x: int(x.get("anno", 0) or 0), reverse=True)
                            matched_db = candidates[0]
                        if matched_db:
                            match_mappa[matched_db["id"]] = {"visto": is_visto_item, "watchlist": not is_visto_item}
                            matched_norm_titles.add(norm_u)

                # MATCHING IA AVANZATO
                try:
                    prompt = f"""
                    Confronta i film dell'utente su Letterboxd con i film nel database.
                    REGOLE: Riconosci corrispondenze in lingue diverse. RISPETTA RIGOROSAMENTE L'ANNO.
                    Film utente: {json.dumps(films_utente_lista, ensure_ascii=False)}
                    Database: {json.dumps(db_films_lista, ensure_ascii=False)}
                    Restituisci ESCLUSIVAMENTE JSON: {{"film_visti_ids": ["id_1", "id_2"]}}
                    """
                    resp_ia = ai_service.chiama_ia_con_retry(prompt, supabase, st.session_state.user, utente_corrente_e_admin(), temperatura=0.0)
                    if resp_ia and resp_ia.text:
                        dati_match = json.loads(resp_ia.text.replace("```json", "").replace("```", "").strip())
                        for i in dati_match.get("film_visti_ids", []):
                            matched_db = next((db for db in db_films_lista if db["id"] == i), None)
                            if matched_db:
                                norm_m = normalizza(matched_db["titolo"])
                                if norm_m not in matched_norm_titles:
                                    is_visto_ia = any(normalizza(matched_db["titolo"]) == normalizza(u["titolo"]) and u["status"] == 'visto' for u in films_utente_lista)
                                    match_mappa[i] = {"visto": is_visto_ia, "watchlist": not is_visto_ia}
                                    matched_norm_titles.add(norm_m)
                except: pass
                
                # Calcolo Errori
                res_err = supabase.table("errori").select("film_id").eq("approvato", True).execute()
                errori_per_film = {}
                for e in (res_err.data or []): errori_per_film[e["film_id"]] = errori_per_film.get(e["film_id"], 0) + 1
                
                dettagli_confronto = []
                for f in tutti_i_film:
                    f_id = f.get("id")
                    if f_id in match_mappa:
                        st_info = match_mappa[f_id]
                        if st_info["visto"] and st_info["watchlist"]: stato = "Visto ✅ & Watchlist 📌"
                        elif st_info["visto"]: stato = "Visto ✅"
                        else: stato = "Watchlist 📌"
                        dettagli_confronto.append({
                            "id": f_id, "Titolo": f.get("titolo", ""), "Anno": str(f.get("anno", "")) if f.get("anno") else "N/D",
                            "Stato Letterboxd": stato, "Bloopers": errori_per_film.get(f_id, 0)
                        })
                
                st.session_state.sync_dettagli = dettagli_confronto
                st.session_state.sync_metrics = (len(tutti_i_film), len(films_utente_lista), len(match_mappa), sum(errori_per_film.get(f_id, 0) for f_id in match_mappa))

    if st.session_state.sync_dettagli is not None:
        tot_film, tot_lb, visti_c, err_c = st.session_state.sync_metrics
        st.success("Sincronizzazione completata con successo!")
        
        col_m1, col_m2, col_m3, col_m4 = st.columns(4)
        col_m1.metric("🎬 Film in Archivio", tot_film)
        col_m2.metric("🍿 Film su Letterboxd", tot_lb)
        col_m3.metric("👁️ Film in Comune", visti_c)
        col_m4.metric("🔍 Bloopers", err_c)
        
        st.markdown("---")
        if not st.session_state.sync_dettagli:
            st.info("ℹ️ Nessun film in comune trovato tra il profilo e l'archivio.")
        else:
            col_h1, col_h2, col_h3, col_h4, col_h5 = st.columns([2.5, 1, 1.8, 1.2, 1.2])
            col_h1.markdown("**Titolo**"); col_h2.markdown("**Anno**"); col_h3.markdown("**Stato Letterboxd**"); col_h4.markdown("**Bloopers**"); col_h5.markdown("**Azione**")
            st.markdown("<hr style='margin: 4px 0; border-color: #334155;'>", unsafe_allow_html=True)
            
            for item in st.session_state.sync_dettagli:
                c1, c2, c3, c4, c5 = st.columns([2.5, 1, 1.8, 1.2, 1.2])
                c1.write(item["Titolo"]); c2.write(item["Anno"]); c3.write(item["Stato Letterboxd"]); c4.write(str(item["Bloopers"]))
                if c5.button("🔍 Apri", key=f"btn_apri_{item['id']}"):
                    st.session_state.termine_cercato = item["Titolo"]
                    st.session_state.forza_sezione = "🔍 Esplora e Cerca"
                    st.rerun()
                st.markdown("<hr style='margin: 4px 0; border-color: #1e293b;'>", unsafe_allow_html=True)

def render_esporta_archivio(supabase, tutti_i_film):
    st.subheader("📥 Esporta Dati dell'Archivio")
    c1, c2 = st.columns(2)
    with c1:
        if tutti_i_film: st.download_button("📥 Scarica CSV Film", pd.DataFrame(tutti_i_film).to_csv(index=False).encode('utf-8'), "archivio_film.csv", "text/csv", use_container_width=True)
    with c2:
        try:
            errs = supabase.table("errori").select("*").execute().data or []
            if errs: st.download_button("📥 Scarica CSV Bloopers", pd.DataFrame(errs).to_csv(index=False).encode('utf-8'), "archivio_errori.csv", "text/csv", use_container_width=True)
        except: pass
        