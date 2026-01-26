-- Migração: adicionar colunas necessárias para a aba Marketing (Settings)
-- Execute no SQL Editor do Supabase

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS og_image_url TEXT,
  ADD COLUMN IF NOT EXISTS share_banner_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS top_benefit_image_url TEXT,
  ADD COLUMN IF NOT EXISTS top_benefit_height INTEGER,
  ADD COLUMN IF NOT EXISTS top_benefit_text_size INTEGER,
  ADD COLUMN IF NOT EXISTS top_benefit_bg_color TEXT,
  ADD COLUMN IF NOT EXISTS top_benefit_text_color TEXT,
  ADD COLUMN IF NOT EXISTS top_benefit_image_fit TEXT,
  ADD COLUMN IF NOT EXISTS top_benefit_image_scale INTEGER,
  ADD COLUMN IF NOT EXISTS top_benefit_text_align TEXT,
  ADD COLUMN IF NOT EXISTS top_benefit_image_align TEXT,
  ADD COLUMN IF NOT EXISTS banners TEXT[],
  ADD COLUMN IF NOT EXISTS banners_mobile TEXT[],
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Índices e constraints úteis para o encurtador
-- Garante consulta rápida por código e unicidade
CREATE UNIQUE INDEX IF NOT EXISTS idx_short_links_code ON public.short_links (code);
CREATE INDEX IF NOT EXISTS idx_short_links_destination ON public.short_links (destination_url);

-- Comentários explicativos (opcional)
COMMENT ON COLUMN public.settings.banners IS 'Array de URLs de banners (desktop).';
COMMENT ON COLUMN public.settings.banners_mobile IS 'Array de URLs de banners para mobile.';
COMMENT ON COLUMN public.settings.og_image_url IS 'URL da imagem Open Graph do catálogo.';
COMMENT ON COLUMN public.settings.share_banner_url IS 'URL do banner usado em previews e compartilhamentos.';

-- Observação: se você utiliza políticas RLS, confirme se a role que executa as operações de upsert tem permissão para inserir/atualizar essas colunas.
