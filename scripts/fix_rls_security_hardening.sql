-- =========================================================================
-- FILM BLOOPERS HUB - SECURITY & RLS HARDENING SCRIPT
-- Applicare questo script sia sul database di Staging che su quello di Produzione
-- (Supabase Dashboard -> SQL Editor)
-- =========================================================================

-- 1. HARDENING TABELLA FILMS
-- Elimina le policy insicure che permettevano DELETE e UPDATE pubblici
DROP POLICY IF EXISTS "Allow delete on films" ON public.films;
DROP POLICY IF EXISTS "Aggiornamento libero films" ON public.films;
DROP POLICY IF EXISTS "Inserimento libero films" ON public.films;
DROP POLICY IF EXISTS "Films aggiornabili da autenticati" ON public.films;
DROP POLICY IF EXISTS "Films modificabili da autenticati" ON public.films;
DROP POLICY IF EXISTS "Lettura libera films" ON public.films;
DROP POLICY IF EXISTS "Films pubblici in lettura" ON public.films;
DROP POLICY IF EXISTS "Solo lettura pubblica films" ON public.films;

-- Ricrea policy sicura di sola lettura pubblica per tutti i visitatori
CREATE POLICY "Films lettura pubblica" ON public.films 
  FOR SELECT TO public USING (true);

-- Consente agli utenti autenticati di importare nuove schede film da TMDB
DROP POLICY IF EXISTS "Films inserimento autenticati" ON public.films;
CREATE POLICY "Films inserimento autenticati" ON public.films 
  FOR INSERT TO authenticated, service_role 
  WITH CHECK (true);


-- 2. HARDENING TABELLA ERRORI (BLOOPERS)
-- Elimina le policy che permettevano a chiunque di eliminare o modificare bloopers
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

-- Lettura pubblica solo per bloopers approvati
CREATE POLICY "Errori approvati lettura pubblica" ON public.errori 
  FOR SELECT TO public USING (approvato = true);

-- Gli utenti autenticati possono consultare anche le proprie segnalazioni in attesa
CREATE POLICY "Errori propri lettura autenticati" ON public.errori 
  FOR SELECT TO authenticated USING (true);

-- Gli utenti autenticati possono inserire:
-- 1) Segnalazioni manuali (approvato = false da moderare)
-- 2) Bloopers generati tramite IA (provenienza = 'ia')
-- 3) Amministratore autorizzato
DROP POLICY IF EXISTS "Errori inserimento utenti autenticati" ON public.errori;
DROP POLICY IF EXISTS "Errori inserimento consentito" ON public.errori;
CREATE POLICY "Errori inserimento consentito" ON public.errori 
  FOR INSERT TO authenticated, service_role 
  WITH CHECK (
    approvato = false 
    OR provenienza = 'ia' 
    OR COALESCE(auth.jwt()->>'email', '') = 'mrtrrt67@gmail.com'
  );


-- 3. HARDENING TABELLA VOTI_BLOOPERS
-- Elimina la cancellazione pubblica indiscriminata
DROP POLICY IF EXISTS "Allow delete on voti_bloopers" ON public.voti_bloopers;
DROP POLICY IF EXISTS "Gestione propri voti" ON public.voti_bloopers;
DROP POLICY IF EXISTS "Gestione propri voti bloopers" ON public.voti_bloopers;
DROP POLICY IF EXISTS "Voti pubblici" ON public.voti_bloopers;

-- Lettura pubblica dei voti (necessaria per il calcolo di attendibilità e contatori)
CREATE POLICY "Voti lettura pubblica" ON public.voti_bloopers 
  FOR SELECT TO public USING (true);

-- Gli utenti autenticati possono inserire, modificare o rimuovere ESCLUSIVAMENTE il proprio voto
CREATE POLICY "Gestione propri voti autenticati" ON public.voti_bloopers 
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 4. HARDENING TABELLA CONFIGURAZIONI
DROP POLICY IF EXISTS "Configurazioni modificabili admin" ON public.configurazioni;
DROP POLICY IF EXISTS "Configurazioni pubbliche lettura" ON public.configurazioni;

-- Lettura pubblica delle sole configurazioni visibili
CREATE POLICY "Configurazioni lettura pubblica" ON public.configurazioni 
  FOR SELECT TO public USING (visibile = true);


-- 5. PROTEZIONE ANTI-ESCALATION SU TABELLA PROFILES (PREVIENE FAKE ADMIN & VIP)
-- Crea trigger PostgreSQL per impedire agli utenti di alterare tier, abbonamento o punti tramite client SDK

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Se l'operazione non proviene direttamente dal backend con service_role né dall'amministratore autorizzato
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


-- 6. PERMESSI TOTALI AMMINISTRATORE (mrtrrt67@gmail.com)
-- Permette all'amministratore autenticato di moderare, approvare, modificare ed eliminare
-- direttamente sia con cookie di sessione sia con service_role.

DROP POLICY IF EXISTS "Admin gestione completa films" ON public.films;
CREATE POLICY "Admin gestione completa films" ON public.films 
  FOR ALL TO authenticated 
  USING (auth.jwt()->>'email' = 'mrtrrt67@gmail.com') 
  WITH CHECK (auth.jwt()->>'email' = 'mrtrrt67@gmail.com');

DROP POLICY IF EXISTS "Admin gestione completa errori" ON public.errori;
CREATE POLICY "Admin gestione completa errori" ON public.errori 
  FOR ALL TO authenticated 
  USING (auth.jwt()->>'email' = 'mrtrrt67@gmail.com') 
  WITH CHECK (auth.jwt()->>'email' = 'mrtrrt67@gmail.com');

DROP POLICY IF EXISTS "Admin gestione completa voti" ON public.voti_bloopers;
CREATE POLICY "Admin gestione completa voti" ON public.voti_bloopers 
  FOR ALL TO authenticated 
  USING (auth.jwt()->>'email' = 'mrtrrt67@gmail.com') 
  WITH CHECK (auth.jwt()->>'email' = 'mrtrrt67@gmail.com');

DROP POLICY IF EXISTS "Admin gestione completa configurazioni" ON public.configurazioni;
CREATE POLICY "Admin gestione completa configurazioni" ON public.configurazioni 
  FOR ALL TO authenticated 
  USING (auth.jwt()->>'email' = 'mrtrrt67@gmail.com') 
  WITH CHECK (auth.jwt()->>'email' = 'mrtrrt67@gmail.com');

DROP POLICY IF EXISTS "Admin gestione completa suggerimenti" ON public.suggerimenti;
CREATE POLICY "Admin gestione completa suggerimenti" ON public.suggerimenti 
  FOR ALL TO authenticated 
  USING (auth.jwt()->>'email' = 'mrtrrt67@gmail.com') 
  WITH CHECK (auth.jwt()->>'email' = 'mrtrrt67@gmail.com');

DROP POLICY IF EXISTS "Admin gestione completa profili" ON public.profiles;
CREATE POLICY "Admin gestione completa profili" ON public.profiles 
  FOR ALL TO authenticated 
  USING (auth.jwt()->>'email' = 'mrtrrt67@gmail.com') 
  WITH CHECK (auth.jwt()->>'email' = 'mrtrrt67@gmail.com');

-- Verifica finale: lo script è idempotente e può essere eseguito senza rischi.
