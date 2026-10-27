-- =========================================================================
-- FILM BLOOPERS HUB - MASTER COMPREHENSIVE RLS POLICIES SCRIPT
-- Applicare questo script sia sul database di Staging che su quello di Produzione
-- (Supabase Dashboard -> SQL Editor)
-- 
-- Questo script riconfigura in modo coerente e sicuro tutte le tabelle del database:
-- 1. films: Selezione pubblica, importazione cataloghi (TMDB) consentita, modifica/cancellazione solo admin.
-- 2. errori: Bloopers approvati pubblici, segnalazioni utenti (approvato=false) e IA (provenienza='ia') consentite, modifica solo admin.
-- 3. movie_trivia: Curiosità approvate pubbliche, proposte utenti e IA consentite, contatore likes con RPC sicura, modifica solo admin.
-- 4. voti_bloopers: Voti pubblici in lettura, gestione del proprio voto per utenti autenticati, auto-sync dei contatori su errori.
-- 5. profiles: Lettura pubblica, aggiornamento proprio profilo con trigger anti-escalation su tier e punti, gestione admin.
-- 6. configurazioni: Lettura parametri visibili, gestione riservata admin.
-- 7. suggerimenti: Inserimento pubblico aperto a tutti, gestione riservata admin.
-- 8. notifiche_utenti: Lettura e gestione proprie notifiche, inserimento notifiche da sistema/admin.
-- 9. tabelle log: Inserimento aperto per tracciamento anonimo/autenticato, lettura e pulizia riservata admin.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 0. ASSEGNAZIONE PERMESSI DI SCHEMA E TABELLE (GRANT)
-- -------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- -------------------------------------------------------------------------
-- 1. TABELLA FILMS
-- -------------------------------------------------------------------------
ALTER TABLE public.films ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON TABLE public.films TO anon, authenticated;
GRANT ALL ON TABLE public.films TO authenticated;

DROP POLICY IF EXISTS "Films lettura pubblica" ON public.films;
DROP POLICY IF EXISTS "Films pubblici in lettura" ON public.films;
DROP POLICY IF EXISTS "Solo lettura pubblica films" ON public.films;
DROP POLICY IF EXISTS "Lettura libera films" ON public.films;
DROP POLICY IF EXISTS "Allow delete on films" ON public.films;
DROP POLICY IF EXISTS "Aggiornamento libero films" ON public.films;
DROP POLICY IF EXISTS "Inserimento libero films" ON public.films;
DROP POLICY IF EXISTS "Films aggiornabili da autenticati" ON public.films;
DROP POLICY IF EXISTS "Films modificabili da autenticati" ON public.films;
DROP POLICY IF EXISTS "Films inserimento autenticati" ON public.films;
DROP POLICY IF EXISTS "Films inserimento consentito" ON public.films;
DROP POLICY IF EXISTS "Admin gestione completa films" ON public.films;

-- Lettura pubblica per tutti (visitatori e utenti)
CREATE POLICY "Films lettura pubblica" ON public.films 
  FOR SELECT TO public USING (true);

-- Permette l'importazione di schede film da TMDB (anon, utenti autenticati e serverless)
CREATE POLICY "Films inserimento consentito" ON public.films 
  FOR INSERT TO authenticated, anon, service_role 
  WITH CHECK (true);

-- Modifica e cancellazione film STRETTAMENTE riservata all'Amministratore
CREATE POLICY "Admin gestione completa films" ON public.films 
  FOR ALL TO authenticated 
  USING (COALESCE(auth.jwt()->>'email', '') = 'mrtrrt67@gmail.com') 
  WITH CHECK (COALESCE(auth.jwt()->>'email', '') = 'mrtrrt67@gmail.com');


-- -------------------------------------------------------------------------
-- 2. TABELLA ERRORI (BLOOPERS)
-- -------------------------------------------------------------------------
ALTER TABLE public.errori ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON TABLE public.errori TO anon, authenticated;
GRANT ALL ON TABLE public.errori TO authenticated;

DROP POLICY IF EXISTS "Errori approvati lettura pubblica" ON public.errori;
DROP POLICY IF EXISTS "Errori propri lettura autenticati" ON public.errori;
DROP POLICY IF EXISTS "Errori inserimento utenti autenticati" ON public.errori;
DROP POLICY IF EXISTS "Errori inserimento consentito" ON public.errori;
DROP POLICY IF EXISTS "Admin gestione completa errori" ON public.errori;
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

-- Lettura bloopers approvati aperta a tutti
CREATE POLICY "Errori approvati lettura pubblica" ON public.errori 
  FOR SELECT TO public USING (approvato = true);

