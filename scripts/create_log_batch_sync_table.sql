-- =========================================================================
-- FILM BLOOPERS HUB - TABELLA LOG ESECUZIONI BATCH & DAILY SYNC
-- =========================================================================
-- Esegui questo script in Supabase Dashboard -> SQL Editor per attivare
-- la persistenza relazionale permanente dei log dei batch notturni e manuali.

CREATE TABLE IF NOT EXISTS public.log_batch_sync (
  id text PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_sec integer DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  status_label text,
  trigger text DEFAULT 'schedule',
  target_env text DEFAULT 'production',
  mode text DEFAULT 'both',
  films_total_catalog integer DEFAULT 0,
  films_scanned integer DEFAULT 0,
  films_modified_count integer DEFAULT 0,
  films_skipped_count integer DEFAULT 0,
  bloopers_added integer DEFAULT 0,
  trivia_added integer DEFAULT 0,
  old_trivia_cleaned integer DEFAULT 0,
  errors_count integer DEFAULT 0,
  ai_calls_count integer DEFAULT 0,
  estimated_tokens integer DEFAULT 0,
  estimated_cost_eur numeric(10, 5) DEFAULT 0,
  model_primary text DEFAULT 'gemini-flash-lite-latest',
  modified_films jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indici per performance query di consultazione
CREATE INDEX IF NOT EXISTS idx_log_batch_sync_started ON public.log_batch_sync (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_log_batch_sync_status ON public.log_batch_sync (status);

-- RLS & Permessi di Sicurezza
ALTER TABLE public.log_batch_sync ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.log_batch_sync TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Log batch sync inserimento aperto" ON public.log_batch_sync;
DROP POLICY IF EXISTS "Log batch sync gestione admin" ON public.log_batch_sync;

-- Inserimento consentito a workflow e script backend
CREATE POLICY "Log batch sync inserimento aperto" ON public.log_batch_sync
  FOR INSERT TO authenticated, anon, service_role
  WITH CHECK (true);

-- Consultazione e gestione riservata all'Admin autorizzato
CREATE POLICY "Log batch sync gestione admin" ON public.log_batch_sync
  FOR ALL TO authenticated
  USING (COALESCE(auth.jwt()->>'email', '') = 'mrtrrt67@gmail.com')
  WITH CHECK (COALESCE(auth.jwt()->>'email', '') = 'mrtrrt67@gmail.com');

