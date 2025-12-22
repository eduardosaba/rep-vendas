-- Migration: ensure_system_updates_table
-- Cria a tabela `system_updates` caso não exista e adiciona colunas faltantes
-- Uso: executar no Supabase SQL Editor ou via psql

BEGIN;

-- 1) Criar tabela se não existir (schema completo)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'system_updates'
  ) THEN
    CREATE TABLE public.system_updates (
      id bigserial PRIMARY KEY,
      version text NOT NULL,
      title text NOT NULL,
      "date" date,
      highlights text[] DEFAULT '{}'::text[],
      color_from varchar(32),
      color_to varchar(32),
      image_url text,
      items jsonb,
      active boolean DEFAULT false,
      created_at timestamptz DEFAULT now()
    );
  END IF;
END;
$$;

-- 2) Se a tabela existe, garante que todas as colunas necessárias estejam presentes
ALTER TABLE IF EXISTS public.system_updates
  ADD COLUMN IF NOT EXISTS version text;

ALTER TABLE IF EXISTS public.system_updates
  ADD COLUMN IF NOT EXISTS title text;

ALTER TABLE IF EXISTS public.system_updates
  ADD COLUMN IF NOT EXISTS "date" date;

ALTER TABLE IF EXISTS public.system_updates
  ADD COLUMN IF NOT EXISTS highlights text[] DEFAULT '{}'::text[];

ALTER TABLE IF EXISTS public.system_updates
  ADD COLUMN IF NOT EXISTS color_from varchar(32);

ALTER TABLE IF EXISTS public.system_updates
  ADD COLUMN IF NOT EXISTS color_to varchar(32);

ALTER TABLE IF EXISTS public.system_updates
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE IF EXISTS public.system_updates
  ADD COLUMN IF NOT EXISTS items jsonb;

ALTER TABLE IF EXISTS public.system_updates
  ADD COLUMN IF NOT EXISTS active boolean DEFAULT false;

ALTER TABLE IF EXISTS public.system_updates
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 3) Índices úteis
CREATE INDEX IF NOT EXISTS idx_system_updates_active ON public.system_updates (active);
CREATE INDEX IF NOT EXISTS idx_system_updates_created_at ON public.system_updates (created_at DESC);

COMMIT;

-- Observações:
-- - A coluna `highlights` é do tipo text[] (array de strings) para compatibilidade
--   com o frontend que envia/espera um array de highlights.
-- - `items` é jsonb e pode armazenar estrutura adicional usada por modais.
-- - Reinicie o servidor/Next.js após aplicar para limpar caches de schema do cliente.