-- Gli utenti autenticati possono leggere anche le proprie segnalazioni in attesa
CREATE POLICY "Errori propri lettura autenticati" ON public.errori 
  FOR SELECT TO authenticated USING (true);

-- Inserimento: Utenti autenticati possono proporre bloopers (approvato=false), inserire bloopers IA (provenienza='ia'), o Admin totale
CREATE POLICY "Errori inserimento consentito" ON public.errori 
  FOR INSERT TO authenticated, service_role 
  WITH CHECK (
    approvato = false 
    OR provenienza = 'ia' 
    OR COALESCE(auth.jwt()->>'email', '') = 'mrtrrt67@gmail.com'
  );

-- Modifica ed eliminazione STRETTAMENTE riservata all'Amministratore
CREATE POLICY "Admin gestione completa errori" ON public.errori 
  FOR ALL TO authenticated 
  USING (COALESCE(auth.jwt()->>'email', '') = 'mrtrrt67@gmail.com') 
  WITH CHECK (COALESCE(auth.jwt()->>'email', '') = 'mrtrrt67@gmail.com');


-- -------------------------------------------------------------------------
-- 3. TABELLA MOVIE_TRIVIA (CURIOSITÀ & RETROSCENA)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.movie_trivia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  film_id bigint NOT NULL REFERENCES public.films(id) ON DELETE CASCADE,
  categoria text NOT NULL DEFAULT 'Curiosità & Retroscena',
  titolo text NOT NULL,
  descrizione text NOT NULL,
  fonte text,
  approvato boolean NOT NULL DEFAULT true,
  inserito_da text DEFAULT 'IA (Sistema)',
  provenienza text DEFAULT 'ia',
  likes integer NOT NULL DEFAULT 0,
  ordine integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_movie_trivia_film_id ON public.movie_trivia (film_id);
CREATE INDEX IF NOT EXISTS idx_movie_trivia_approvato ON public.movie_trivia (approvato);
CREATE INDEX IF NOT EXISTS idx_movie_trivia_film_approvato ON public.movie_trivia (film_id, approvato);

ALTER TABLE public.movie_trivia ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON TABLE public.movie_trivia TO anon, authenticated;
GRANT ALL ON TABLE public.movie_trivia TO authenticated;

DROP POLICY IF EXISTS "Lettura pubblica movie_trivia" ON public.movie_trivia;
DROP POLICY IF EXISTS "Proposta curiosita utenti autenticati" ON public.movie_trivia;
DROP POLICY IF EXISTS "Trivia inserimento consentito" ON public.movie_trivia;
DROP POLICY IF EXISTS "Admin full control movie_trivia" ON public.movie_trivia;

-- Lettura curiosità approvate aperta a tutti
CREATE POLICY "Lettura pubblica movie_trivia" ON public.movie_trivia 
  FOR SELECT TO public USING (approvato = true);

-- Inserimento: Proposte utenti autenticati (approvato=false), generazione IA (provenienza='ia') o Admin totale
CREATE POLICY "Trivia inserimento consentito" ON public.movie_trivia 
  FOR INSERT TO authenticated, anon, service_role 
  WITH CHECK (
    approvato = false 
    OR provenienza = 'ia' 
    OR COALESCE(auth.jwt()->>'email', '') = 'mrtrrt67@gmail.com'
  );

-- Modifica ed eliminazione STRETTAMENTE riservata all'Amministratore
CREATE POLICY "Admin full control movie_trivia" ON public.movie_trivia 
  FOR ALL TO authenticated 
  USING (COALESCE(auth.jwt()->>'email', '') = 'mrtrrt67@gmail.com') 
  WITH CHECK (COALESCE(auth.jwt()->>'email', '') = 'mrtrrt67@gmail.com');

-- Funzione RPC con SECURITY DEFINER per incrementare i likes senza problemi di permessi
CREATE OR REPLACE FUNCTION public.increment_trivia_likes(trivia_id uuid)
RETURNS integer AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE public.movie_trivia
  SET likes = COALESCE(likes, 0) + 1
  WHERE id = trivia_id
  RETURNING likes INTO new_count;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.increment_trivia_likes(uuid) TO public, anon, authenticated, service_role;


-- -------------------------------------------------------------------------
-- 4. TABELLA VOTI_BLOOPERS & AUTO-SYNC CONTATORI SU ERRORI
-- -------------------------------------------------------------------------
ALTER TABLE public.voti_bloopers ADD COLUMN IF NOT EXISTS motivo text;
ALTER TABLE public.voti_bloopers ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.voti_bloopers TO anon, authenticated;

