-- Adicionar campos de configuração de email na tabela settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS email_provider TEXT DEFAULT 'resend';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS email_api_key TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS email_from TEXT;