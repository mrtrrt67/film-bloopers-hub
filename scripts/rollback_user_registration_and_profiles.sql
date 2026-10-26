-- ROLLBACK FIX REGISTRAZIONE UTENTI
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DROP TRIGGER IF EXISTS trg_enforce_new_profile_defaults ON public.profiles;
DROP FUNCTION IF EXISTS public.enforce_new_profile_defaults();

DROP POLICY IF EXISTS "Inserimento profili consentito" ON public.profiles;
