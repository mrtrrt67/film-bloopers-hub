-- =========================================================================
-- FILM BLOOPERS HUB - FIX DEFINITIVO POLICY RLS PER MOVIE_TRIVIA ED ERRORI
-- Risolve: "new row violates row-level security policy for table 'movie_trivia'"
-- Da eseguire nell'SQL Editor del Supabase Dashboard (sia Staging che Produzione)
-- =========================================================================

-- 1. ASSEGNAZIONE PERMESSI DI INSERIMENTO AI RUOLI WEB
GRANT SELECT, INSERT ON TABLE public.movie_trivia TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.errori TO anon, authenticated, service_role;

-- 2. TABELLA MOVIE_TRIVIA: POLICY AGGIORNATA
DROP POLICY IF EXISTS "Trivia inserimento consentito" ON public.movie_trivia;
DROP POLICY IF EXISTS "Proposta curiosita utenti autenticati" ON public.movie_trivia;

CREATE POLICY "Trivia inserimento consentito" ON public.movie_trivia 
  FOR INSERT TO authenticated, anon, service_role 
  WITH CHECK (
    approvato = false 
    OR LOWER(provenienza) IN ('ia', 'ia verificata') 
    OR COALESCE(auth.jwt()->>'email', '') = 'mrtrrt67@gmail.com'
  );

-- 3. TABELLA ERRORI: POLICY AGGIORNATA
DROP POLICY IF EXISTS "Errori inserimento consentito" ON public.errori;
DROP POLICY IF EXISTS "Errori inserimento utenti autenticati" ON public.errori;

CREATE POLICY "Errori inserimento consentito" ON public.errori 
  FOR INSERT TO authenticated, anon, service_role 
  WITH CHECK (
    approvato = false 
    OR LOWER(provenienza) IN ('ia', 'ia verificata') 
    OR COALESCE(auth.jwt()->>'email', '') = 'mrtrrt67@gmail.com'
  );

-- 4. VERIFICA CHE LE TABELLE ABBIANO RLS ABILITATO
ALTER TABLE public.movie_trivia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.errori ENABLE ROW LEVEL SECURITY;
