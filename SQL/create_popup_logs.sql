-- Migration: create_popup_logs
-- Cria tabela para registrar entrega e visualização de popups por usuário

CREATE TABLE IF NOT EXISTS popup_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  popup_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  user_email TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT popup_logs_popup_user_unique UNIQUE (popup_id, user_id)
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_popup_logs_popup_id ON popup_logs (popup_id);
CREATE INDEX IF NOT EXISTS idx_popup_logs_user_id ON popup_logs (user_id);
