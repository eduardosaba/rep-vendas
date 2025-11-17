-- Add updated_at column to settings table with trigger
-- OBSOLETO: O campo updated_at e trigger já foram incluídos na migração inicial create_settings_table.sql
-- Este arquivo pode ser removido ou mantido para referência

-- Campo e trigger que já foram criados na migração inicial:
-- updated_at TIMESTAMPTZ DEFAULT NOW()
-- Trigger update_settings_updated_at