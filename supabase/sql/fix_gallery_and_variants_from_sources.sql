-- Fix: Preencher `gallery_images` e `image_variants` em clones a partir das referências fonte
-- Uso: Execute este script no editor SQL do Supabase ou via psql em um banco de teste antes de aplicar em produção.
-- Objetivo: Para produtos clonados (mapeados em `catalog_clones`) que perderam `gallery_images` ou `image_variants`
-- copiar os valores do produto fonte quando disponíveis.

BEGIN;

-- DIAGNÓSTICO 1: Quantos clones têm gallery_images faltando, mas a fonte tem
SELECT
  COUNT(*) AS clones_gallery_missing
FROM catalog_clones cc
JOIN products src ON src.id = cc.source_product_id
JOIN products tgt ON tgt.id = cc.cloned_product_id
WHERE (src.gallery_images IS NOT NULL AND jsonb_typeof(src.gallery_images) = 'array' AND jsonb_array_length(src.gallery_images) > 0)
  AND (tgt.gallery_images IS NULL OR NOT (jsonb_typeof(tgt.gallery_images) = 'array' AND jsonb_array_length(tgt.gallery_images) > 0));

-- DIAGNÓSTICO 2: Quantos clones têm image_variants faltando, mas a fonte tem
SELECT
  COUNT(*) AS clones_variants_missing
FROM catalog_clones cc
JOIN products src ON src.id = cc.source_product_id
JOIN products tgt ON tgt.id = cc.cloned_product_id
WHERE (src.image_variants IS NOT NULL AND jsonb_typeof(src.image_variants) = 'array' AND jsonb_array_length(src.image_variants) > 0)
  AND (tgt.image_variants IS NULL OR NOT (jsonb_typeof(tgt.image_variants) = 'array' AND jsonb_array_length(tgt.image_variants) > 0));

-- EXEMPLOS (ver alguns registros que serão atualizados)
SELECT
  cc.source_product_id,
  cc.cloned_product_id,
  src.user_id AS source_user,
  tgt.user_id AS target_user,
  src.gallery_images AS src_gallery,
  tgt.gallery_images AS tgt_gallery,
  src.image_variants AS src_variants,
  tgt.image_variants AS tgt_variants
FROM catalog_clones cc
JOIN products src ON src.id = cc.source_product_id
JOIN products tgt ON tgt.id = cc.cloned_product_id
WHERE (
  (src.gallery_images IS NOT NULL AND jsonb_typeof(src.gallery_images) = 'array' AND jsonb_array_length(src.gallery_images) > 0)
  OR (src.image_variants IS NOT NULL AND jsonb_typeof(src.image_variants) = 'array' AND jsonb_array_length(src.image_variants) > 0)
)
AND (
  (tgt.gallery_images IS NULL OR NOT (jsonb_typeof(tgt.gallery_images) = 'array' AND jsonb_array_length(tgt.gallery_images) > 0))
  OR (tgt.image_variants IS NULL OR NOT (jsonb_typeof(tgt.image_variants) = 'array' AND jsonb_array_length(tgt.image_variants) > 0))
)
LIMIT 50;

-- AÇÃO: Atualizar clones a partir do mapeamento em catalog_clones
-- Observação: atualiza apenas quando o clone estiver sem o campo (NULL ou array vazia)

UPDATE products AS tgt
SET
  gallery_images = COALESCE(tgt.gallery_images, src.gallery_images),
  image_variants = COALESCE(tgt.image_variants, src.image_variants),
  updated_at = now()
FROM catalog_clones cc
JOIN products src ON src.id = cc.source_product_id
WHERE tgt.id = cc.cloned_product_id
  AND (
    (src.gallery_images IS NOT NULL AND jsonb_typeof(src.gallery_images) = 'array' AND jsonb_array_length(src.gallery_images) > 0
      AND (tgt.gallery_images IS NULL OR NOT (jsonb_typeof(tgt.gallery_images) = 'array' AND jsonb_array_length(tgt.gallery_images) > 0)))
    OR
    (src.image_variants IS NOT NULL AND jsonb_typeof(src.image_variants) = 'array' AND jsonb_array_length(src.image_variants) > 0
      AND (tgt.image_variants IS NULL OR NOT (jsonb_typeof(tgt.image_variants) = 'array' AND jsonb_array_length(tgt.image_variants) > 0)))
  );

-- Fallback: Algumas cópias antigas podem não ter entrada em catalog_clones — tentar casar por image_path ou image_url
-- Roda somente se desejar (descomente para executar). Use com cuidado.
/*
UPDATE products AS tgt
SET
  gallery_images = COALESCE(tgt.gallery_images, src.gallery_images),
  image_variants = COALESCE(tgt.image_variants, src.image_variants),
  updated_at = now()
FROM products src
WHERE src.id <> tgt.id
  AND (
    (src.image_path IS NOT NULL AND src.image_path <> '' AND tgt.image_path IS NOT NULL AND src.image_path = tgt.image_path)
    OR (src.image_url IS NOT NULL AND src.image_url <> '' AND tgt.image_url IS NOT NULL AND src.image_url = tgt.image_url)
  )
  AND (
    (src.gallery_images IS NOT NULL AND jsonb_typeof(src.gallery_images) = 'array' AND jsonb_array_length(src.gallery_images) > 0
      AND (tgt.gallery_images IS NULL OR NOT (jsonb_typeof(tgt.gallery_images) = 'array' AND jsonb_array_length(tgt.gallery_images) > 0)))
    OR
    (src.image_variants IS NOT NULL AND jsonb_typeof(src.image_variants) = 'array' AND jsonb_array_length(src.image_variants) > 0
      AND (tgt.image_variants IS NULL OR NOT (jsonb_typeof(tgt.image_variants) = 'array' AND jsonb_array_length(tgt.image_variants) > 0)))
  );
*/

-- Relatar quantos produtos foram atualizados nos últimos 5 minutos
SELECT COUNT(*) AS produtos_atualizados
FROM products
WHERE updated_at > now() - interval '5 minutes';

COMMIT;
