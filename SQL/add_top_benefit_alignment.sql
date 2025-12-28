-- =============================================
-- MIGRATION: Adicionar controles de alinhamento e escala
-- =============================================
-- Data: 2025-12-28
-- Descrição: Adiciona campos para controlar escala e alinhamento da barra de benefícios

-- 1. ADICIONAR COLUNAS NA TABELA settings
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS top_benefit_image_fit TEXT DEFAULT 'cover',
ADD COLUMN IF NOT EXISTS top_benefit_image_scale INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS top_benefit_text_align TEXT DEFAULT 'center',
ADD COLUMN IF NOT EXISTS top_benefit_image_align TEXT DEFAULT 'left';

COMMENT ON COLUMN settings.top_benefit_image_fit IS 'Modo de ajuste da imagem (cover, contain)';
COMMENT ON COLUMN settings.top_benefit_image_scale IS 'Escala da imagem em porcentagem (50-200)';
COMMENT ON COLUMN settings.top_benefit_text_align IS 'Alinhamento do texto na barra de benefícios (left, center, right)';
COMMENT ON COLUMN settings.top_benefit_image_align IS 'Alinhamento da imagem na barra de benefícios (left, center, right)';

-- 2. ADICIONAR COLUNAS NA TABELA public_catalogs
ALTER TABLE public_catalogs
ADD COLUMN IF NOT EXISTS top_benefit_image_fit TEXT DEFAULT 'cover',
ADD COLUMN IF NOT EXISTS top_benefit_image_scale INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS top_benefit_text_align TEXT DEFAULT 'center',
ADD COLUMN IF NOT EXISTS top_benefit_image_align TEXT DEFAULT 'left';

COMMENT ON COLUMN public_catalogs.top_benefit_image_fit IS 'Modo de ajuste da imagem (cover, contain)';
COMMENT ON COLUMN public_catalogs.top_benefit_image_scale IS 'Escala da imagem em porcentagem (50-200)';
COMMENT ON COLUMN public_catalogs.top_benefit_text_align IS 'Alinhamento do texto na barra de benefícios (left, center, right)';
COMMENT ON COLUMN public_catalogs.top_benefit_image_align IS 'Alinhamento da imagem na barra de benefícios (left, center, right)';

-- =============================================
-- VALIDAÇÃO
-- =============================================
-- Verificar se as colunas foram criadas:
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name IN ('settings', 'public_catalogs')
  AND column_name IN ('top_benefit_image_fit', 'top_benefit_image_scale', 'top_benefit_text_align', 'top_benefit_image_align')
ORDER BY table_name, column_name;
