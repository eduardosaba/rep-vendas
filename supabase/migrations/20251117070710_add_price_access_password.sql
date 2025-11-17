-- Adicionar campo para senha de acesso aos preços
ALTER TABLE settings ADD COLUMN IF NOT EXISTS price_access_password TEXT DEFAULT '123456';

-- Comentário explicativo
COMMENT ON COLUMN settings.price_access_password IS 'Senha para liberar acesso aos preços dos produtos. Padrão: 123456';