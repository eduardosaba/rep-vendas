-- Migration: add target_product_id alias to catalog_clones
-- Date: 2026-01-14

-- Add compatibility column `target_product_id` to support older functions
ALTER TABLE IF EXISTS public.catalog_clones
ADD COLUMN IF NOT EXISTS target_product_id uuid;

-- Backfill existing rows
UPDATE public.catalog_clones
SET target_product_id = cloned_product_id
WHERE target_product_id IS NULL;

-- Create trigger function to keep target_product_id in sync
CREATE OR REPLACE FUNCTION public.catalog_clones_sync_target_product_id()
RETURNS trigger AS $$
BEGIN
  NEW.target_product_id := NEW.cloned_product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trg_sync_target_product_id ON public.catalog_clones;
CREATE TRIGGER trg_sync_target_product_id
BEFORE INSERT OR UPDATE ON public.catalog_clones
FOR EACH ROW EXECUTE FUNCTION public.catalog_clones_sync_target_product_id();

-- Note: this migration provides a backward-compatible alias column for
-- older DB functions that expect `target_product_id` instead of
-- `cloned_product_id`.
