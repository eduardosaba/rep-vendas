-- Migração: Adicionar coluna banners_mobile à tabela settings
-- Para permitir banners específicos para dispositivos móveis

-- Adicionar coluna banners_mobile (array de URLs) se não existir
ALTER TABLE settings ADD COLUMN IF NOT EXISTS banners_mobile TEXT[];

-- Comentário explicativo
COMMENT ON COLUMN settings.banners_mobile IS 'Array de URLs de banners otimizados para dispositivos móveis. Se vazio, usa banners padrão com CSS responsivo.';
