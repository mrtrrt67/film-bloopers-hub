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
        try:
            supabase_client.table("films").update({"poster_url": None}).eq("id", film_id).execute()
        except Exception:
            pass
        return self.get_or_fetch_poster(film_id, titolo, anno, supabase_client)

    def get_or_fetch_poster(self, film_id, titolo, anno, supabase_client):
        try:
            res = supabase_client.table("films").select("poster_url").eq("id", film_id).execute()
            if res.data and res.data[0].get("poster_url"):
                url_esistente = res.data[0].get("poster_url")
                if url_esistente.startswith("http"):
                    return url_esistente

            if not self.api_key:
                return None

            poster_url = None
            anno_str = str(anno).strip() if anno else ""

            titoli_da_testare = []
            if titolo:
                titoli_da_testare.append(titolo)
                t_lower = titolo.lower()
                if "leggenda del pianista sull'oceano" in t_lower:
                    titoli_da_testare.append("The Legend of 1900")
                elif "pirati dei caraibi" in t_lower:
                    titoli_da_testare.append("Pirates of the Caribbean: The Curse of the Black Pearl")

                titolo_pulito_parentesi = re.sub(r'\s*\(\d{4}\)', '', titolo).strip()
                if titolo_pulito_parentesi not in titoli_da_testare:
                    titoli_da_testare.append(titolo_pulito_parentesi)

                clean_t = re.split(r'[-–:—]', titolo_pulito_parentesi)[0].strip()
                if clean_t and clean_t.lower() not in [t.lower() for t in titoli_da_testare]:
                    titoli_da_testare.append(clean_t)

            for usa_anno in [True, False]:
                if poster_url:
                    break
                if not usa_anno and not anno_str:
                    continue 

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
                            
                            if "pirati dei caraibi" in titolo.lower() and ("scooby" in titolo_trovato or "scooby" in overview):
                                continue
                            
                            if r.get("poster_path"):
                                if not usa_anno and anno_str and release_date:
                                    anno_film_trovato = release_date.split("-")[0]
                                    try:
                                        if abs(int(anno_film_trovato) - int(anno_str)) > 1:
                                            continue 
                                    except ValueError:
                                        pass

                                poster_url = f"https://image.tmdb.org/t/p/w500{r.get('poster_path')}"
                                break
                        if poster_url:
                            break

            if poster_url:
                supabase_client.table("films").update({"poster_url": poster_url}).eq("id", film_id).execute()
                return poster_url

        except Exception as e:
            print(f"Errore TMDB Poster: {e}")
            
        return None

 def get_or_fetch_cast(self, film_id, titolo, anno, supabase_client):
        """Cerca il film su TMDB usando la stessa logica robusta delle locandine e recupera il cast."""
        try:
            res = supabase_client.table("films").select("attori").eq("id", film_id).execute()
            if res.data and res.data[0].get("attori"):
                attori_esistenti = res.data[0].get("attori")
                if str(attori_esistenti).strip():
                    return attori_esistenti

            if not self.api_key:
                return None

            movie_id = None
            anno_str = str(anno).strip() if anno else ""

            # Sfruttiamo esattamente la stessa preparazione dei titoli robusta dei poster
            titoli_da_testare = []
            if titolo:
                titoli_da_testare.append(titolo)
                t_lower = titolo.lower()
                if "leggenda del pianista sull'oceano" in t_lower:
                    titoli_da_testare.append("The Legend of 1900")
                elif "pirati dei caraibi" in t_lower:
                    titoli_da_testare.append("Pirates of the Caribbean: The Curse of the Black Pearl")

                titolo_pulito_parentesi = re.sub(r'\s*\(\d{4}\)', '', titolo).strip()
                if titolo_pulito_parentesi not in titoli_da_testare:
                    titoli_da_testare.append(titolo_pulito_parentesi)

                clean_t = re.split(r'[-–:—]', titolo_pulito_parentesi)[0].strip()
                if clean_t and clean_t.lower() not in [t.lower() for t in titoli_da_testare]:
                    titoli_da_testare.append(clean_t)

            for usa_anno in [True, False]:
                if movie_id:
                    break
                if not usa_anno and not anno_str:
                    continue

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
                            release_date = r.get("release_date", "")
                            if not usa_anno and anno_str and release_date:
                                anno_film_trovato = release_date.split("-")[0]
                                try:
                                    if abs(int(anno_film_trovato) - int(anno_str)) > 1:
                                        continue
                                except ValueError:
                                    pass
                            
                            movie_id = r.get("id")
                            break
                        if movie_id:
                            break

            # Se troviamo l'ID, peschiamo il cast dai credits di TMDB
            if movie_id:
                url_credits = f"https://api.themoviedb.org/3/movie/{movie_id}/credits?api_key={self.api_key}"
                resp_cred = requests.get(url_credits, timeout=5)
                if resp_cred.status_code == 200:
                    cast_list = resp_cred.json().get("cast", [])
                    nomi_attori = [c.get("name") for c in cast_list[:5] if c.get("name")]
                    if nomi_attori:
                        stringa_cast = ", ".join(nomi_attori)
                        supabase_client.table("films").update({"attori": stringa_cast}).eq("id", film_id).execute()
                        return stringa_cast

        except Exception as e:
            print(f"Errore TMDB Cast: {e}")

        return None