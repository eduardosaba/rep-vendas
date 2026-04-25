-- Migration: Add missing product columns required by clone
-- Date: 2026-04-24

-- Add color_nome and frame_formato to products if they don't exist
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS color_nome text;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS frame_formato text;

-- Optionally add any other nullable fields required by clone
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS material text;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS material_haste text;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS colecao text;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS polarizado boolean;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS fotocromatico boolean;
