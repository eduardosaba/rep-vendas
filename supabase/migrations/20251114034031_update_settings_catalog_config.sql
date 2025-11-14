-- Script para atualizar a tabela settings com as novas configurações
-- Adicionar colunas que podem estar faltando

-- Colunas que já deveriam existir no schema original
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_shipping BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_installments BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS hide_delivery_address BOOLEAN DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS hide_installments BOOLEAN DEFAULT false;

-- Novas colunas para a lógica positiva
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_delivery_address BOOLEAN DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_installments_checkout BOOLEAN DEFAULT true;