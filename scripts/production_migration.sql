-- =========================================================================
-- FILM BLOOPERS HUB - SCRIPT DI MIGRAZIONE DATABASE PRODUZIONE
-- Eseguire questo script su Supabase Produzione (SQL Editor) prima o subito
-- dopo il deploy del branch main.
-- Lo script è 100% IDEMPOTENTE e SICURO (non elimina dati esistenti).
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. COLONNE OPZIONALI DI GAMIFICATION & ABBONAMENTO SU PROFILES
-- -------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS punti integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS punti_premiati integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mesi_accreditati integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tipo_abbonamento text DEFAULT 'nessuno';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_type text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS data_scadenza timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Colonne di verifica per Errori e Films
ALTER TABLE public.errori ADD COLUMN IF NOT EXISTS conferme integer DEFAULT 0;
ALTER TABLE public.errori ADD COLUMN IF NOT EXISTS contestazioni integer DEFAULT 0;
ALTER TABLE public.errori ADD COLUMN IF NOT EXISTS inserito_da text;
ALTER TABLE public.errori ADD COLUMN IF NOT EXISTS provenienza text DEFAULT 'ia';
ALTER TABLE public.errori ADD COLUMN IF NOT EXISTS youtube_query text;
ALTER TABLE public.errori ADD COLUMN IF NOT EXISTS screenshot_url text;

ALTER TABLE public.films ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.films ADD COLUMN IF NOT EXISTS poster_url text;
ALTER TABLE public.films ADD COLUMN IF NOT EXISTS backdrop_url text;
ALTER TABLE public.films ADD COLUMN IF NOT EXISTS trailer_url text;

-- -------------------------------------------------------------------------
-- 2. TABELLA NOTIFICHE UTENTI (CELEBRAZIONI, PREMI E CONTESTAZIONI)
-- -------------------------------------------------------------------------
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

-- Indice per ottimizzare la verifica delle notifiche non lette
CREATE INDEX IF NOT EXISTS idx_notifiche_user_letta ON public.notifiche_utenti (user_id, letta);

-- RLS per notifiche_utenti
ALTER TABLE public.notifiche_utenti ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Utenti leggono proprie notifiche" ON public.notifiche_utenti;
CREATE POLICY "Utenti leggono proprie notifiche" ON public.notifiche_utenti
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Utenti aggiornano proprie notifiche" ON public.notifiche_utenti;
CREATE POLICY "Utenti aggiornano proprie notifiche" ON public.notifiche_utenti
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin gestione notifiche" ON public.notifiche_utenti;
CREATE POLICY "Admin gestione notifiche" ON public.notifiche_utenti 
  FOR ALL TO authenticated 
  USING (auth.jwt()->>'email' = 'mrtrrt67@gmail.com') 
  WITH CHECK (auth.jwt()->>'email' = 'mrtrrt67@gmail.com');

-- -------------------------------------------------------------------------
-- 3. HARDENING RLS TABELLA FILMS
-- -------------------------------------------------------------------------
ALTER TABLE public.films ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow delete on films" ON public.films;
DROP POLICY IF EXISTS "Aggiornamento libero films" ON public.films;
DROP POLICY IF EXISTS "Inserimento libero films" ON public.films;
DROP POLICY IF EXISTS "Films aggiornabili da autenticati" ON public.films;
DROP POLICY IF EXISTS "Films modificabili da autenticati" ON public.films;
DROP POLICY IF EXISTS "Lettura libera films" ON public.films;
DROP POLICY IF EXISTS "Films pubblici in lettura" ON public.films;
DROP POLICY IF EXISTS "Solo lettura pubblica films" ON public.films;
DROP POLICY IF EXISTS "Films lettura pubblica" ON public.films;

CREATE POLICY "Films lettura pubblica" ON public.films 
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admin gestione completa films" ON public.films;
CREATE POLICY "Admin gestione completa films" ON public.films 
  FOR ALL TO authenticated 
  USING (auth.jwt()->>'email' = 'mrtrrt67@gmail.com') 
  WITH CHECK (auth.jwt()->>'email' = 'mrtrrt67@gmail.com');

-- -------------------------------------------------------------------------
-- 4. HARDENING RLS TABELLA ERRORI (BLOOPERS)
-- -------------------------------------------------------------------------
ALTER TABLE public.errori ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow delete on errori" ON public.errori;
DROP POLICY IF EXISTS "Aggiornamento libero errori" ON public.errori;
DROP POLICY IF EXISTS "Inserimento libero errori" ON public.errori;
DROP POLICY IF EXISTS "Eliminazione errori" ON public.errori;
DROP POLICY IF EXISTS "Modifica errori" ON public.errori;
DROP POLICY IF EXISTS "Lettura libera errori" ON public.errori;
DROP POLICY IF EXISTS "Errori pubblici" ON public.errori;
DROP POLICY IF EXISTS "Lettura pubblica errori" ON public.errori;
DROP POLICY IF EXISTS "Solo lettura pubblica errori" ON public.errori;
DROP POLICY IF EXISTS "Aggiornamento voti errori per utenti autenticati" ON public.errori;
DROP POLICY IF EXISTS "Inserimento errori autenticati" ON public.errori;
DROP POLICY IF EXISTS "Errori approvati lettura pubblica" ON public.errori;
DROP POLICY IF EXISTS "Errori propri lettura autenticati" ON public.errori;
DROP POLICY IF EXISTS "Errori inserimento utenti autenticati" ON public.errori;

