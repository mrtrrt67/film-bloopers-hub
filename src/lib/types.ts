export interface Film {
  id: string | number;
  titolo: string;
  anno?: string | number | null;
  regista?: string | null;
  attori?: string | null;
  genere?: string | null;
  trama?: string | null;
  poster_url?: string | null;
  tmdb_id?: number | null;
  original_title?: string | null;
  backdrop_url?: string | null;
  tmdb_collection_id?: number | null;
  slug?: string;
  creato_il?: string;
  created_at?: string;
}

export type BlooperCategoria =
  | "Errori di scena / Posizione"
  | "Troupe o microfoni visibili"
  | "Anacronismi"
  | "Errori storici o fattuali"
  | string;

export interface Blooper {
  id: string | number;
  film_id: string | number;
  minuto: string;
  categoria: BlooperCategoria;
  descrizione: string;
  approvato: boolean;
  inserito_da?: string | null;
  provenienza?: "ia" | "utente";
  creato_il?: string;
  created_at?: string;
  conferme?: number;
  contestazioni?: number;
  attendibilita?: number;
  voto_utente?: "conferma" | "contestazione" | null;
}

export type TriviaCategoria =
  | "Curiosità & Retroscena"
  | "Aneddoti dal set"
  | "Casting & Scelte"
  | "Segreti di produzione"
  | "Effetti speciali & Trucco"
  | "Citazioni & Easter Egg"
  | string;

export interface MovieTrivia {
  id: string;
  film_id: string | number;
  categoria: TriviaCategoria;
  titolo: string;
  descrizione: string;
  fonte?: string | null;
  approvato: boolean;
  inserito_da?: string | null;
  provenienza?: "ia" | "utente";
  likes?: number;
  ordine?: number;
  created_at?: string;
}

export interface Profile {
  id: string;
  email: string;
  punti: number;
  tier: "free" | "premium" | "admin";
  tipo_abbonamento?: "mensile" | "annuale" | "lifetime" | "nessuno" | null;
  subscription_type?: string | null;
  data_scadenza?: string | null;
  mesi_accreditati?: number;
  calls_today?: number;
  last_reset_date?: string | null;
  is_admin?: boolean;
}

export interface VotoBlooper {
  id?: string;
  errore_id: string | number;
  user_id: string;
  tipo: "conferma" | "contestazione";
  created_at?: string;
}

export interface Configurazione {
  chiave: string;
  valore: string;
  visibile?: boolean;
}

export interface TMDBMovieResult {
  id: number;
  title: string;
  original_title: string;
  release_date?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genre_ids?: number[];
  vote_average?: number;
  media_type?: string;
}

export interface TMDBMovieDetails extends TMDBMovieResult {
  runtime?: number;
  imdb_id?: string | null;
  vote_count?: number;
  genres?: { id: number; name: string }[];
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path?: string;
    backdrop_path?: string;
  } | null;
  credits?: {
    cast: { id: number; name: string; character: string; profile_path?: string }[];
    crew: { id: number; name: string; job: string }[];
  };
  "watch/providers"?: any;
  watch_providers?: any;
}

export interface WatchProviderItem {
  id: number;
  name: string;
  logoUrl: string | null;
}

export interface FilmStreamingInfo {
  isOnPrimeVideo: boolean;
  isPrimeFlatrate: boolean;
  isPrimeRentBuy: boolean;
  flatrate: WatchProviderItem[];
  rentOrBuy: WatchProviderItem[];
  justWatchLink?: string | null;
}

export interface FilmRatingInfo {
  rating: number;
  voteCount?: number;
  imdbId?: string | null;
  imdbUrl: string;
  streaming?: FilmStreamingInfo | null;
}
