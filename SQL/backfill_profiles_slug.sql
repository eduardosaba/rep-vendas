-- SQL/backfill_profiles_slug.sql
-- 1) Relatório: linhas em `settings` com catalog_slug e usuário associado
SELECT user_id, catalog_slug
FROM settings
WHERE catalog_slug IS NOT NULL
ORDER BY user_id;

-- 2) Detectar conflitos: catalog_slug já usado por outro profile
SELECT s.user_id, s.catalog_slug, p.id AS conflicting_profile_id
FROM settings s
LEFT JOIN profiles p ON p.slug = s.catalog_slug
WHERE s.catalog_slug IS NOT NULL
  AND (p.id IS NOT NULL AND p.id <> s.user_id);

-- 3) Atualizar perfis sem slug quando o slug da settings não está em uso
-- This will set profiles.slug = settings.catalog_slug for profiles where
-- profiles.slug IS NULL and no other profile has that slug.
BEGIN;
UPDATE profiles
SET slug = s.catalog_slug,
    updated_at = NOW()
FROM settings s
WHERE profiles.id = s.user_id
  AND (profiles.slug IS NULL OR profiles.slug = '')
  AND s.catalog_slug IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM profiles p2 WHERE p2.slug = s.catalog_slug AND p2.id <> profiles.id
  );
COMMIT;

-- 4) Para casos com conflito (slug já usado por outro profile), gerar relatório
SELECT s.user_id, s.catalog_slug, p.id AS conflicting_profile_id
FROM settings s
JOIN profiles p ON p.slug = s.catalog_slug
WHERE s.catalog_slug IS NOT NULL
  AND p.id <> s.user_id;

-- 5) Estratégia manual para conflitos:
-- - Rever cada linha do relatório acima e decidir qual profile deve manter o slug.
-- - Para forçar atualização (sobrescrever), execute com cautela:
-- UPDATE profiles SET slug = '<desired-slug>' WHERE id = '<target-id>';

-- NOTA: Execute este script usando uma conta com privilégios suficientes (service role).
-- Recomendo rodar as consultas de relatório primeiro para revisar antes de aplicar o UPDATE.
