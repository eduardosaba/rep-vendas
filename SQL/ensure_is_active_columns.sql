-- Adicionar coluna is_active em settings se não existir
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Adicionar coluna is_active em public_catalogs se não existir
ALTER TABLE public_catalogs 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Sincronizar is_active de settings para public_catalogs
UPDATE public_catalogs pc
SET is_active = s.is_active
FROM settings s
WHERE pc.user_id = s.user_id;

-- Garantir que indices existam para performance
CREATE INDEX IF NOT EXISTS idx_public_catalogs_is_active ON public_catalogs(is_active);
