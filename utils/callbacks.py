import re
from datetime import date, datetime
import streamlit as st

def get_config(supabase, chiave, default_val):
    try:
        res = supabase.table("configurazioni").select("valore").eq("chiave", chiave).execute()
        if res.data: return res.data[0]["valore"]
    except: pass
    return default_val

def is_visible(supabase, chiave, default_val=True):
    try:
        res = supabase.table("configurazioni").select("visibile").eq("chiave", chiave).execute()
        if res.data and res.data[0].get("visibile") is not None:
            return res.data[0]["visibile"]
    except: 
        pass
    return default_val

def is_promo_active(supabase):
    deadline_str = get_config(supabase, "promo_lifetime_deadline", "2026-12-31")
    try: deadline_dt = datetime.strptime(deadline_str, "%Y-%m-%d").date()
    except: deadline_dt = date(2026, 12, 31)
    return date.today() <= deadline_dt

def utente_corrente_e_admin(supabase, admin_email):
    if not st.session_state.get("user"): return False
    if admin_email and getattr(st.session_state.user, "email", "").lower() == admin_email: return True
    try:
        if supabase.table("profiles").select("tier").eq("id", st.session_state.user.id).execute().data[0].get("tier") == "admin": return True
    except: pass
    return False

def cb_naviga(sezione): st.session_state.sezione_corrente = sezione
def cb_apri_modal(nome_modal): st.session_state.modal_attiva = nome_modal
def cb_logout():
    try: st.session_state.supabase_client.auth.sign_out()
    except: pass
    for key in ["user", "access_token", "refresh_token", "film_selezionato_id", "sync_dettagli"]: st.session_state[key] = None
    st.session_state.termine_cercato = ""
    st.session_state.sezione_corrente = "🏠 Home"
    st.session_state.ultimo_utente_id = None
    st.session_state.sessione_tracciata = False

def cb_vota_blooper(err_id, mio_voto, nuovo_voto, u_id, supabase):
    try:
        if mio_voto == nuovo_voto: supabase.table("voti_bloopers").delete().eq("user_id", u_id).eq("errore_id", err_id).execute()
        elif mio_voto: supabase.table("voti_bloopers").update({"tipo": nuovo_voto, "motivo": None}).eq("user_id", u_id).eq("errore_id", err_id).execute()
        else: supabase.table("voti_bloopers").insert({"user_id": u_id, "errore_id": err_id, "tipo": nuovo_voto}).execute()
    except: pass

def cb_salva_motivo(err_id, u_id, w_key, supabase):
    try: supabase.table("voti_bloopers").update({"motivo": st.session_state.get(w_key, "").strip()}).eq("user_id", u_id).eq("errore_id", err_id).execute()
    except: pass

def cb_admin_approva(ep_id, aut, f_tit, ep_m, ep_d, w_pt, supabase):
    pts = st.session_state.get(w_pt, 10)
    try:
        supabase.table("errori").update({"approvato": True, "provenienza": "utente"}).eq("id", ep_id).execute()
        u_res = supabase.table("profiles").select("id, punti").eq("email", aut).execute()
        if u_res.data:
            supabase.table("profiles").update({"punti": (u_res.data[0].get("punti") or 0) + int(pts)}).eq("id", u_res.data[0]["id"]).execute()
        supabase.table("storico_moderazione").insert({"film_titolo": f_tit, "minuto": ep_m, "motivo": ep_d[:100], "azione": "Approvata", "punti_assegnati": int(pts)}).execute()
        st.success("Blooper approvato con successo!")
        st.rerun()
    except Exception as e:
        st.error(f"❌ Errore durante l'approvazione: {e}")

def cb_admin_rifiuta(ep_id, f_tit, ep_m, ep_d, supabase):
    try:
        supabase.table("errori").delete().eq("id", ep_id).execute()
        supabase.table("storico_moderazione").insert({"film_titolo": f_tit, "minuto": ep_m, "motivo": ep_d[:100], "azione": "Rifiutata", "punti_assegnati": 0}).execute()
        st.success("Blooper rifiutato ed eliminato.")
        st.rerun()
    except Exception as e:
        st.error(f"❌ Errore: {e}")

def cb_admin_salva_corr(c_id, e_id, u_id, f_tit, mot, k_m, k_d, k_p, supabase):
    pts = st.session_state.get(k_p, 10)
    minuto_val = st.session_state.get(k_m, "").strip()
    desc_val = st.session_state.get(k_d, "")
    
    if not minuto_val: minuto_val = "00:00"
    if not re.match(r'^[0-9:]+$', minuto_val):
        st.error("❌ Formato minuto non valido! Usa solo numeri e due punti.")
        return

    try:
        supabase.table("errori").update({"minuto": minuto_val, "descrizione": desc_val, "provenienza": "utente"}).eq("id", e_id).execute()
        if u_id:
            u_res = supabase.table("profiles").select("punti").eq("id", u_id).execute()
            if u_res.data:
                supabase.table("profiles").update({"punti": (u_res.data[0].get("punti") or 0) + int(pts)}).eq("id", u_res.data[0]["id"]).execute()
        supabase.table("storico_moderazione").insert({"film_titolo": f_tit, "minuto": minuto_val, "motivo": mot, "azione": "Contestazione Accolta", "punti_assegnati": int(pts)}).execute()
        supabase.table("voti_bloopers").delete().eq("id", c_id).execute()
        st.success("Correzione salvata con successo!")
        st.rerun()
    except Exception as e:
        st.error(f"❌ Errore: {e}")

def cb_admin_elimina_blooper(e_id, c_id, f_tit, min, mot, supabase):
    try:
        supabase.table("errori").delete().eq("id", e_id).execute()
        supabase.table("voti_bloopers").delete().eq("id", c_id).execute()
        supabase.table("storico_moderazione").insert({"film_titolo": f_tit, "minuto": min, "motivo": mot[:100], "azione": "Blooper Eliminato", "punti_assegnati": 0}).execute()
        st.success("Blooper eliminato.")
        st.rerun()
    except Exception as e:
        st.error(f"❌ Errore: {e}")

def cb_admin_ignora_cont(c_id, f_tit, min, mot, supabase):
    try:
        supabase.table("voti_bloopers").delete().eq("id", c_id).execute()
        supabase.table("storico_moderazione").insert({"film_titolo": f_tit, "minuto": min, "motivo": mot[:100], "azione": "Ignorata", "punti_assegnati": 0}).execute()
        st.success("Contestazione ignorata.")
        st.rerun()
    except Exception as e:
        st.error(f"❌ Errore: {e}")