from datetime import date, datetime
import streamlit as st
import streamlit.components.v1 as components
from supabase import create_client

# --- IMPORT MODULI CUSTOM ---
from views.home_view import render_home
from views.community_view import render_classifica, render_segnala_errore, render_suggerimenti
from views.strumenti_view import render_sync_letterboxd, render_esporta_archivio
from views.esplora_view import normalizza, render_colonna_sinistra, render_scheda_film, render_elenco_bloopers
from components.sidebar import render_sidebar
from services.ai_service import AIService
from services.tmdb_service import TMDBService
from components.modals import ModalsComponent
from components.admin_components import AdminComponent

# --- IMPORT UTILITIES ---
from utils.styles import inject_global_styles
from utils.callbacks import (
    get_config, is_visible, is_promo_active, utente_corrente_e_admin,
    cb_naviga, cb_apri_modal, cb_logout,
    cb_vota_blooper, cb_salva_motivo,
    cb_admin_approva, cb_admin_rifiuta, cb_admin_salva_corr,
    cb_admin_elimina_blooper, cb_admin_ignora_cont
)

# Configurazione della pagina
st.set_page_config(page_title="Archivio Errori e Incongruenze Cinematografiche", page_icon="images/Logo.png", layout="wide")

# --- CONNESSIONE SUPABASE ---
try:
    SUPABASE_URL = st.secrets["SUPABASE_URL"]
    SUPABASE_KEY = st.secrets["SUPABASE_KEY"]
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    st.error("❌ Errore critico di configurazione Supabase nei secrets.")
    st.stop()

# --- INIZIALIZZAZIONE STATO ---
variabili_base = {
    "user": None, "sezione_corrente": "🏠 Home", "termine_cercato": "", 
    "film_selezionato_id": None, "id_film_da_eliminare": None, "titolo_film_da_eliminare": None, 
    "sync_dettagli": None, "sync_username": "", "sync_metrics": (0, 0, 0, 0), 
    "modal_attiva": None, "login_err": "", "guest_calls": 0, "guest_date": str(date.today()), 
    "ultimo_tempo_chiamata": 0, "sessione_tracciata": False, "ultimo_utente_id": None,
    "supabase_client": supabase
}
for key, default in variabili_base.items():
    if key not in st.session_state: st.session_state[key] = default

if "access_token" in st.session_state and st.session_state.access_token:
    try: supabase.auth.set_session(st.session_state.access_token, st.session_state.get("refresh_token", ""))
    except: pass

# --- SCRIPT JS PER INTERETTARE IL HASH (#) E CONVERTIRLO IN QUERY (?) ---
components.html("""
    <script>
        if (window.location.hash) {
            const hash = window.location.hash.substring(1);
            if (hash.includes("type=recovery") || hash.includes("access_token")) {
                window.location.replace(window.location.pathname + "?" + hash);
            }
        }
    </script>
""", height=0)

# --- GESTIONE SCHERMATA RECUPERO PASSWORD (LINK DA EMAIL) ---
query_params = st.query_params
if query_params.get("type") == "recovery" or "access_token" in query_params:
    if "access_token" in query_params and "refresh_token" in query_params:
        try:
            supabase.auth.set_session(query_params["access_token"], query_params["refresh_token"])
        except:
            pass

    st.markdown("""
        <div style="max-width: 500px; margin: 50px auto; background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <h2 style="color: #f9fafc; text-align: center; margin-bottom: 20px;">🔒 Imposta Nuova Password</h2>
        </div>
    """, unsafe_allow_html=True)
    
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        with st.form("form_aggiorna_password"):
            nuova_pw = st.text_input("Nuova Password", type="password")
            conferma_pw = st.text_input("Conferma Nuova Password", type="password")
            btn_salva_pw = st.form_submit_button("Aggiorna Password", use_container_width=True)
            
            if btn_salva_pw:
                if nuova_pw and nuova_pw == conferma_pw:
                    try:
                        supabase.auth.update_user({"password": nuova_pw})
                        st.success("Password aggiornata con successo! Ora puoi effettuare il login.")
                        st.query_params.clear()
                        st.rerun()
                    except Exception as e:
                        st.error(f"Errore durante l'aggiornamento: {e}")
                else:
                    st.error("Le password non coincidono o sono vuote.")
    st.stop()

