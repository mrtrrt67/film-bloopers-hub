from services.tmdb_service import TMDBService

# Inizializza il servizio TMDB
tmdb = TMDBService()

print(f"Chiave caricata (lunghezza): {len(tmdb.api_key) if tmdb.api_key else 0} caratteri")

# Proviamo a cercare direttamente 'La leggenda del pianista sull''oceano' o un altro film
risultato = tmdb.cerca_film("La leggenda del pianista sull'oceano", 1998)

print("Risultato della ricerca TMDB:", risultato)