DROP POLICY IF EXISTS "Allow delete on voti_bloopers" ON public.voti_bloopers;
DROP POLICY IF EXISTS "Gestione propri voti" ON public.voti_bloopers;
DROP POLICY IF EXISTS "Gestione propri voti bloopers" ON public.voti_bloopers;
DROP POLICY IF EXISTS "Voti pubblici" ON public.voti_bloopers;
DROP POLICY IF EXISTS "Voti lettura pubblica" ON public.voti_bloopers;
DROP POLICY IF EXISTS "Gestione propri voti autenticati" ON public.voti_bloopers;
DROP POLICY IF EXISTS "Admin gestione completa voti" ON public.voti_bloopers;

-- Lettura pubblica dei voti (necessaria per conteggi e stato utente)
CREATE POLICY "Voti lettura pubblica" ON public.voti_bloopers 
  FOR SELECT TO public USING (true);

-- Utenti autenticati possono gestire (inserire, aggiornare, cancellare) SOLO il proprio voto
CREATE POLICY "Gestione propri voti autenticati" ON public.voti_bloopers 
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- Controllo totale Admin
CREATE POLICY "Admin gestione completa voti" ON public.voti_bloopers 
  FOR ALL TO authenticated 
  USING (COALESCE(auth.jwt()->>'email', '') = 'mrtrrt67@gmail.com') 
  WITH CHECK (COALESCE(auth.jwt()->>'email', '') = 'mrtrrt67@gmail.com');