# --- CONTROLLO CAMBIO STATO UTENTE ---
utente_corrente_id = st.session_state.user.id if st.session_state.user else None
if st.session_state.get("ultimo_utente_id") != utente_corrente_id:
    st.session_state.termine_cercato = ""
    st.session_state.film_selezionato_id = None
    st.session_state.sezione_corrente = "🏠 Home"
    st.session_state.ultimo_utente_id = utente_corrente_id
    st.session_state.sessione_tracciata = False

# --- REGISTRAZIONE LOG ACCESSI ---
if not st.session_state.get("sessione_tracciata", False):
    try:
        valore_tipo = st.session_state.user.email if st.session_state.user else "ospite"
        supabase.table("log_accessi").insert({"tipo": valore_tipo}).execute()
        st.session_state.sessione_tracciata = True
    except Exception:
        pass

# --- INIEZIONE STILI & SEO ---
inject_global_styles()

# --- CONFIGURAZIONI & SERVIZI ---
AMAZON_AFFILIATE_TAG = st.secrets.get("AMAZON_AFFILIATE_TAG")
AMAZON_DASHBOARD_URL = st.secrets.get("AMAZON_DASHBOARD_URL")
STRIPE_MONTHLY_URL = st.secrets.get("STRIPE_MONTHLY_URL") or "https://buy.stripe.com/tuolinkmensile"
STRIPE_LIFETIME_URL = st.secrets.get("STRIPE_LIFETIME_URL") or "https://buy.stripe.com/tuolinklifetime"
ADMIN_EMAIL = st.secrets.get("ADMIN_EMAIL", "").lower()
api_key_genai = st.secrets.get("GEMINI_API_KEY") or st.secrets.get("GOOGLE_API_KEY", "")

ai_service = AIService(api_key=api_key_genai)
tmdb_service = TMDBService()

# --- GESTIONE MODALI & FORZATURE ---
if st.session_state.modal_attiva == "privacy": ModalsComponent.modal_privacy(); st.session_state.modal_attiva = None
elif st.session_state.modal_attiva == "tos": ModalsComponent.modal_tos(); st.session_state.modal_attiva = None
elif st.session_state.modal_attiva == "cookie": ModalsComponent.modal_cookie(); st.session_state.modal_attiva = None
elif st.session_state.modal_attiva == "amazon": ModalsComponent.modal_amazon(AMAZON_AFFILIATE_TAG); st.session_state.modal_attiva = None
if st.session_state.id_film_da_eliminare: ModalsComponent.dialog_conferma_eliminazione(st.session_state.id_film_da_eliminare, st.session_state.titolo_film_da_eliminare, supabase)

if "forza_sezione" in st.session_state and st.session_state.forza_sezione:
    st.session_state.sezione_corrente = st.session_state.forza_sezione
    del st.session_state.forza_sezione

# --- HEADER APP ---
st.markdown("""<div style="background: linear-gradient(135deg, #111827 0%, #0d1322 100%); border: 1px solid #1f2937; border-radius: 16px; padding: 30px; margin-bottom: 25px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); position: relative; overflow: hidden;"><div style="position: absolute; top: -50px; right: -50px; font-size: 150px; opacity: 0.04; pointer-events: none;">🎬</div><h1 style="color: #f9fafc; font-size: 30px; margin: 0 0 8px 0; font-weight: 800; letter-spacing: -0.5px;">🎬 Archivio Errori e Incongruenze Cinematografiche</h1><p style="color: #9ca3af; font-size: 14px; margin: 0; line-height: 1.5;">Esplora, scopri e cataloga in tempo reale i bloopers, le sviste e i dettagli nascosti della storia del cinema.</p></div>""", unsafe_allow_html=True)

# --- VERIFICA TIER E CONTROLLO SCADENZA ---
user_tier_temp = "free"
if st.session_state.user:
    if utente_corrente_e_admin(supabase, ADMIN_EMAIL): 
        user_tier_temp = "admin"
    else:
        try:
            prof_res = supabase.table("profiles").select("tier, tipo_abbonamento, data_scadenza").eq("id", st.session_state.user.id).execute().data
            if prof_res:
                p_data = prof_res[0]
                p_tier = p_data.get("tier", "free")
                p_tipo = p_data.get("tipo_abbonamento", "mensile")
                p_scadenza = p_data.get("data_scadenza")
                
                if p_tier == "premium" and p_tipo == "mensile" and p_scadenza:
                    try:
                        dt_scad = datetime.strptime(str(p_scadenza)[:10], "%Y-%m-%d").date()
                        if dt_scad < date.today():
                            supabase.table("profiles").update({
                                "tier": "free",
                                "tipo_abbonamento": "nessuno"
                            }).eq("id", st.session_state.user.id).execute()
                            p_tier = "free"
                    except:
                        pass
                
                user_tier_temp = p_tier
        except: 
            user_tier_temp = "free"

