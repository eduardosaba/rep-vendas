-- Migration to add Open Graph sharing image fields
-- Adiciona campos para personalizar a imagem de compartilhamento do catálogo

-- 1. Adicionar campo na tabela de configurações do usuário (Settings)
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS og_image_url TEXT;

-- 2. Adicionar campos na tabela pública de catálogos (Public Catalogs)
ALTER TABLE public_catalogs 
ADD COLUMN IF NOT EXISTS og_image_url TEXT,
ADD COLUMN IF NOT EXISTS single_brand_logo_url TEXT;
