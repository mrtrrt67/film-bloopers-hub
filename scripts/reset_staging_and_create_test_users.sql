-- =========================================================================
-- FILM BLOOPERS HUB - RESET DATABASE STAGING & CREAZIONE UTENTI DI TEST
-- Esegui questo script nell'SQL Editor di Supabase sul DB di STAGING
-- (https://supabase.com/dashboard/project/hktzscarmerpbgxgxliq/sql)
-- =========================================================================

-- 1. Pulizia tabelle correlate (voti, contestazioni, suggerimenti)
DELETE FROM public.voti_bloopers;
DELETE FROM public.suggerimenti;
UPDATE public.errori SET conferme = 0, contestazioni = 0;
DELETE FROM public.errori WHERE approvato = false;

-- 2. Eliminazione di TUTTI gli utenti da public.profiles e auth.users (tranne l'admin mrtrrt67@gmail.com)
DELETE FROM public.profiles WHERE LOWER(email) <> 'mrtrrt67@gmail.com';
DELETE FROM auth.users WHERE LOWER(email) <> 'mrtrrt67@gmail.com';

-- Assicura che l'admin abbia i privilegi e lo stato corretto
UPDATE public.profiles 
SET is_admin = true,
    tier = 'premium',
    tipo_abbonamento = 'lifetime',
    punti = 50
WHERE LOWER(email) = 'mrtrrt67@gmail.com';

-- 3. Estensione pgcrypto per cifratura password
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 4. Creazione UTENTE 1: FREE (Username: utente_free | Password: Password123!)
DO $$
DECLARE
  free_uid uuid := gen_random_uuid();
  enc_pwd text := crypt('Password123!', gen_salt('bf'));
BEGIN
  -- Inserimento in auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    free_uid,
    'authenticated',
    'authenticated',
    'free@filmbloopers.online',
    enc_pwd,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"username":"utente_free"}',
    now(),
    now(),
    '',
    ''
  );

  -- Inserimento identità per login GoTrue
  INSERT INTO auth.identities (
    id,
    user_id,
    provider,
    provider_id,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    free_uid,
    'email',
    free_uid::text,
    jsonb_build_object('sub', free_uid::text, 'email', 'free@filmbloopers.online'),
    now(),
    now(),
    now()
  );

  -- Profilo pubblico
  INSERT INTO public.profiles (
    id,
    email,
    username,
    tier,
    tipo_abbonamento,
    subscription_type,
    punti,
    punti_premiati,
    mesi_accreditati,
    is_admin
  ) VALUES (
    free_uid,
    'free@filmbloopers.online',
    'utente_free',
    'free',
    'nessuno',
    'nessuno',
    0,
    0,
    0,
    false
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    tier = 'free',
    tipo_abbonamento = 'nessuno',
    punti = 0,
    is_admin = false;
END $$;


-- 5. Creazione UTENTE 2: PREMIUM (Username: utente_premium | Password: Password123!)
DO $$
DECLARE
  prem_uid uuid := gen_random_uuid();
  enc_pwd text := crypt('Password123!', gen_salt('bf'));
BEGIN
  -- Inserimento in auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    prem_uid,
    'authenticated',
    'authenticated',
    'premium@filmbloopers.online',
    enc_pwd,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"username":"utente_premium"}',
    now(),
    now(),
    '',
    ''
  );

  -- Inserimento identità per login GoTrue
  INSERT INTO auth.identities (
    id,
    user_id,
    provider,
    provider_id,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    prem_uid,
    'email',
    prem_uid::text,
    jsonb_build_object('sub', prem_uid::text, 'email', 'premium@filmbloopers.online'),
    now(),
    now(),
    now()
  );

  -- Profilo pubblico Premium con scadenza a 1 anno
  INSERT INTO public.profiles (
    id,
    email,
    username,
    tier,
    tipo_abbonamento,
    subscription_type,
    data_scadenza,
    punti,
    punti_premiati,
    mesi_accreditati,
    is_admin
  ) VALUES (
    prem_uid,
    'premium@filmbloopers.online',
    'utente_premium',
    'premium',
    'mensile',
    'mensile',
    (CURRENT_DATE + INTERVAL '1 year')::text,
    0,
    0,
    0,
    false
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    tier = 'premium',
    tipo_abbonamento = 'mensile',
    data_scadenza = (CURRENT_DATE + INTERVAL '1 year')::text,
    punti = 0,
    is_admin = false;
END $$;


-- 6. Trigger di sicurezza e policy di moderazione
-- Permette all'admin di aggiornare i punti dei profili durante l'approvazione
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

-- Policy RLS per permettere all'admin mrtrrt67@gmail.com di aggiornare qualsiasi profilo
DROP POLICY IF EXISTS "Admin gestione completa profili" ON public.profiles;
CREATE POLICY "Admin gestione completa profili" ON public.profiles 
  FOR ALL TO authenticated 
  USING (auth.jwt()->>'email' = 'mrtrrt67@gmail.com') 
  WITH CHECK (auth.jwt()->>'email' = 'mrtrrt67@gmail.com');

DROP POLICY IF EXISTS "Admin gestione completa voti" ON public.voti_bloopers;
CREATE POLICY "Admin gestione completa voti" ON public.voti_bloopers 
  FOR ALL TO authenticated 
  USING (auth.jwt()->>'email' = 'mrtrrt67@gmail.com') 
  WITH CHECK (auth.jwt()->>'email' = 'mrtrrt67@gmail.com');

DROP POLICY IF EXISTS "Admin gestione completa errori" ON public.errori;
CREATE POLICY "Admin gestione completa errori" ON public.errori 
  FOR ALL TO authenticated 
  USING (auth.jwt()->>'email' = 'mrtrrt67@gmail.com') 
  WITH CHECK (auth.jwt()->>'email' = 'mrtrrt67@gmail.com');
