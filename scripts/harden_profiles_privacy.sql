-- =========================================================================
-- FILM BLOOPERS HUB - HARDENING PRIVACY PROFILI UTENTE (GDPR COMPLIANCE)
-- Eseguire nell'SQL Editor di Supabase sia su Staging che su Produzione.
-- =========================================================================

-- 1. Vista pubblica per esporre solo i dati necessari (classifica, community, bloopers)
-- escludendo permanentemente l'indirizzo email dai client anonimi.
CREATE OR REPLACE VIEW public.public_profiles AS
  SELECT 
    id, 
    username, 
    tier, 
    tipo_abbonamento, 
    subscription_type,
    punti, 
    punti_premiati, 
    mesi_accreditati,
    created_at
  FROM public.profiles;

-- Assegna i permessi di lettura sulla vista pubblica
GRANT SELECT ON public.public_profiles TO anon, authenticated, service_role;

-- 2. Notifica di completamento
COMMENT ON VIEW public.public_profiles IS 'Vista pubblica sicura dei profili per classifica e community, senza esposizione di email (GDPR compliant).';
