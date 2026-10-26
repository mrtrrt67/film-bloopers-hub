-- =========================================================================
-- FIX REGISTRAZIONE UTENTI & POLICY TABELLA PROFILES
-- Risolve l'errore: "database error saving new user"
-- =========================================================================

-- 1. ABILITAZIONE RLS E POLICY SU TABELLA PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Consente l'inserimento dei profili alla registrazione (sia da trigger/service_role sia dall'utente)
DROP POLICY IF EXISTS "Inserimento profili consentito" ON public.profiles;
CREATE POLICY "Inserimento profili consentito" ON public.profiles
  FOR INSERT TO authenticated, anon, service_role
  WITH CHECK (true);

-- Lettura pubblica dei profili utente
DROP POLICY IF EXISTS "Profili lettura pubblica" ON public.profiles;
CREATE POLICY "Profili lettura pubblica" ON public.profiles
  FOR SELECT TO public
  USING (true);

-- Modifica del proprio profilo personale da parte dell'utente loggato
DROP POLICY IF EXISTS "Modifica proprio profilo" ON public.profiles;
CREATE POLICY "Modifica proprio profilo" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Gestione completa da parte dell'amministratore
DROP POLICY IF EXISTS "Admin gestione completa profili" ON public.profiles;
CREATE POLICY "Admin gestione completa profili" ON public.profiles
  FOR ALL TO authenticated
  USING (auth.jwt()->>'email' = 'mrtrrt67@gmail.com')
  WITH CHECK (auth.jwt()->>'email' = 'mrtrrt67@gmail.com');


-- 2. TRIGGER ANTI-ESCALATION SU INSERT (GARANZIA DI SICUREZZA)
-- Assicura che nessun nuovo utente possa registrarsi già con privilegi admin o tier premium
CREATE OR REPLACE FUNCTION public.enforce_new_profile_defaults()
RETURNS TRIGGER AS $$
BEGIN
  IF (current_user != 'service_role' AND auth.role() != 'service_role' AND COALESCE(auth.jwt()->>'email', '') != 'mrtrrt67@gmail.com') THEN
    NEW.tier := 'free';
    NEW.tipo_abbonamento := 'nessuno';
    NEW.subscription_type := 'nessuno';
    NEW.calls_today := 0;
    NEW.punti := 0;
    NEW.punti_premiati := 0;
    NEW.mesi_accreditati := 0;
    NEW.data_scadenza := NULL;
    NEW.expires_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_enforce_new_profile_defaults ON public.profiles;
CREATE TRIGGER trg_enforce_new_profile_defaults
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_new_profile_defaults();


-- 3. TRIGGER AUTOMATICO SU AUTH.USERS
-- Inserisce automaticamente la riga corrispondente in public.profiles quando un utente si registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_username text;
  v_tier text;
BEGIN
  v_username := COALESCE(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1),
    'Cacciatore'
  );

  v_tier := CASE 
    WHEN LOWER(new.email) = 'mrtrrt67@gmail.com' THEN 'admin'
    ELSE 'free'
  END;

  INSERT INTO public.profiles (
    id,
    email,
    username,
    tier,
    tipo_abbonamento,
    subscription_type,
    created_at
  ) VALUES (
    new.id,
    new.email,
    v_username,
    v_tier,
    'nessuno',
    'nessuno',
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = COALESCE(public.profiles.username, EXCLUDED.username);

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Non bloccare mai la creazione dell'account in auth.users
  RAISE WARNING 'Errore creazione profilo per utente %: %', new.id, SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Collega il trigger ad auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 4. RIPRISTINO E SINCRONIZZAZIONE RETROATTIVA UTENTI GIA' REGISTRATI
-- Inserisce automaticamente in profiles qualsiasi utente registrato in auth.users che non ha ancora un record in profiles
INSERT INTO public.profiles (id, email, username, tier, tipo_abbonamento, subscription_type, created_at)
SELECT 
  u.id, 
  u.email, 
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1), 'Cacciatore'),
  CASE WHEN LOWER(u.email) = 'mrtrrt67@gmail.com' THEN 'admin' ELSE 'free' END,
  'nessuno',
  'nessuno',
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

