-- ========================================
-- FIX: Sincronização Automática is_active
-- ========================================
-- Este script cria um TRIGGER que sincroniza automaticamente
-- o campo is_active de settings para public_catalogs sempre
-- que houver uma atualização em settings.
-- ========================================

-- 1. Criar função trigger que sincroniza is_active
CREATE OR REPLACE FUNCTION sync_is_active_to_public_catalogs()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualiza public_catalogs quando settings.is_active mudar
  UPDATE public_catalogs
  SET is_active = NEW.is_active,
      updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Criar trigger na tabela settings
DROP TRIGGER IF EXISTS on_settings_is_active_change ON settings;

CREATE TRIGGER on_settings_is_active_change
  AFTER UPDATE OF is_active ON settings
  FOR EACH ROW
  WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active)
  EXECUTE FUNCTION sync_is_active_to_public_catalogs();

-- 3. Sincronizar dados existentes AGORA (correção de estado atual)
UPDATE public_catalogs pc
SET is_active = s.is_active,
    updated_at = NOW()
FROM settings s
WHERE pc.user_id = s.user_id
AND pc.is_active IS DISTINCT FROM s.is_active;

-- ========================================
-- VERIFICAÇÃO (Execute para conferir)
-- ========================================
-- SELECT 
--   s.user_id,
--   s.is_active as settings_is_active,
--   pc.is_active as catalog_is_active,
--   pc.slug
-- FROM settings s
-- LEFT JOIN public_catalogs pc ON pc.user_id = s.user_id;
