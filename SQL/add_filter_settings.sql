-- Script para adicionar configurações de filtros na tabela settings
-- Adicionar colunas para controle de visibilidade dos filtros

ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_filter_price BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_filter_category BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_filter_bestseller BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_filter_new BOOLEAN DEFAULT true;

-- As novas colunas já têm os valores padrão corretos (true = mostrar filtros por padrão)