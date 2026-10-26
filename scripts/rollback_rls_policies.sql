-- =========================================================================
-- FILM BLOOPERS HUB - ROLLBACK RLS SCRIPT (RIPRISTINO POLICY PRECEDENTI)
-- Da usare SOLO in caso di emergenza per ripristinare le policy iniziali di Staging
-- =========================================================================

-- 1. Rimuovi trigger di protezione profili
DROP TRIGGER IF EXISTS trg_protect_profile_privileged_columns ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_profile_privileged_columns();

-- 2. Ripristino policy films
DROP POLICY IF EXISTS "Films lettura pubblica" ON public.films;
CREATE POLICY "Allow delete on films" ON public.films AS PERMISSIVE FOR DELETE TO public USING (true);
CREATE POLICY "Aggiornamento libero films" ON public.films AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Films pubblici in lettura" ON public.films AS PERMISSIVE FOR SELECT TO public USING (true);

-- 3. Ripristino policy errori
DROP POLICY IF EXISTS "Errori approvati lettura pubblica" ON public.errori;
DROP POLICY IF EXISTS "Errori propri lettura autenticati" ON public.errori;
DROP POLICY IF EXISTS "Errori inserimento utenti autenticati" ON public.errori;
CREATE POLICY "Allow delete on errori" ON public.errori AS PERMISSIVE FOR DELETE TO public USING (true);
CREATE POLICY "Aggiornamento libero errori" ON public.errori AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Errori pubblici" ON public.errori AS PERMISSIVE FOR SELECT TO public USING (true);

-- 4. Ripristino policy voti_bloopers
DROP POLICY IF EXISTS "Voti lettura pubblica" ON public.voti_bloopers;
DROP POLICY IF EXISTS "Gestione propri voti autenticati" ON public.voti_bloopers;
CREATE POLICY "Allow delete on voti_bloopers" ON public.voti_bloopers AS PERMISSIVE FOR DELETE TO public USING (true);
CREATE POLICY "Gestione propri voti" ON public.voti_bloopers AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Voti pubblici" ON public.voti_bloopers AS PERMISSIVE FOR SELECT TO public USING (true);

-- 5. Ripristino policy configurazioni
DROP POLICY IF EXISTS "Configurazioni lettura pubblica" ON public.configurazioni;
CREATE POLICY "Configurazioni modificabili admin" ON public.configurazioni AS PERMISSIVE FOR ALL TO public USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));
CREATE POLICY "Configurazioni pubbliche lettura" ON public.configurazioni AS PERMISSIVE FOR SELECT TO public USING (true);
