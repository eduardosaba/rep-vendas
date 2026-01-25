-- Preview + Update: preencher `share_banner_url` em `public_catalogs`
-- Estratégia:
-- 1) Encontrar usuários que possuem exatamente uma marca entre seus produtos.
-- 2) Para esses usuários, usar `brands.logo_url` como candidato; se não existir, usar `settings.logo_url`.
-- 3) Atualizar apenas as linhas de `public_catalogs` com `share_banner_url IS NULL`.

-- EXECUÇÃO RECOMENDADA:
-- 1) Rode a seção PREVIEW para revisar as mudanças propostas.
-- 2) Se estiver OK, rode a seção APPLY (depois de tirar os comentários) ou copie apenas o UPDATE final.

-- ===================== PREVIEW =====================
WITH single_brand_users AS (
  SELECT p.user_id, MIN(p.brand) AS brand
  FROM products p
  WHERE p.brand IS NOT NULL AND p.brand <> ''
  GROUP BY p.user_id
  HAVING COUNT(DISTINCT p.brand) = 1
),
brand_logos AS (
  SELECT sb.user_id, b.logo_url
  FROM single_brand_users sb
  LEFT JOIN brands b ON b.user_id = sb.user_id AND b.name = sb.brand
),
candidates AS (
  SELECT pc.id AS catalog_id,
         pc.user_id,
         pc.store_name,
         bl.logo_url AS brand_logo,
         s.logo_url AS settings_logo,
         COALESCE(bl.logo_url, s.logo_url) AS candidate_url
  FROM public_catalogs pc
  JOIN brand_logos bl ON bl.user_id = pc.user_id
  LEFT JOIN settings s ON s.user_id = pc.user_id
  WHERE pc.share_banner_url IS NULL
)
SELECT * FROM candidates ORDER BY user_id;

-- ===================== APPLY (UNCOMMENT TO EXECUTE) =====================
-- BEGIN;
--
-- UPDATE public_catalogs pc
-- SET share_banner_url = COALESCE(bl.logo_url, s.logo_url)
-- FROM (
--   SELECT sb.user_id, sb.brand, b.logo_url
--   FROM (
--     SELECT p.user_id, MIN(p.brand) AS brand
--     FROM products p
--     WHERE p.brand IS NOT NULL AND p.brand <> ''
--     GROUP BY p.user_id
--     HAVING COUNT(DISTINCT p.brand) = 1
--   ) sb
--   LEFT JOIN brands b ON b.user_id = sb.user_id AND b.name = sb.brand
-- ) bl
-- LEFT JOIN settings s ON s.user_id = bl.user_id
-- WHERE pc.user_id = bl.user_id
--   AND pc.share_banner_url IS NULL
--   AND COALESCE(bl.logo_url, s.logo_url) IS NOT NULL;
--
-- COMMIT;

-- OBS: Se preferir, rode apenas o SELECT acima e depois execute manualmente o UPDATE demonstrado.
