-- =========================================================================
-- FILM BLOOPERS HUB - FIX RLS ERRORI & GENERAZIONE BLOOPERS IA
-- Risolve l'errore: "New row violates row level security policy for table errori"
-- Da eseguire nell'SQL Editor di Supabase
-- =========================================================================

-- 1. TABELLA ERRORI: AGGIORNAMENTO POLICY INSERIMENTO
-- Consente agli utenti autenticati (Free, Premium, Lifetime, Admin) di inserire:
-- - Bloopers generati tramite IA (provenienza = 'ia' e approvato = true)
-- - Segnalazioni manuali dalla community (approvato = false)
DROP POLICY IF EXISTS "Errori inserimento utenti autenticati" ON public.errori;
DROP POLICY IF EXISTS "Errori inserimento consentito" ON public.errori;

CREATE POLICY "Errori inserimento consentito" ON public.errori 
  FOR INSERT TO authenticated, service_role 
  WITH CHECK (
    approvato = false 
    OR provenienza = 'ia' 
    OR COALESCE(auth.jwt()->>'email', '') = 'mrtrrt67@gmail.com'
  );

-- 2. TABELLA FILMS: CONSENTI IMPORTAZIONE NUOVI FILM DA TMDB PER UTENTI AUTENTICATI
-- Permette agli utenti di importare nuovi film nel catalogo da TMDB
DROP POLICY IF EXISTS "Films inserimento autenticati" ON public.films;
CREATE POLICY "Films inserimento autenticati" ON public.films 
  FOR INSERT TO authenticated, service_role 
  WITH CHECK (true);

-- 3. TABELLA PROFILES: FIX TRIGGER ANTI-ESCALATION (RIMOZIONE is_admin INESISTENTE)
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF (current_user != 'service_role' AND auth.role() != 'service_role' AND COALESCE(auth.jwt()->>'email', '') != 'mrtrrt67@gmail.com') THEN
    NEW.tier := OLD.tier;
    NEW.tipo_abbonamento := OLD.tipo_abbonamento;
    NEW.subscription_type := OLD.subscription_type;
    NEW.punti := OLD.punti;
    NEW.punti_premiati := OLD.punti_premiati;
    NEW.mesi_accreditati := OLD.mesi_accreditati;
    NEW.data_scadenza := OLD.data_scadenza;
    NEW.expires_at := OLD.expires_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_profile_privileged_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileged_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileged_columns();