CREATE POLICY "Errori approvati lettura pubblica" ON public.errori 
  FOR SELECT TO public USING (approvato = true);

CREATE POLICY "Errori propri lettura autenticati" ON public.errori 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Errori inserimento utenti autenticati" ON public.errori 
  FOR INSERT TO authenticated WITH CHECK (approvato = false);

DROP POLICY IF EXISTS "Admin gestione completa errori" ON public.errori;
CREATE POLICY "Admin gestione completa errori" ON public.errori 
  FOR ALL TO authenticated 
  USING (auth.jwt()->>'email' = 'mrtrrt67@gmail.com') 
  WITH CHECK (auth.jwt()->>'email' = 'mrtrrt67@gmail.com');

-- -------------------------------------------------------------------------
-- 5. HARDENING RLS TABELLA VOTI_BLOOPERS
-- -------------------------------------------------------------------------
ALTER TABLE public.voti_bloopers ADD COLUMN IF NOT EXISTS motivo text;
ALTER TABLE public.voti_bloopers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow delete on voti_bloopers" ON public.voti_bloopers;
DROP POLICY IF EXISTS "Gestione propri voti" ON public.voti_bloopers;
DROP POLICY IF EXISTS "Gestione propri voti bloopers" ON public.voti_bloopers;
DROP POLICY IF EXISTS "Voti pubblici" ON public.voti_bloopers;
DROP POLICY IF EXISTS "Voti lettura pubblica" ON public.voti_bloopers;
DROP POLICY IF EXISTS "Gestione propri voti autenticati" ON public.voti_bloopers;

CREATE POLICY "Voti lettura pubblica" ON public.voti_bloopers 
  FOR SELECT TO public USING (true);

CREATE POLICY "Gestione propri voti autenticati" ON public.voti_bloopers 
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin gestione completa voti" ON public.voti_bloopers;
CREATE POLICY "Admin gestione completa voti" ON public.voti_bloopers 
  FOR ALL TO authenticated 
  USING (auth.jwt()->>'email' = 'mrtrrt67@gmail.com') 
  WITH CHECK (auth.jwt()->>'email' = 'mrtrrt67@gmail.com');

-- -------------------------------------------------------------------------
-- 6. HARDENING RLS TABELLA CONFIGURAZIONI
-- -------------------------------------------------------------------------
ALTER TABLE public.configurazioni ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Configurazioni modificabili admin" ON public.configurazioni;
DROP POLICY IF EXISTS "Configurazioni pubbliche lettura" ON public.configurazioni;
DROP POLICY IF EXISTS "Configurazioni lettura pubblica" ON public.configurazioni;

CREATE POLICY "Configurazioni lettura pubblica" ON public.configurazioni 
  FOR SELECT TO public USING (visibile = true);

DROP POLICY IF EXISTS "Admin gestione completa configurazioni" ON public.configurazioni;
CREATE POLICY "Admin gestione completa configurazioni" ON public.configurazioni 
  FOR ALL TO authenticated 
  USING (auth.jwt()->>'email' = 'mrtrrt67@gmail.com') 
  WITH CHECK (auth.jwt()->>'email' = 'mrtrrt67@gmail.com');

-- -------------------------------------------------------------------------
-- 7. PERMESSI AMMINISTRATORE SU SUGGERIMENTI E PROFILES
-- -------------------------------------------------------------------------
ALTER TABLE public.suggerimenti ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gestione completa suggerimenti" ON public.suggerimenti;
CREATE POLICY "Admin gestione completa suggerimenti" ON public.suggerimenti 
  FOR ALL TO authenticated 
  USING (auth.jwt()->>'email' = 'mrtrrt67@gmail.com') 
  WITH CHECK (auth.jwt()->>'email' = 'mrtrrt67@gmail.com');

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gestione completa profili" ON public.profiles;
CREATE POLICY "Admin gestione completa profili" ON public.profiles 
  FOR ALL TO authenticated 
  USING (auth.jwt()->>'email' = 'mrtrrt67@gmail.com') 
  WITH CHECK (auth.jwt()->>'email' = 'mrtrrt67@gmail.com');

-- -------------------------------------------------------------------------
-- 8. TRIGGER ANTI-ESCALATION SU PROFILES (PREVIENE PRIVILEGE ESCALATION)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF (current_user != 'service_role' AND auth.role() != 'service_role' AND COALESCE(auth.jwt()->>'email', '') != 'mrtrrt67@gmail.com') THEN
    NEW.tier := OLD.tier;
    NEW.tipo_abbonamento := OLD.tipo_abbonamento;
    NEW.subscription_type := OLD.subscription_type;
    NEW.is_admin := OLD.is_admin;
    NEW.punti := OLD.punti;
    NEW.punti_premiati := OLD.punti_premiati;
    NEW.mesi_accreditati := OLD.mesi_accreditati;
    NEW.data_scadenza := OLD.data_scadenza;
    NEW.expires_at := OLD.expires_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_privileged_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileged_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileged_columns();

-- -------------------------------------------------------------------------
-- 9. TABELLE DI LOGGING DI SISTEMA (SE NON PRESENTI)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.log_accessi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.log_ricerche (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  termine text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- =========================================================================
-- FINE SCRIPT: Tutte le istruzioni sono completate con successo.
-- =========================================================================