# --- RENDER SIDEBAR MODULARE ---
btn_cerca, btn_reset, testo_titolo, testo_anno, testo_cast = render_sidebar(
    supabase, 
    lambda: is_promo_active(supabase), 
    lambda: utente_corrente_e_admin(supabase, ADMIN_EMAIL), 
    cb_naviga, cb_apri_modal, cb_logout,
    AMAZON_AFFILIATE_TAG, STRIPE_MONTHLY_URL, STRIPE_LIFETIME_URL
)

sezione = st.session_state.sezione_corrente
try: tutti_i_film = supabase.table("films").select("*").execute().data or []
except: tutti_i_film = []

# --- ROUTING SEZIONI ---
if sezione == "🏠 Home":
    render_home(
        lambda k, d: get_config(supabase, k, d), 
        lambda k, d=True: is_visible(supabase, k, d), 
        lambda: is_promo_active(supabase)
    )
elif sezione == "🔍 Esplora e Cerca":
    if btn_reset: 
        st.session_state.termine_cercato = ""
        st.session_state.film_selezionato_id = None
        st.rerun()
        
    if btn_cerca and len(testo_titolo) >= 3:
        st.session_state.termine_cercato = testo_titolo.strip()
        termine_inserito = f"{testo_titolo} {testo_anno} {testo_cast}".strip()
        
        try:
            dati_log = {"termine": testo_titolo.strip()}
            supabase.table("log_ricerche").insert(dati_log).execute()
        except Exception as e:
            st.toast(f"❌ Errore log_ricerche: {e}", icon="⚠️")
            
        film_gia_esistente = False
        for f in tutti_i_film:
            titolo_match = normalizza(testo_titolo) in normalizza(f.get("titolo", ""))
            anno_match = (not testo_anno) or (str(testo_anno) in str(f.get("anno", "")))
            cast_match = (not testo_cast) or (normalizza(testo_cast) in normalizza(str(f.get("attori", "")) + " " + str(f.get("regista", ""))))
            if titolo_match and anno_match and cast_match:
                film_gia_esistente = True
                break
        
        if not film_gia_esistente:
            with st.status("🤖 Ricerca intelligente e catalogazione in corso...", expanded=True) as status:
                st.write(f"🔍 Interrogazione dei modelli IA per '{testo_titolo}' (Anno: {testo_anno or 'qualsiasi'}, Cast: {testo_cast or 'qualsiasi'})...")
                ai_service.cerca_e_salva_saga_su_db(testo_titolo, testo_anno, testo_cast, tutti_i_film, supabase, st.session_state.user, utente_corrente_e_admin(supabase, ADMIN_EMAIL))
                status.update(label="✅ Ricerca e salvataggio completati con successo!", state="complete", expanded=False)
            try:
                tutti_i_film = supabase.table("films").select("*").execute().data or []
            except:
                tutti_i_film = []

        parole_chiave = [normalizza(p) for p in termine_inserito.split() if normalizza(p)]
        fil_aggiornati = []
        for f in tutti_i_film:
            testo_completo = normalizza(
                str(f.get("titolo") or "") + " " + 
                str(f.get("anno") or "") + " " + 
                str(f.get("regista") or "") + " " + 
                str(f.get("attori") or "")
            )
            if all(p in testo_completo for p in parole_chiave):
                fil_aggiornati.append(f)

        if fil_aggiornati and (testo_anno or testo_cast):
            filtri_rigorosi = []
            for f in fil_aggiornati:
                anno_ok = (not testo_anno) or (str(testo_anno) in str(f.get("anno", "")))
                cast_ok = (not testo_cast) or (normalizza(testo_cast) in normalizza(str(f.get("attori", "")) + " " + str(f.get("regista", ""))))
                if anno_ok and cast_ok:
                    filtri_rigorosi.append(f)
            fil_aggiornati = filtri_rigorosi

        if fil_aggiornati:
            fil_aggiornati.sort(key=lambda x: int(x.get("anno", 0) or 0), reverse=True)
            st.session_state.film_selezionato_id = fil_aggiornati[0]['id']
        else:
            st.session_state.film_selezionato_id = None
            st.warning(f"⚠️ Nessun film trovato corrispondente esattamente a '{testo_titolo}' con i filtri indicati.")
            
        st.rerun()
        
    sq = st.session_state.termine_cercato
    c_s, c_d = st.columns([1, 2])

    with c_s:
        render_colonna_sinistra(tutti_i_film)
            
    with c_d:
        if not sq:
            st.markdown("""<div style="background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 28px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); text-align: center;"><span style="font-size: 40px; margin-bottom: 15px; display: block;">🔍</span><h3 style="color: #f9fafc; font-size: 20px; font-weight: 700; margin-bottom: 10px;">Pronto per la ricerca?</h3><p style="color: #9ca3af; font-size: 14px; line-height: 1.5; margin: 0;">Usa il pannello <b>Ricerca Intelligente</b> nella barra laterale a sinistra per cercare qualsiasi film o saga cinematografica.</p></div>""", unsafe_allow_html=True)
        elif st.session_state.film_selezionato_id:
            f_info = next((f for f in tutti_i_film if f['id'] == st.session_state.film_selezionato_id), None)
            if f_info:
                render_scheda_film(f_info, supabase, tmdb_service, ai_service, st.session_state.user, utente_corrente_e_admin(supabase, ADMIN_EMAIL), AMAZON_AFFILIATE_TAG)
                render_elenco_bloopers(f_info, supabase, ai_service, st.session_state.user, utente_corrente_e_admin(supabase, ADMIN_EMAIL), lambda eid, mv, nv, uid: cb_vota_blooper(eid, mv, nv, uid, supabase), lambda eid, uid, wk: cb_salva_motivo(eid, uid, wk, supabase))

