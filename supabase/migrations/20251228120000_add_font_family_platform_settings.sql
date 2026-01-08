-- Migration: adicionar coluna font_family em platform_settings
-- Data: 2025-12-28

ALTER TABLE IF EXISTS public.platform_settings
  ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT NULL;

COMMENT ON COLUMN public.platform_settings.font_family IS 'Nome da família de fonte global (ex: Inter, Roboto)';

-- Index para buscas rápidas por font_family (opcional)
CREATE INDEX IF NOT EXISTS idx_platform_settings_font_family ON public.platform_settings(font_family);
