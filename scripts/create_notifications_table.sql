-- =========================================================================
-- FILM BLOOPERS HUB - TABELLA NOTIFICHE UTENTI PER CELEBRAZIONE PREMI & PUNTI
-- Esegui questo script nell'SQL Editor di Supabase
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.notifiche_utenti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'contestazione_approvata',
  titolo text NOT NULL,
  messaggio text NOT NULL,
  punti integer NOT NULL DEFAULT 10,
  film_titolo text,
  letta boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indice per velocizzare il recupero delle notifiche non lette
CREATE INDEX IF NOT EXISTS idx_notifiche_user_letta ON public.notifiche_utenti (user_id, letta);

-- Abilitazione Row Level Security (RLS)
ALTER TABLE public.notifiche_utenti ENABLE ROW LEVEL SECURITY;

-- 1. Gli utenti possono leggere solo le proprie notifiche
DROP POLICY IF EXISTS "Utenti leggono proprie notifiche" ON public.notifiche_utenti;
CREATE POLICY "Utenti leggono proprie notifiche" ON public.notifiche_utenti
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 2. Gli utenti possono segnare come lette le proprie notifiche
DROP POLICY IF EXISTS "Utenti aggiornano proprie notifiche" ON public.notifiche_utenti;
CREATE POLICY "Utenti aggiornano proprie notifiche" ON public.notifiche_utenti
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. L'amministratore e le funzioni di sistema hanno accesso completo
DROP POLICY IF EXISTS "Admin gestione notifiche" ON public.notifiche_utenti;
CREATE POLICY "Admin gestione notifiche" ON public.notifiche_utenti 
  FOR ALL TO authenticated 
  USING (auth.jwt()->>'email' = 'mrtrrt67@gmail.com') 
  WITH CHECK (auth.jwt()->>'email' = 'mrtrrt67@gmail.com');
