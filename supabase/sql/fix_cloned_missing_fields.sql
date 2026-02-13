-- Fix: Preencher campos faltantes em produtos clonados: sku, category_id, slug
-- Uso: Executar no editor SQL do Supabase ou via psql em ambiente de teste antes de produção.

BEGIN;

-- DIAGNÓSTICO: quantos clones têm sku ou category_id ou slug faltando
SELECT
  SUM(CASE WHEN (tgt.sku IS NULL OR tgt.sku = '') THEN 1 ELSE 0 END) AS missing_sku,
  SUM(CASE WHEN (tgt.category_id IS NULL) THEN 1 ELSE 0 END) AS missing_category_id,
  SUM(CASE WHEN (tgt.slug IS NULL OR tgt.slug = '') THEN 1 ELSE 0 END) AS missing_slug
FROM catalog_clones cc
JOIN products src ON src.id = cc.source_product_id
JOIN products tgt ON tgt.id = cc.cloned_product_id;

-- EXEMPLOS: listar alguns casos para revisão (limit 50)
SELECT
  cc.source_product_id,
  cc.cloned_product_id,
  src.user_id AS source_user,
  tgt.user_id AS target_user,
  src.sku AS src_sku,
  tgt.sku AS tgt_sku,
  src.category_id AS src_category_id,
  tgt.category_id AS tgt_category_id,
  src.slug AS src_slug,
  tgt.slug AS tgt_slug
FROM catalog_clones cc
JOIN products src ON src.id = cc.source_product_id
JOIN products tgt ON tgt.id = cc.cloned_product_id
WHERE (tgt.sku IS NULL OR tgt.sku = '' OR tgt.category_id IS NULL OR tgt.slug IS NULL OR tgt.slug = '')
LIMIT 50;

-- UPDATE: copiar sku, category_id e slug quando faltarem no clone
-- slug: usa slug da fonte quando disponível; caso contrário gera a partir do nome + hash curto
UPDATE products AS tgt
SET
  sku = COALESCE(tgt.sku, src.sku),
  category_id = COALESCE(tgt.category_id, src.category_id),
  slug = COALESCE(tgt.slug,
    COALESCE(src.slug, regexp_replace(lower(coalesce(src.name,'')),'[^a-z0-9]+','-','g') || '-' || substr(md5(random()::text),1,6))
  ),
  updated_at = now()
FROM catalog_clones cc
JOIN products src ON src.id = cc.source_product_id
WHERE tgt.id = cc.cloned_product_id
  AND (
    (tgt.sku IS NULL OR tgt.sku = '')
    OR (tgt.category_id IS NULL)
    OR (tgt.slug IS NULL OR tgt.slug = '')
  );

-- Opcional: garantir unicidade de slug no mesmo usuário (adiciona sufixo numérico se colidir)
-- Este bloco tenta renomear slugs duplicados por usuário adicionando um sufixo incremental
-- ATENÇÃO: execute apenas se necessário; pode ser custoso em tabelas grandes.
/*
WITH duplicates AS (
  SELECT user_id, slug, COUNT(*) as cnt
  FROM products
  WHERE slug IS NOT NULL AND slug <> ''
  GROUP BY user_id, slug
  HAVING COUNT(*) > 1
)
SELECT * FROM duplicates LIMIT 100;

-- Para cada duplicata, você pode aplicar uma rotina manual ou um script PL/pgSQL
*/

-- Relatar quantos produtos foram atualizados nos últimos 5 minutos
SELECT COUNT(*) AS produtos_atualizados
FROM products
WHERE updated_at > now() - interval '5 minutes';

COMMIT;
