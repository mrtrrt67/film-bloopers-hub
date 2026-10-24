from services.tmdb_service import TMDBService

tmdb = TMDBService()
print(f"Chiave caricata (lunghezza): {len(tmdb.api_key) if tmdb.api_key else 0} caratteri")

# Elenca i metodi disponibili nella classe per vedere come si chiama la ricerca
metodi = [m for m in dir(tmdb) if not m.startswith('_')]
print("Metodi disponibili in TMDBService:", metodi)