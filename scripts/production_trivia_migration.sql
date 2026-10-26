-- =========================================================================
-- FILM BLOOPERS HUB - MIGRAZIONE PRODUZIONE: TABELLA MOVIE_TRIVIA
-- Esegui questo script nell'SQL Editor di Supabase sul DB di PRODUZIONE
-- (Progetto: https://supabase.com/dashboard/project/gmiwhscbqvadnlqruhjs/sql)
-- =========================================================================

-- 1. Creazione Tabella movie_trivia
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

-- 2. Indici per performance ottimali
CREATE INDEX IF NOT EXISTS idx_movie_trivia_film_id ON public.movie_trivia (film_id);
CREATE INDEX IF NOT EXISTS idx_movie_trivia_approvato ON public.movie_trivia (approvato);
CREATE INDEX IF NOT EXISTS idx_movie_trivia_film_approvato ON public.movie_trivia (film_id, approvato);

-- 3. Abilitazione Row Level Security (RLS)
ALTER TABLE public.movie_trivia ENABLE ROW LEVEL SECURITY;

-- 4. Assegnazione permessi ai ruoli Supabase
GRANT ALL ON TABLE public.movie_trivia TO postgres, service_role;
GRANT SELECT, INSERT ON TABLE public.movie_trivia TO anon, authenticated;
GRANT UPDATE, DELETE ON TABLE public.movie_trivia TO authenticated;

-- 5. Policy RLS: Lettura pubblica consentita a tutti per curiosità approvate
DROP POLICY IF EXISTS "Lettura pubblica movie_trivia" ON public.movie_trivia;
CREATE POLICY "Lettura pubblica movie_trivia" ON public.movie_trivia
  FOR SELECT TO public
  USING (approvato = true);

-- 6. Policy RLS: Utenti autenticati possono proporre/inserire curiosità
DROP POLICY IF EXISTS "Proposta curiosita utenti autenticati" ON public.movie_trivia;
CREATE POLICY "Proposta curiosita utenti autenticati" ON public.movie_trivia
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 7. Policy RLS: Amministratore (mrtrrt67@gmail.com) ha controllo totale
DROP POLICY IF EXISTS "Admin full control movie_trivia" ON public.movie_trivia;
CREATE POLICY "Admin full control movie_trivia" ON public.movie_trivia
  FOR ALL TO authenticated
  USING (auth.jwt()->>'email' = 'mrtrrt67@gmail.com')
  WITH CHECK (auth.jwt()->>'email' = 'mrtrrt67@gmail.com');
