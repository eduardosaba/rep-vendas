-- Migration: adiciona coluna external_image_url para armazenar URLs externas de imagem
-- Execute este arquivo no seu ambiente Supabase (ou via sua ferramenta de migrações)

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS external_image_url TEXT;

-- Opcional: criar índice para consultas que buscam produtos com URL externa
CREATE INDEX IF NOT EXISTS idx_products_external_image_url ON public.products (external_image_url);
