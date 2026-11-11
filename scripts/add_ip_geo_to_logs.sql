-- Aggiunge indirizzo IP completo e geolocalizzazione (Paese / Città) ai log di accesso e ricerca
ALTER TABLE public.log_accessi
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text;

ALTER TABLE public.log_ricerche
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text;

