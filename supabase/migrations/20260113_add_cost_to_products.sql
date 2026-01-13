-- Idempotent migration: add `cost` column to products
BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost NUMERIC(12,2) DEFAULT 0;

-- Backfill existing rows to 0 where null
UPDATE public.products
SET cost = 0
WHERE cost IS NULL;

COMMIT;

-- Safety: ensure RLS policies unaffected (no-op)
