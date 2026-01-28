-- Migration: create RPC to check if a storage file URL is referenced in products
-- Run with: psql <connection> -f supabase/migrations/20260127_create_check_file_usage.sql

BEGIN;

-- Função: check_file_usage(file_path text) -> boolean
-- Retorna true se o caminho/url está referenciado na tabela products (image_url ou images array/jsonb)

CREATE OR REPLACE FUNCTION public.check_file_usage(file_path text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  found boolean := false;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.products p
    WHERE p.image_url = file_path
      OR (
        p.images IS NOT NULL
        AND (
          -- Trata arrays/text[] e json/jsonb arrays convertendo para jsonb
          (
            SELECT bool_or(elem = file_path)
            FROM jsonb_array_elements_text(to_jsonb(p.images)) elem
          )
        )
      )
  ) INTO found;

  RETURN found;
END;
$$ STABLE;

COMMIT;
