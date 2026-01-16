-- Migration: add original_product_id to products and index + backfill from catalog_clones
-- Date: 2026-01-16

-- 1) Add column that references products(id) and keep it nullable; on delete set null
ALTER TABLE IF EXISTS public.products
ADD COLUMN IF NOT EXISTS original_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

-- 2) Create index to speed queries by original_product_id
CREATE INDEX IF NOT EXISTS idx_products_original_id ON public.products(original_product_id);

-- 3) Backfill from catalog_clones if entries exist (idempotent)
UPDATE public.products p
SET original_product_id = cc.source_product_id
FROM public.catalog_clones cc
WHERE p.id = cc.cloned_product_id
  AND p.original_product_id IS NULL;

-- Note: keep column nullable to avoid blocking existing rows; application code
-- and clone functions will start populating this column going forward.
