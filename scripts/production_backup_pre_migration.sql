-- =========================================================================
-- FILM BLOOPERS HUB - BACKUP ISTANTANEO (SNAPSHOT) PRE-MIGRAZIONE PRODUZIONE
-- Esegui questo script in Supabase Produzione PRIMA di applicare la migrazione.
-- Crea copie esatte di sicurezza delle tabelle critiche in meno di 2 secondi.
-- =========================================================================

-- 1. Backup tabella profili utente (punti, abbonamenti, ruoli)
DROP TABLE IF EXISTS public._backup_profiles_pre_migration CASCADE;
CREATE TABLE public._backup_profiles_pre_migration AS 
SELECT * FROM public.profiles;

-- 2. Backup tabella errori / bloopers
DROP TABLE IF EXISTS public._backup_errori_pre_migration CASCADE;
CREATE TABLE public._backup_errori_pre_migration AS 
SELECT * FROM public.errori;

-- 3. Backup tabella voti e contestazioni
DROP TABLE IF EXISTS public._backup_voti_pre_migration CASCADE;
CREATE TABLE public._backup_voti_pre_migration AS 
SELECT * FROM public.voti_bloopers;

-- 4. Backup tabella configurazioni di sistema
DROP TABLE IF EXISTS public._backup_configurazioni_pre_migration CASCADE;
CREATE TABLE public._backup_configurazioni_pre_migration AS 
SELECT * FROM public.configurazioni;

-- 5. Backup tabella catalogo film
DROP TABLE IF EXISTS public._backup_films_pre_migration CASCADE;
CREATE TABLE public._backup_films_pre_migration AS 
SELECT * FROM public.films;

-- 6. Backup suggerimenti
DROP TABLE IF EXISTS public._backup_suggerimenti_pre_migration CASCADE;
CREATE TABLE public._backup_suggerimenti_pre_migration AS 
SELECT * FROM public.suggerimenti;

-- Verifica del numero di record salvati
SELECT 'profili_salvati' AS tabella, count(*) FROM public._backup_profiles_pre_migration
UNION ALL
SELECT 'errori_salvati', count(*) FROM public._backup_errori_pre_migration
UNION ALL
SELECT 'voti_salvati', count(*) FROM public._backup_voti_pre_migration
UNION ALL
SELECT 'film_salvati', count(*) FROM public._backup_films_pre_migration;
