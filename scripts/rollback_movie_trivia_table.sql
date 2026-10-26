-- =========================================================================
-- FILM BLOOPERS HUB - ROLLBACK TABELLA MOVIE_TRIVIA
-- Esegui questo script solo in caso di emergenza o rollback della feature
-- =========================================================================

-- Rimozione policy RLS
DROP POLICY IF EXISTS "Lettura pubblica movie_trivia" ON public.movie_trivia;
DROP POLICY IF EXISTS "Proposta curiosita utenti autenticati" ON public.movie_trivia;
DROP POLICY IF EXISTS "Admin full control movie_trivia" ON public.movie_trivia;

-- Rimozione indici
DROP INDEX IF EXISTS public.idx_movie_trivia_film_approvato;
DROP INDEX IF EXISTS public.idx_movie_trivia_approvato;
DROP INDEX IF EXISTS public.idx_movie_trivia_film_id;

-- Rimozione tabella
DROP TABLE IF EXISTS public.movie_trivia CASCADE;
