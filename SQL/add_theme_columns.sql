-- Script para adicionar colunas de tema à tabela settings
-- Execute este script no SQL Editor do Supabase

-- Adicionar colunas de personalização do tema
ALTER TABLE settings ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#3B82F6';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#6B7280';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS header_color TEXT DEFAULT '#FFFFFF';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'Inter, sans-serif';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS title_color TEXT DEFAULT '#111827';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS icon_color TEXT DEFAULT '#4B5563';

-- Mensagem de confirmação
DO $$
BEGIN
    RAISE NOTICE 'Colunas de tema adicionadas com sucesso à tabela settings!';
END $$;