-- =========================================================================
-- FILM BLOOPERS HUB - SCRIPT DI ROLLBACK & RIPRISTINO EMERGENZA PRODUZIONE
-- Da eseguire in Supabase Produzione SOLO se qualcosa dovesse andare storto
-- dopo la migrazione o dopo il rilascio.
-- Ripristina le policy, i trigger e le impostazioni precedenti.
-- =========================================================================

-- -------------------------------------------------------------------------
-- PASSO 1: RIMOZIONE TRIGGER ANTI-ESCALATION (SE BLOCCA GLI UPDATE UTENTE)
-- -------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_protect_profile_privileged_columns ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_profile_privileged_columns();

-- -------------------------------------------------------------------------
-- PASSO 2: ROLLBACK POLICY RLS SU TABELLA FILMS
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Films lettura pubblica" ON public.films;
DROP POLICY IF EXISTS "Admin gestione completa films" ON public.films;

-- Ripristino policy precedenti
CREATE POLICY "Films pubblici in lettura" ON public.films 
  AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Allow delete on films" ON public.films 
  AS PERMISSIVE FOR DELETE TO public USING (true);
CREATE POLICY "Aggiornamento libero films" ON public.films 
  AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- PASSO 3: ROLLBACK POLICY RLS SU TABELLA ERRORI (BLOOPERS)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Errori approvati lettura pubblica" ON public.errori;
DROP POLICY IF EXISTS "Errori propri lettura autenticati" ON public.errori;
DROP POLICY IF EXISTS "Errori inserimento utenti autenticati" ON public.errori;
DROP POLICY IF EXISTS "Admin gestione completa errori" ON public.errori;

-- Ripristino policy precedenti
CREATE POLICY "Errori pubblici" ON public.errori 
  AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Allow delete on errori" ON public.errori 
  AS PERMISSIVE FOR DELETE TO public USING (true);
CREATE POLICY "Aggiornamento libero errori" ON public.errori 
  AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------------
-- PASSO 4: ROLLBACK POLICY RLS SU TABELLA VOTI_BLOOPERS
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Voti lettura pubblica" ON public.voti_bloopers;
DROP POLICY IF EXISTS "Gestione propri voti autenticati" ON public.voti_bloopers;
DROP POLICY IF EXISTS "Admin gestione completa voti" ON public.voti_bloopers;

-- Ripristino policy precedenti
CREATE POLICY "Voti pubblici" ON public.voti_bloopers 
  AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Allow delete on voti_bloopers" ON public.voti_bloopers 
  AS PERMISSIVE FOR DELETE TO public USING (true);
CREATE POLICY "Gestione propri voti" ON public.voti_bloopers 
  AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

-- -------------------------------------------------------------------------
-- PASSO 5: ROLLBACK POLICY RLS SU CONFIGURAZIONI & SUGGERIMENTI & PROFILES
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Configurazioni lettura pubblica" ON public.configurazioni;
DROP POLICY IF EXISTS "Admin gestione completa configurazioni" ON public.configurazioni;
CREATE POLICY "Configurazioni pubbliche lettura" ON public.configurazioni 
  AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Configurazioni modificabili admin" ON public.configurazioni 
  AS PERMISSIVE FOR ALL TO public USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));

DROP POLICY IF EXISTS "Admin gestione completa suggerimenti" ON public.suggerimenti;
DROP POLICY IF EXISTS "Admin gestione completa profili" ON public.profiles;

-- -------------------------------------------------------------------------
-- PASSO 6: RIPRISTINO TABELLA NOTIFICHE (SE NECESSARIO)
-- -------------------------------------------------------------------------
-- Nel caso la tabella notifiche_utenti crei conflitti, è possibile eliminarla:
DROP TABLE IF EXISTS public.notifiche_utenti CASCADE;

-- -------------------------------------------------------------------------
-- PASSO 7 (OPZIONALE): RIPRISTINO DEI DATI DAL BACKUP ISTANTANEO
-- Esegui SOLO se qualche record è stato modificato o corrotto.
-- -------------------------------------------------------------------------
/*
-- Ripristino profili dal backup
TRUNCATE public.profiles;
INSERT INTO public.profiles SELECT * FROM public._backup_profiles_pre_migration;

-- Ripristino errori dal backup
TRUNCATE public.errori CASCADE;
INSERT INTO public.errori SELECT * FROM public._backup_errori_pre_migration;

-- Ripristino voti dal backup
TRUNCATE public.voti_bloopers;
INSERT INTO public.voti_bloopers SELECT * FROM public._backup_voti_pre_migration;

-- Ripristino configurazioni dal backup
TRUNCATE public.configurazioni;
INSERT INTO public.configurazioni SELECT * FROM public._backup_configurazioni_pre_migration;
*/

-- =========================================================================
-- FINE SCRIPT ROLLBACK
-- =========================================================================
