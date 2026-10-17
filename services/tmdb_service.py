import os
import streamlit as st
import re
import requests
import unicodedata

class TMDBService:
    def __init__(self, api_key=None):
        import streamlit as st
        self.api_key = api_key or os.getenv("TMDB_API_KEY") or st.secrets.get("TMDB_API_KEY", "")

    def force_refresh_poster(self, film_id, titolo, anno, supabase_client):
        # Svuotiamo prima il poster nel DB per forzare il ricalcolo fresco
        try:
            supabase_client.table("films").update({"poster_url": None}).eq("id", film_id).execute()
        except Exception:
            pass
        # Richiamiamo il metodo standard che lo ricercherà e salverà di nuovo
        return self.get_or_fetch_poster(film_id, titolo, anno, supabase_client)

    def get_or_fetch_poster(self, film_id, titolo, anno, supabase_client):
        try:
            # 1. Controllo se nel DB esiste già un poster_url valido
            res = supabase_client.table("films").select("poster_url").eq("id", film_id).execute()
            if res.data and res.data[0].get("poster_url"):
                url_esistente = res.data[0].get("poster_url")
                if url_esistente.startswith("http"):
                    return url_esistente

            if not self.api_key:
                return None

            poster_url = None
            anno_str = str(anno).strip() if anno else ""

            # Preparazione dei titoli da testare per massimizzare la compatibilità
            titoli_da_testare = []
            if titolo:
                # Aggiungiamo il titolo originale così com'è
                titoli_da_testare.append(titolo)
                
                # Casi particolari noti o traduzioni internazionali
                t_lower = titolo.lower()
                if "leggenda del pianista sull'oceano" in t_lower:
                    titoli_da_testare.append("The Legend of 1900")
                elif "pirati dei caraibi" in t_lower:
                    titoli_da_testare.append("Pirates of the Caribbean: The Curse of the Black Pearl")

                # Pulizia di base rimuovendo eventuale anno tra parentesi se presente nel titolo
                titolo_pulito_parentesi = re.sub(r'\s*\(\d{4}\)', '', titolo).strip()
                if titolo_pulito_parentesi not in titoli_da_testare:
                    titoli_da_testare.append(titolo_pulito_parentesi)

                # Estrazione della prima parte prima di trattini o due punti
                clean_t = re.split(r'[-–:—]', titolo_pulito_parentesi)[0].strip()
                if clean_t and clean_t.lower() not in [t.lower() for t in titoli_da_testare]:
                    titoli_da_testare.append(clean_t)

            # 2. Tentativo di ricerca con strategie multiple (prima con anno, poi senza anno se fallisce)
            for usa_anno in [True, False]:
                if poster_url:
                    break
                if not usa_anno and not anno_str:
                    continue # Evitiamo di rifare la stessa identica chiamata se non c'è l'anno

                for t in set(titoli_da_testare):
                    if not t:
                        continue
                    
                    url_search = f"https://api.themoviedb.org/3/search/movie?api_key={self.api_key}&query={requests.utils.quote(t)}"
                    if usa_anno and anno_str:
                        url_search += f"&year={anno_str}"
                    
                    resp = requests.get(url_search, timeout=5)
                    if resp.status_code == 200:
                        results = resp.json().get("results", [])
                        for r in results:
                            titolo_trovato = (r.get("title") or "").lower()
                            overview = (r.get("overview") or "").lower()
                            release_date = r.get("release_date", "")
                            
                            # Filtri di sicurezza anti-omonimia
                            if "pirati dei caraibi" in titolo.lower() and ("scooby" in titolo_trovato or "scooby" in overview):
                                continue
                            
                            # Se abbiamo trovato un poster valido, lo prendiamo
                            if r.get("poster_path"):
                                # Se stavamo cercando senza anno, verifichiamo che l'anno sia ragionevolmente vicino (es. +/- 1 anno) o che il titolo sia un match fortissimo
                                if not usa_anno and anno_str and release_date:
                                    anno_film_trovato = release_date.split("-")[0]
                                    try:
                                        if abs(int(anno_film_trovato) - int(anno_str)) > 1:
                                            continue # Scartiamo se l'anno è troppo distante
                                    except ValueError:
                                        pass

                                poster_url = f"https://image.tmdb.org/t/p/w500{r.get('poster_path')}"
                                break
                        if poster_url:
                            break

            # 3. Salvataggio persistente su Supabase
            if poster_url:
                supabase_client.table("films").update({"poster_url": poster_url}).eq("id", film_id).execute()
                return poster_url

        except Exception as e:
            print(f"Errore TMDB: {e}")
            
        return None