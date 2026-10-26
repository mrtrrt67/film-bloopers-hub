-- =========================================================================
-- FILM BLOOPERS HUB - TABELLA CURIOSITÀ & RETROSCENA (MOVIE_TRIVIA)
-- Da eseguire nell'SQL Editor di Supabase (Staging prima, poi Produzione)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.movie_trivia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  film_id bigint NOT NULL REFERENCES public.films(id) ON DELETE CASCADE,
  categoria text NOT NULL DEFAULT 'Curiosità & Retroscena',
  titolo text NOT NULL,
  descrizione text NOT NULL,
  fonte text,
  approvato boolean NOT NULL DEFAULT true,
  inserito_da text DEFAULT 'IA (Sistema)',
  provenienza text DEFAULT 'ia',
  likes integer NOT NULL DEFAULT 0,
  ordine integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indici per massimizzare la velocità di query per pagina film
CREATE INDEX IF NOT EXISTS idx_movie_trivia_film_id ON public.movie_trivia (film_id);
CREATE INDEX IF NOT EXISTS idx_movie_trivia_approvato ON public.movie_trivia (approvato);
CREATE INDEX IF NOT EXISTS idx_movie_trivia_film_approvato ON public.movie_trivia (film_id, approvato);

-- Abilitazione Row Level Security (RLS)
ALTER TABLE public.movie_trivia ENABLE ROW LEVEL SECURITY;

-- 1. POLICY: Lettura pubblica consentita a tutti per curiosità approvate (anon & authenticated)
DROP POLICY IF EXISTS "Lettura pubblica movie_trivia" ON public.movie_trivia;
CREATE POLICY "Lettura pubblica movie_trivia" ON public.movie_trivia
  FOR SELECT TO public
  USING (approvato = true);

-- 2. POLICY: Utenti autenticati possono proporre curiosità (con approvato = false da moderare)
DROP POLICY IF EXISTS "Proposta curiosita utenti autenticati" ON public.movie_trivia;
CREATE POLICY "Proposta curiosita utenti autenticati" ON public.movie_trivia
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 3. POLICY: Amministratore autorizzato ha accesso completo a tutte le operazioni
DROP POLICY IF EXISTS "Admin full control movie_trivia" ON public.movie_trivia;
CREATE POLICY "Admin full control movie_trivia" ON public.movie_trivia
  FOR ALL TO authenticated
  USING (auth.jwt()->>'email' = 'mrtrrt67@gmail.com')
  WITH CHECK (auth.jwt()->>'email' = 'mrtrrt67@gmail.com');
