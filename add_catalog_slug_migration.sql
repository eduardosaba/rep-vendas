-- Migração: Adicionar coluna catalog_slug à tabela settings
-- Execute este SQL no SQL Editor do Supabase

-- Adicionar coluna catalog_slug à tabela settings se não existir
ALTER TABLE settings ADD COLUMN IF NOT EXISTS catalog_slug TEXT UNIQUE;

-- Criar índice para busca rápida por catalog_slug
CREATE INDEX IF NOT EXISTS idx_settings_catalog_slug ON settings(catalog_slug);

-- Verificar se a coluna foi adicionada
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'settings'
AND column_name = 'catalog_slug';