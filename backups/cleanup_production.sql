-- =========================================================================
-- FILM BLOOPERS HUB - PRODUCTION DATABASE CLEANUP SCRIPT
-- Esegui questo script nell'SQL Editor di Supabase sul DB di PRODUZIONE
-- (Tutti i dati storici sono già salvati in backups/restore_staging_database.sql)
-- =========================================================================

-- 1. Azzeramento Suggerimenti di test
DELETE FROM public.suggerimenti;

-- 2. Azzeramento Voti e Contestazioni della community
DELETE FROM public.voti_bloopers;

-- 3. Reset dei contatori di voti e contestazioni su tutti i bloopers
UPDATE public.errori 
SET conferme = 0, 
    contestazioni = 0;

-- 4. Azzeramento Moderazioni: elimina segnalazioni di test non approvate
DELETE FROM public.errori 
WHERE approvato = false;

-- 5. Eliminazione bloopers e film di test
DELETE FROM public.errori 
WHERE film_id = 233 
   OR descrizione ILIKE '%test%' 
   OR minuto ILIKE '%test%';

DELETE FROM public.films 
WHERE id = 233 
   OR titolo ILIKE '%Test Import%';

-- 6. Azzeramento Classifiche e Punti (preserva account e abbonamenti)
UPDATE public.profiles 
SET punti = 0, 
    punti_premiati = 0, 
    calls_today = 0;

-- 7. Azzeramento Log di Ricerca
DELETE FROM public.log_ricerche;

-- 8. Pulizia log interni
DELETE FROM public.log_accessi;
DELETE FROM public.log_errori_ia;
DELETE FROM public.statistiche_ia;
DELETE FROM public.storico_moderazione;
