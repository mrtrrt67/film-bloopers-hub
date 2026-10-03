import requests
import re
import unicodedata

class TMDBService:
    def __init__(self, api_key=None):
        import streamlit as st
        self.api_key = api_key or st.secrets.get("TMDB_API_KEY", "")

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

            # Gestione mirata delle varianti: se è il primo Pirati dei Caraibi, includiamo anche il titolo inglese nativo di TMDB
            titoli_da_testare = []
            if titolo:
                titoli_da_testare.append(titolo)
                if "pirati dei caraibi" in titolo.lower() and ("maledizione" in titolo.lower() or "prima luna" in titolo.lower()):
                    titoli_da_testare.append("Pirates of the Caribbean: The Curse of the Black Pearl")

                clean_t = re.split(r'[-–:—\(]', titolo)[0].strip()
                if clean_t and clean_t.lower() != titolo.lower():
                    titoli_da_testare.append(clean_t)

            # 2. Tentativo di ricerca con convalida rigorosa del risultato
            for t in set(titoli_da_testare):
                url_search = f"https://api.themoviedb.org/3/search/movie?api_key={self.api_key}&query={requests.utils.quote(t)}"
                if anno_str:
                    url_search += f"&year={anno_str}"
                
                resp = requests.get(url_search, timeout=5)
                if resp.status_code == 200:
                    results = resp.json().get("results", [])
                    for r in results:
                        titolo_trovato = (r.get("title") or "").lower()
                        overview = (r.get("overview") or "").lower()
                        release_date = r.get("release_date", "")
                        
                        # FILTRO ANTI-SCHERZO (Scartiamo cartoni animati o omonimie se cerchiamo Pirati dei Caraibi)
                        if "pirati dei caraibi" in titolo.lower():
                            if "scooby" in titolo_trovato or "scooby" in overview:
                                continue # Salta Scooby-Doo!
                        
                        # Se l'anno corrisponde o il titolo ha un match forte, prendiamolo
                        if not anno_str or release_date.startswith(anno_str):
                            if r.get("poster_path"):
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