elif sezione == "🏆 Classifica":
    render_classifica(supabase)

elif sezione == "✍️ Segnala un Errore":
    render_segnala_errore(supabase, tutti_i_film)

elif sezione == "💬 Invia Suggerimento":
    render_suggerimenti(supabase)

elif sezione == "🔗 Sync Letterboxd":
    render_sync_letterboxd(supabase, tutti_i_film, ai_service, lambda: utente_corrente_e_admin(supabase, ADMIN_EMAIL))

elif sezione == "📥 Esporta Archivio":
    render_esporta_archivio(supabase, tutti_i_film)

elif sezione == "🛡️ Pannello Admin" and utente_corrente_e_admin(supabase, ADMIN_EMAIL):
    AdminComponent.render_admin_panel(
        supabase, tutti_i_film, AMAZON_DASHBOARD_URL, 
        lambda epid, aut, ftit, epm, epd, wpt: cb_admin_approva(epid, aut, ftit, epm, epd, wpt, supabase),
        lambda epid, ftit, epm, epd: cb_admin_rifiuta(epid, ftit, epm, epd, supabase),
        lambda cid, eid, uid, ftit, mot, km, kd, kp: cb_admin_salva_corr(cid, eid, uid, ftit, mot, km, kd, kp, supabase),
        lambda eid, cid, ftit, min, mot: cb_admin_elimina_blooper(eid, cid, ftit, min, mot, supabase),
        lambda cid, ftit, min, mot: cb_admin_ignora_cont(cid, ftit, min, mot, supabase)
    )

# --- FOOTER CENTRALE DINAMICO ---
footer_testo_principale = get_config(supabase, "footer_testo_principale", "FilmBloopers Hub — Il database intelligente degli errori cinematografici | P.IVA: 12345678901 | Sede Legale: Via Roma 1, Torino | Contatti: supporto@filmbloopers.it")
footer_testo_amazon = get_config(supabase, "footer_testo_amazon", "In qualità di Affiliato Amazon, riceviamo un guadagno dagli acquisti idonei.")

st.markdown(f"""
    <div class="footer-fixed">
        <div><b>{footer_testo_principale}</b></div>
        <div style="font-size: 10px; color: #64748b; opacity: 0.8;">{footer_testo_amazon}</div>
    </div>
""", unsafe_allow_html=True)