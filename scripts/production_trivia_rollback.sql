-- =========================================================================
-- FILM BLOOPERS HUB - ROLLBACK PRODUZIONE: TABELLA MOVIE_TRIVIA
-- Esegui questo script nell'SQL Editor di Supabase solo in caso di emergenza
-- =========================================================================

-- 1. Rimozione policy di sicurezza RLS
DROP POLICY IF EXISTS "Lettura pubblica movie_trivia" ON public.movie_trivia;
DROP POLICY IF EXISTS "Proposta curiosita utenti autenticati" ON public.movie_trivia;
DROP POLICY IF EXISTS "Admin full control movie_trivia" ON public.movie_trivia;

-- 2. Rimozione indici
DROP INDEX IF EXISTS public.idx_movie_trivia_film_approvato;
DROP INDEX IF EXISTS public.idx_movie_trivia_approvato;
DROP INDEX IF EXISTS public.idx_movie_trivia_film_id;

-- 3. Eliminazione tabella
DROP TABLE IF EXISTS public.movie_trivia CASCADE;
