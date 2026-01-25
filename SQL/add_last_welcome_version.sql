-- Adiciona coluna para rastrear última versão vista pelo usuário
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_welcome_version TEXT DEFAULT '0.0.0';

-- Opcional: forçar popup para todos (atualize a versão desejada no front-end)
-- UPDATE profiles SET last_welcome_version = '0.0.0';
