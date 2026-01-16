-- Migration: add is_active column to products (idempotent)
-- Date: 2026-01-15

ALTER TABLE IF EXISTS public.products
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Backfill NULLs to true to keep existing behavior
UPDATE public.products
SET is_active = true
WHERE is_active IS NULL;

-- Optional: create index to help queries filtering by is_active
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products (is_active);
