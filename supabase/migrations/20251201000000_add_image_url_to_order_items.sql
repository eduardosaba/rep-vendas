-- Migration: 2025-12-01 - Add image_url to order_items
-- Adds a nullable text column `image_url` to order_items so application
-- can safely insert the field when present in payloads.

ALTER TABLE IF EXISTS public.order_items
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- No-op if column already exists. This migration is idempotent.

-- Optional: if you want to backfill image_url from products (when product_id present):
-- UPDATE public.order_items oi
-- SET image_url = p.image_url
-- FROM public.products p
-- WHERE oi.product_id = p.id AND oi.image_url IS NULL;
