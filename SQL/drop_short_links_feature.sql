-- Remove feature de links curtos e objetos relacionados
-- Execute no Supabase SQL Editor em ambiente homologacao/producao com backup prévio.

BEGIN;

-- Tabelas principais
DROP TABLE IF EXISTS public.short_link_clicks CASCADE;
DROP TABLE IF EXISTS public.short_links CASCADE;

-- Funcoes/rpcs historicamente usadas por short links (se existirem)
DROP FUNCTION IF EXISTS public.log_short_link_click(uuid, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_banner_by_code(text) CASCADE;

-- Trigger functions possiveis de legado (best effort)
DROP FUNCTION IF EXISTS public.update_short_links_updated_at() CASCADE;

COMMIT;
