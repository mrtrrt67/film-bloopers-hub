import requests
from bs4 import BeautifulSoup
import time

class LetterboxdService:
    @staticmethod
    def scansiona_profilo(username: str):
        username_pulito = username.strip().lower()
        films_visti_set = set()
        watchlist_set = set()
        session = requests.Session()
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': f'https://letterboxd.com/{username_pulito}/'
        }
        
        for sottocartella in ['films', 'watchlist']:
            for page in range(1, 40):
                url = f"https://letterboxd.com/{username_pulito}/{sottocartella}/" if page == 1 else f"https://letterboxd.com/{username_pulito}/{sottocartella}/page/{page}/"
                try:
                    resp = session.get(url, headers=headers, timeout=12)
                    if resp.status_code != 200:
                        break
                    soup = BeautifulSoup(resp.content, 'html.parser')
                    posters = soup.find_all('div', class_='film-poster')
                    if not posters:
                        break
                    trovati = 0
                    for poster in posters:
                        name = poster.get('data-film-name')
                        year = poster.get('data-film-year')
                        if not name:
                            img = poster.find('img')
                            if img: name = img.get('alt')
                        if name and name != 'nan':
                            t = name.strip()
                            y = str(year).strip() if year and year != 'none' else ""
                            if sottocartella == 'films': films_visti_set.add((t, y))
                            else: watchlist_set.add((t, y))
                            trovati += 1
                    if trovati == 0:
                        break
                    time.sleep(1.2)
                except:
                    break

        tutti_film_utente_dict = {}
        for t, y in films_visti_set: tutti_film_utente_dict[(t, y)] = 'visto'
        for t, y in watchlist_set:
            if (t, y) not in tutti_film_utente_dict:
                tutti_film_utente_dict[(t, y)] = 'watchlist'
                
        return [{"titolo": k[0], "anno": k[1], "status": v} for k, v in tutti_film_utente_dict.items()]