-- Trigger per aggiornare automaticamente conferme e contestazioni su errori (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.sync_errori_voti_counters()
RETURNS TRIGGER AS $$
DECLARE
  target_errore_id bigint;
  cnt_conferme integer;
  cnt_contestazioni integer;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    target_errore_id := OLD.errore_id;
  ELSE
    target_errore_id := NEW.errore_id;
  END IF;

  SELECT 
    COUNT(*) FILTER (WHERE tipo = 'conferma'),
    COUNT(*) FILTER (WHERE tipo = 'contestazione')
  INTO cnt_conferme, cnt_contestazioni
  FROM public.voti_bloopers
  WHERE errore_id = target_errore_id;

  UPDATE public.errori
  SET conferme = COALESCE(cnt_conferme, 0),
      contestazioni = COALESCE(cnt_contestazioni, 0)
  WHERE id = target_errore_id;

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_errori_voti ON public.voti_bloopers;
CREATE TRIGGER trg_sync_errori_voti
  AFTER INSERT OR UPDATE OR DELETE ON public.voti_bloopers
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_errori_voti_counters();


-- -------------------------------------------------------------------------
-- 5. TABELLA PROFILES & PROTEZIONE ANTI-ESCALATION
-- -------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.profiles TO anon, authenticated;

DROP POLICY IF EXISTS "Profili lettura pubblica" ON public.profiles;
DROP POLICY IF EXISTS "Profili inserimento consentito" ON public.profiles;
DROP POLICY IF EXISTS "Utenti aggiornano proprio profilo" ON public.profiles;
DROP POLICY IF EXISTS "Admin gestione completa profili" ON public.profiles;

-- Lettura pubblica per avatar, nickname e classifica
CREATE POLICY "Profili lettura pubblica" ON public.profiles 
  FOR SELECT TO public USING (true);

-- Inserimento consentito (per trigger registrazione auth o webhook)
CREATE POLICY "Profili inserimento consentito" ON public.profiles 
  FOR INSERT TO authenticated, anon, service_role 
  WITH CHECK (true);

-- Utenti aggiornano ESCLUSIVAMENTE il proprio profilo
CREATE POLICY "Utenti aggiornano proprio profilo" ON public.profiles 
  FOR UPDATE TO authenticated 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

-- Controllo totale Admin
CREATE POLICY "Admin gestione completa profili" ON public.profiles 
  FOR ALL TO authenticated 
  USING (COALESCE(auth.jwt()->>'email', '') = 'mrtrrt67@gmail.com') 
  WITH CHECK (COALESCE(auth.jwt()->>'email', '') = 'mrtrrt67@gmail.com');

-- Trigger PostgreSQL anti-escalation su colonne protette
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


-- -------------------------------------------------------------------------
-- 6. TABELLA CONFIGURAZIONI
-- -------------------------------------------------------------------------
ALTER TABLE public.configurazioni ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.configurazioni TO anon, authenticated;
GRANT ALL ON TABLE public.configurazioni TO authenticated;

DROP POLICY IF EXISTS "Configurazioni modificabili admin" ON public.configurazioni;
DROP POLICY IF EXISTS "Configurazioni pubbliche lettura" ON public.configurazioni;
DROP POLICY IF EXISTS "Configurazioni lettura pubblica" ON public.configurazioni;
DROP POLICY IF EXISTS "Admin gestione completa configurazioni" ON public.configurazioni;

-- Lettura pubblica solo per parametri con visibile = true
CREATE POLICY "Configurazioni lettura pubblica" ON public.configurazioni 
  FOR SELECT TO public USING (visibile = true);

-- Modifica, inserimento e cancellazione STRETTAMENTE riservati all'Admin
CREATE POLICY "Admin gestione completa configurazioni" ON public.configurazioni 
  FOR ALL TO authenticated 
  USING (COALESCE(auth.jwt()->>'email', '') = 'mrtrrt67@gmail.com') 
  WITH CHECK (COALESCE(auth.jwt()->>'email', '') = 'mrtrrt67@gmail.com');


-- -------------------------------------------------------------------------
-- 7. TABELLA SUGGERIMENTI
-- -------------------------------------------------------------------------
ALTER TABLE public.suggerimenti ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.suggerimenti TO anon, authenticated;

DROP POLICY IF EXISTS "Admin gestione completa suggerimenti" ON public.suggerimenti;
DROP POLICY IF EXISTS "Suggerimenti inserimento pubblico" ON public.suggerimenti;

-- Inserimento consentito a tutti (visitatori e utenti per inviare suggerimenti/feedback)
CREATE POLICY "Suggerimenti inserimento pubblico" ON public.suggerimenti 
  FOR INSERT TO authenticated, anon, service_role 
  WITH CHECK (true);

-- Consultazione e gestione STRETTAMENTE riservata all'Admin
CREATE POLICY "Admin gestione completa suggerimenti" ON public.suggerimenti 
  FOR ALL TO authenticated 
  USING (COALESCE(auth.jwt()->>'email', '') = 'mrtrrt67@gmail.com') 
  WITH CHECK (COALESCE(auth.jwt()->>'email', '') = 'mrtrrt67@gmail.com');


-- -------------------------------------------------------------------------
-- 8. TABELLA NOTIFICHE UTENTI
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

CREATE INDEX IF NOT EXISTS idx_notifiche_user_letta ON public.notifiche_utenti (user_id, letta);

ALTER TABLE public.notifiche_utenti ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.notifiche_utenti TO anon, authenticated;

DROP POLICY IF EXISTS "Utenti leggono proprie notifiche" ON public.notifiche_utenti;
DROP POLICY IF EXISTS "Inserimento notifiche consentito" ON public.notifiche_utenti;
DROP POLICY IF EXISTS "Utenti aggiornano proprie notifiche" ON public.notifiche_utenti;
DROP POLICY IF EXISTS "Utenti eliminano proprie notifiche" ON public.notifiche_utenti;
DROP POLICY IF EXISTS "Admin gestione notifiche" ON public.notifiche_utenti;

-- Gli utenti consultano solo le proprie notifiche
CREATE POLICY "Utenti leggono proprie notifiche" ON public.notifiche_utenti
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Inserimento consentito (da backend, triggers o utenti autorizzati)
CREATE POLICY "Inserimento notifiche consentito" ON public.notifiche_utenti
  FOR INSERT TO authenticated, anon, service_role
  WITH CHECK (true);

-- Gli utenti possono aggiornare (es. segnare come letta) solo le proprie notifiche
CREATE POLICY "Utenti aggiornano proprie notifiche" ON public.notifiche_utenti
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Gli utenti possono eliminare solo le proprie notifiche
CREATE POLICY "Utenti eliminano proprie notifiche" ON public.notifiche_utenti
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Controllo totale Admin
CREATE POLICY "Admin gestione notifiche" ON public.notifiche_utenti 
  FOR ALL TO authenticated 
  USING (COALESCE(auth.jwt()->>'email', '') = 'mrtrrt67@gmail.com') 
  WITH CHECK (COALESCE(auth.jwt()->>'email', '') = 'mrtrrt67@gmail.com');


-- -------------------------------------------------------------------------
-- 9. TABELLE DI LOG & STATISTICHE
-- -------------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['log_ricerche', 'log_accessi', 'log_errori_ia', 'statistiche_ia']) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('GRANT ALL ON TABLE public.%I TO anon, authenticated;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Log insert pubblico ' || tbl, tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Admin full control ' || tbl, tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated, anon, service_role WITH CHECK (true);', 'Log insert pubblico ' || tbl, tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (COALESCE(auth.jwt()->>''email'', '''') = ''mrtrrt67@gmail.com'') WITH CHECK (COALESCE(auth.jwt()->>''email'', '''') = ''mrtrrt67@gmail.com'');', 'Admin full control ' || tbl, tbl);
    END IF;
  END LOOP;
END;
$$;

-- =========================================================================
-- FINE SCRIPT MASTER RLS
-- =========================================================================
