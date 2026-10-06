import time
import json
import re
import unicodedata
from datetime import date
import streamlit as st
from google import genai
from google.genai import types

# La tua scaletta originale intatta
MODELLI_GEMINI = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-flash-latest']

def normalizza_ai(testo):
    if not testo: return ""
    nfkd = unicodedata.normalize('NFKD', str(testo))
    return re.sub(r'[^a-z0-9]', '', "".join([c for c in nfkd if not unicodedata.combining(c)]).lower())

class AIService:
    def __init__(self, api_key: str):
        if not api_key: raise ValueError("Chiave API di Gemini non trovata.")
        self.client = genai.Client(api_key=api_key)

    def _registra_errore_ia(self, supabase_client, user_obj, modello, film, operazione, errore_dettaglio):
        """Salva silenziosamente gli errori nel database senza bloccare l'app."""
        try:
            valore_utente = user_obj.email if user_obj and hasattr(user_obj, 'email') else "ospite"
            supabase_client.table("log_errori_ia").insert({
                "utente": valore_utente,
                "modello": str(modello),
                "film": str(film),
                "operazione": str(operazione),
                "errore_dettaglio": str(errore_dettaglio)
            }).execute()
        except Exception:
            pass 

    def verifica_e_incrementa_limite(self, supabase_client, user_obj, is_admin: bool) -> bool:
        oggi = str(date.today())
        if user_obj is None:
            ultimo_clic = st.session_state.get("ultimo_tempo_chiamata", 0)
            tempo_corrente = time.time()
            if tempo_corrente - ultimo_clic < 3:
                st.warning(f"⚠️ **Protezione anti-spam:** Attendi {round(3 - (tempo_corrente - ultimo_clic), 1)} secondi.")
                return False
            st.session_state.ultimo_tempo_chiamata = tempo_corrente
            if st.session_state.get("guest_date") != oggi:
                st.session_state.guest_date = oggi
                st.session_state.guest_calls = 0
            if st.session_state.guest_calls >= 6:
                st.warning("⚠️ **Limite giornaliero raggiunto:** Registrati o passa a Premium!")
                return False
            st.session_state.guest_calls += 1
            return True
        else:
            if is_admin: return True
            try:
                res = supabase_client.table("profiles").select("*").eq("id", user_obj.id).execute()
                if not res.data: return True
                prof = res.data[0]
                if prof.get("last_reset_date") != oggi:
                    prof["calls_today"] = 0
                if prof.get("tier", "free") == "free" and prof.get("calls_today", 0) >= 15:
                    st.warning("⚠️ **Limite piano Free esaurito:** Passa a Premium per ricerche illimitate!")
                    return False
                supabase_client.table("profiles").update({"calls_today": prof.get("calls_today", 0) + 1, "last_reset_date": oggi}).eq("id", user_obj.id).execute()
                return True
            except: return True

    def chiama_ia_con_retry(self, prompt, supabase_client, user_obj, is_admin, temperatura=0.0, operazione="Generale", film="N/D"):
        if not self.verifica_e_incrementa_limite(supabase_client, user_obj, is_admin): return None
        
        safety_settings = [
            types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold=types.HarmBlockThreshold.BLOCK_NONE),
            types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_HARASSMENT, threshold=types.HarmBlockThreshold.BLOCK_NONE),
            types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold=types.HarmBlockThreshold.BLOCK_NONE),
            types.SafetySetting(category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold=types.HarmBlockThreshold.BLOCK_NONE)
        ]

        for modello in MODELLI_GEMINI:
            try:
                t0 = time.time()
                resp = self.client.models.generate_content(
                    model=modello, 
                    contents=prompt, 
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json", 
                        max_output_tokens=8192, 
                        temperature=temperatura,
                        safety_settings=safety_settings
                    )
                )
                t1 = time.time()
                
                try: 
                    supabase_client.table("statistiche_ia").insert({"modello": modello, "tempo_esecuzione": round(t1-t0, 2)}).execute()
                except Exception: 
                    pass 
                    
                return resp
            
            except Exception as e:
                err_msg = str(e)
                err_str = err_msg.lower()
                
                self._registra_errore_ia(supabase_client, user_obj, modello, film, operazione, err_msg)
                
                # Se l'errore è 503, prova un breve retry sullo stesso modello
                if "503" in err_str or "service unavailable" in err_str or "overloaded" in err_str:
                    time.sleep(1.5)
                    try:
                        t0 = time.time()
                        resp = self.client.models.generate_content(
                            model=modello, 
                            contents=prompt, 
                            config=types.GenerateContentConfig(
                                response_mime_type="application/json", 
                                max_output_tokens=8192, 
                                temperature=temperatura,
                                safety_settings=safety_settings
                            )
                        )
                        t1 = time.time()
                        
                        # --- AGGIUNTO: Registra il successo anche nel retry 503 ---
                        try: 
                            supabase_client.table("statistiche_ia").insert({"modello": modello, "tempo_esecuzione": round(t1-t0, 2)}).execute()
                        except Exception: 
                            pass 
                            
                        return resp
                    except Exception:
                        pass

                continue
                
        st.warning("⚠️ I server IA sono momentaneamente sovraccarichi. Riprova tra qualche istante.")
        return None
        
    def genera_errori_per_film(self, film_id, titolo, anno, regista, attori, supabase_client, user_obj, is_admin):
        contesto = f"Titolo: '{titolo}' (Anno: {anno})\nRegista: {regista or 'N/D'}\nCast noto: {attori or 'N/D'}"
        prompt = f"""Sei un esperto di bloopers. Analizza: {contesto}
        Trova 6-8 errori dettagliati. Restituisci ESCLUSIVAMENTE array JSON:
        [ {{"minuto": "01:05:20", "categoria": "Errori di scena / Posizione", "descrizione": "Dettagli..."}} ]
        """
        try:
            resp = self.chiama_ia_con_retry(prompt, supabase_client, user_obj, is_admin, temperatura=0.0, operazione="Ricerca Bloopers", film=titolo)
            if not resp: return
            
            try:
                testo = resp.text.strip()
            except ValueError as ve:
                self._registra_errore_ia(supabase_client, user_obj, "Safety Block", titolo, "Ricerca Bloopers (Filtri)", str(ve))
                if is_admin: st.toast("⚠️ Debug Admin: Blocco Safety Ratings da Gemini.", icon="⚠️")
                return

            match = re.search(r'\[.*\]', testo, re.DOTALL)
            if match: testo = match.group(0)
            
            try:
                errori_list = json.loads(testo)
            except Exception as e_json:
                self._registra_errore_ia(supabase_client, user_obj, "JSON Parsing", titolo, "Parsing Json Bloopers", str(e_json))
                if is_admin: st.toast(f"⚠️ Debug Admin: JSON malformato.", icon="⚠️")
                return

            email = user_obj.email if user_obj else "IA (Sistema)"
            da_inserire = [{
                "film_id": film_id, "minuto": e.get("minuto", "00:00:00"),
                "categoria": e.get("categoria", "Errori di scena / Posizione"),
                "descrizione": e.get("descrizione", ""), "approvato": True,
                "inserito_da": email, "provenienza": "ia"
            } for e in errori_list]
            
            if da_inserire: 
                supabase_client.table("errori").insert(da_inserire).execute()
                
        except Exception as e_gen:
            self._registra_errore_ia(supabase_client, user_obj, "Eccezione Generale", titolo, "Generazione Bloopers", str(e_gen))

    def cerca_e_salva_saga_su_db(self, titolo, anno, cast, tutti_i_film, supabase_client, user_obj, is_admin):
        try:
            prompt = f"""
            Sei un database cinematografico ufficiale. L'utente sta cercando esattamente questo film: "{titolo}" (Anno indicato: {anno}, Regista/Attore: {cast}).
            REGOLE TASSATIVE:
            1. Se l'utente cerca un sequel numerato (es. "Lo squalo 2", "Lo squalo 3", "Alien 3"), DEVI restituire i dati specifici di quel capitolo esatto.
            2. ATTENZIONE AI TITOLI STORICI ITALIANI: Se l'utente cerca "Lo squalo 3" (uscito anche come "Jaws 3-D" o "Il cavaliere del mare" nel 1983), restituisci correttamente il film "Lo squalo 3" (1983) con il suo regista e la sua trama vera.
            3. Fornisci un oggetto JSON con una chiave "films" contenente una lista con il film trovato.
            4. La struttura JSON DEVE essere esattamente questa:
            {{
                "films": [
                    {{
                        "titolo": "Titolo ufficiale completo in italiano (es. Lo squalo 3)",
                        "anno": 1983,
                        "regista": "Nome del regista",
                        "attori": "Attori principali",
                        "genere": "Genere",
                        "trama": "Trama in italiano"
                    }}
                ]
            }}
            Restituisci ESCLUSIVAMENTE il JSON puro, senza testo aggiuntivo o blocchi markdown superflui.
            """

            response = self.chiama_ia_con_retry(prompt, supabase_client, user_obj, is_admin, temperatura=0.0, operazione="Creazione Film DB", film=titolo)
            if not response or not response.text: return 0

            # DEBUG: Mostriamo a video cosa sta dicendo l'IA prima che si rompa
            st.info(f"🕵️ DEBUG - L'IA ha risposto per il film '{titolo}'. Estrazione dati in corso...")

            testo_risposta = response.text.strip()
            
            # Utilizziamo le regex per isolare il dizionario JSON, saltando le chiacchiere iniziali o finali
            match = re.search(r'\{.*\}', testo_risposta, re.DOTALL)
            if match: 
                testo_risposta = match.group(0)
            else:
                st.error("🕵️ DEBUG - L'IA non ha restituito un formato JSON valido. Testo grezzo restituito:")
                st.text(response.text)
                return 0

            try:
                dati = json.loads(testo_risposta)
            except Exception as e_json:
                st.error(f"🕵️ DEBUG - Errore di decodifica JSON: {e_json}")
                self._registra_errore_ia(supabase_client, user_obj, "JSON Parsing", titolo, "Parsing Json Creazione Film", str(e_json))
                return 0

            film_trovati = dati.get("films", [])

            inseriti = 0
            for f in film_trovati:
                t_titolo = f.get("titolo")
                t_anno = str(f.get("anno", ""))
                
                if not t_titolo: continue

                esistente = next((db for db in tutti_i_film if db.get("titolo", "").strip().lower() == t_titolo.strip().lower() and str(db.get("anno", "")) == t_anno), None)
                
                if not esistente:
                    nuovo_record = {
                        "titolo": t_titolo,
                        "anno": t_anno,
                        "regista": f.get("regista", "N/D"),
                        "attori": f.get("attori", "N/D"),
                        "genere": f.get("genere", "N/D"),
                        "trama": f.get("trama", "Trama non disponibile.")
                    }
                    try:
                        supabase_client.table("films").insert(nuovo_record).execute()
                        st.success(f"🕵️ DEBUG - Film '{t_titolo}' salvato correttamente nel database!")
                        inseriti += 1
                    except Exception as ins_err:
                        st.error(f"🕵️ DEBUG - Errore di salvataggio su Supabase per '{t_titolo}': {ins_err}")

            return inseriti
        except Exception as e_gen:
            st.error(f"🕵️ DEBUG - Eccezione generale durante il processo per '{titolo}': {e_gen}")
            self._registra_errore_ia(supabase_client, user_obj, "Eccezione Generale", titolo, "Creazione Film DB", str(e_gen))
            return 0
 
    def completa_cast_e_dettagli(self, film_id, titolo, anno, supabase_client, user_obj, is_admin):
        with st.spinner(f"🤖 L'IA sta completando i dettagli per '{titolo}'..."):
            prompt = f"""Fornisci i dati aggiornati per il film: {titolo} ({anno}). Restituisci ESCLUSIVAMENTE JSON:
            {{"regista": "...", "attori": "...", "trama": "...", "genere": "..."}}"""
            try:
                resp = self.chiama_ia_con_retry(prompt, supabase_client, user_obj, is_admin, temperatura=0.0, operazione="Aggiornamento Dettagli", film=titolo)
                if resp and resp.text:
                    try:
                        d = json.loads(resp.text.replace("```json", "").replace("```", "").strip())
                    except Exception as e_json:
                        self._registra_errore_ia(supabase_client, user_obj, "JSON Parsing", titolo, "Parsing Json Dettagli", str(e_json))
                        return
                    supabase_client.table("films").update({"regista": d.get("regista"), "attori": d.get("attori"), "trama": d.get("trama"), "genere": d.get("genere")}).eq("id", film_id).execute()
                    st.success("Dettagli aggiornati!")
                    time.sleep(1)
                    st.rerun()
            except Exception as e_gen: 
                self._registra_errore_ia(supabase_client, user_obj, "Eccezione Generale", titolo, "Aggiornamento Dettagli", str(e_gen))

    def cerca_altri_errori_specifici(self, film_id, titolo, anno, supabase_client, user_obj, is_admin):
        with st.spinner(f"🤖 Ricerca errori inediti per '{titolo}'..."):
            esistenti = supabase_client.table("errori").select("descrizione").eq("film_id", film_id).execute().data or []
            esclusione = "\nGIÀ REGISTRATI:\n" + "\n".join([f"- {e['descrizione'][:120]}" for e in esistenti]) if esistenti else ""
            prompt = f"""Approfondisci: "{titolo}" ({anno}). {esclusione}
            Trova altri 6-8 errori COMPLETAMENTE DIVERSI. Restituisci ESCLUSIVAMENTE array JSON:
            [ {{"minuto": "...", "categoria": "...", "descrizione": "..."}} ]"""
            try:
                resp = self.chiama_ia_con_retry(prompt, supabase_client, user_obj, is_admin, temperatura=0.0, operazione="Ricerca Errori Inediti", film=titolo)
                if not resp or not resp.text: return 0
                testo = resp.text.strip()
                match = re.search(r'\[.*\]', testo, re.DOTALL)
                if match: testo = match.group(0)
                try:
                    nuovi = json.loads(testo)
                except Exception as e_json:
                    self._registra_errore_ia(supabase_client, user_obj, "JSON Parsing", titolo, "Parsing Json Errori Inediti", str(e_json))
                    return 0
                
                set_es = {normalizza_ai(e["descrizione"]) for e in esistenti}
                da_inserire = []
                for n in nuovi:
                    d_norm = normalizza_ai(n.get("descrizione", ""))
                    if not d_norm or d_norm in set_es: continue
                    set_es.add(d_norm)
                    da_inserire.append({
                        "film_id": film_id, "minuto": n.get("minuto", "00:00"),
                        "categoria": n.get("categoria", "Errori di scena / Posizione"),
                        "descrizione": n.get("descrizione"), "approvato": True,
                        "inserito_da": user_obj.email if user_obj else "IA (Sistema)", "provenienza": "ia"
                    })
                if da_inserire:
                    res = supabase_client.table("errori").insert(da_inserire).execute()
                    return len(res.data) if res.data else 0
                return 0
            except Exception as e_gen: 
                self._registra_errore_ia(supabase_client, user_obj, "Eccezione Generale", titolo, "Ricerca Errori Inediti", str(e_gen))
                return -1