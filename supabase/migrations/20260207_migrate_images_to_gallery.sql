-- ============================================================
-- Migration: Migrar images → gallery_images (produtos master)
-- Data: 7 de fevereiro de 2026
-- ============================================================
-- PROBLEMA DETECTADO:
-- - Produtos MASTER têm galeria em "images" (legado)
-- - Produtos CLONE têm galeria em "gallery_images" (migrado)
-- - Resultado: Comportamento inconsistente entre catálogos
-- 
-- SOLUÇÃO:
-- 1. Migrar dados de "images" para "gallery_images"
-- 2. Remover is_primary=true (capa) da galeria
-- 3. Limpar "images" após migração
-- 4. Gerar image_variants para capa (480w, 1200w)
-- ============================================================

BEGIN;

-- ⚠️ PRE-FIX: converter JSONB scalars que armazenam JSON serializado como string
-- Alguns registros têm images / gallery_images / image_variants como JSON string (tipo 'string').
-- Ex: '"[]"' ou '"[{...}]"'. Isso quebra jsonb_array_length.
-- Aqui tentamos desserializar essas strings quando parecem conter um array ou objeto JSON.
UPDATE products
SET images = (regexp_replace(images::text, '^"|"$', '', 'g'))::jsonb
WHERE jsonb_typeof(images) = 'string'
  AND regexp_replace(images::text, '^"|"$', '', 'g') ~ '^[[:space:]]*\[|^[[:space:]]*\{';

UPDATE products
SET gallery_images = (regexp_replace(gallery_images::text, '^"|"$', '', 'g'))::jsonb
WHERE jsonb_typeof(gallery_images) = 'string'
  AND regexp_replace(gallery_images::text, '^"|"$', '', 'g') ~ '^[[:space:]]*\[|^[[:space:]]*\{';

UPDATE products
SET image_variants = (regexp_replace(image_variants::text, '^"|"$', '', 'g'))::jsonb
WHERE jsonb_typeof(image_variants) = 'string'
  AND regexp_replace(image_variants::text, '^"|"$', '', 'g') ~ '^[[:space:]]*\[|^[[:space:]]*\{';


-- 1️⃣ DIAGNÓSTICO: Produtos que precisam migração
-- ============================================================
DO $$
DECLARE
  needs_migration INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO needs_migration
  FROM products
  WHERE images IS NOT NULL
    AND jsonb_typeof(images) = 'array'
    AND jsonb_array_length(images) > 0
    AND (gallery_images IS NULL OR (jsonb_typeof(gallery_images) = 'array' AND jsonb_array_length(gallery_images) = 0))
    AND image_path IS NOT NULL;  -- Já tem capa migrada
  
  RAISE NOTICE '📦 Produtos que precisam migração images → gallery_images: %', needs_migration;
END $$;

-- 2️⃣ BACKUP: Salvar dados antes da migração
-- ============================================================
DROP TABLE IF EXISTS _backup_images_to_gallery_20260207;

CREATE TEMP TABLE _backup_images_to_gallery_20260207 AS
SELECT 
  id,
  reference_code,
  brand,
  user_id,
  images as images_before,
  gallery_images as gallery_before
FROM products
WHERE images IS NOT NULL
  AND jsonb_typeof(images) = 'array'
  AND jsonb_array_length(images) > 0
  AND (gallery_images IS NULL OR (jsonb_typeof(gallery_images) = 'array' AND jsonb_array_length(gallery_images) = 0));

-- 3️⃣ MIGRAÇÃO: images → gallery_images (excluindo capa)
-- ============================================================
-- Extrai apenas imagens da GALERIA (is_primary=false)
-- A capa (is_primary=true) já está em image_path

UPDATE products
SET 
  gallery_images = (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'url', elem->>'url',
        'path', elem->>'path'
      )
    ), '[]'::jsonb)
    FROM jsonb_array_elements(products.images) AS elem
    WHERE (elem->>'is_primary')::boolean = false  -- APENAS galeria, NÃO capa
      OR elem->>'is_primary' IS NULL              -- Se não tiver flag, assume galeria
  ),
  updated_at = NOW()
WHERE images IS NOT NULL
  AND jsonb_typeof(images) = 'array'
  AND jsonb_array_length(images) > 0
  AND (gallery_images IS NULL OR (jsonb_typeof(gallery_images) = 'array' AND jsonb_array_length(gallery_images) = 0))
  AND image_path IS NOT NULL;

-- 4️⃣ GERAR image_variants para capa (480w, 1200w)
-- ============================================================
-- Extrai variantes do path da capa
UPDATE products
SET 
  image_variants = (
    SELECT jsonb_agg(
      jsonb_build_object(
        'size', size,
        'path', regexp_replace(image_path, '-1200w\.webp$', '-' || size || 'w.webp'),
        'url', 'https://aawghxjbipcqefmikwby.supabase.co/storage/v1/object/public/product-images/' || 
               regexp_replace(image_path, '-1200w\.webp$', '-' || size || 'w.webp')
      )
    )
    FROM (VALUES (480), (1200)) AS sizes(size)
  ),
  updated_at = NOW()
WHERE image_path IS NOT NULL
  AND image_path LIKE '%-1200w.webp'
  AND (image_variants IS NULL OR (jsonb_typeof(image_variants) = 'array' AND jsonb_array_length(image_variants) = 0))
  AND EXISTS (
    SELECT 1 FROM products p2 
    WHERE p2.id = products.id 
      AND p2.images IS NOT NULL
      AND jsonb_typeof(p2.images) = 'array'
      AND jsonb_array_length(p2.images) > 0
  );

-- 5️⃣ LIMPAR images após migração bem-sucedida
-- ============================================================
UPDATE products
SET 
  images = NULL,
  updated_at = NOW()
WHERE images IS NOT NULL
  AND gallery_images IS NOT NULL
  AND jsonb_typeof(gallery_images) = 'array'
  AND jsonb_array_length(gallery_images) > 0;

-- 6️⃣ RELATÓRIO FINAL
-- ============================================================
DO $$
DECLARE
  migrated_count INTEGER;
  with_gallery INTEGER;
  with_variants INTEGER;
  cleaned_count INTEGER;
BEGIN
  -- Produtos com gallery_images populado agora
  SELECT COUNT(*)
  INTO with_gallery
  FROM products
  WHERE gallery_images IS NOT NULL 
    AND jsonb_typeof(gallery_images) = 'array'
    AND jsonb_array_length(gallery_images) > 0
    AND brand IN ('TOMMY HILFIGER', 'BOSS', 'Moschino', 'Love Moschino');
  
  -- Produtos com image_variants gerado
  SELECT COUNT(*)
  INTO with_variants
  FROM products
  WHERE image_variants IS NOT NULL 
    AND jsonb_typeof(image_variants) = 'array'
    AND jsonb_array_length(image_variants) > 0
    AND brand IN ('TOMMY HILFIGER', 'BOSS', 'Moschino', 'Love Moschino');
  
  -- Produtos onde images foi limpo
  SELECT COUNT(*)
  INTO cleaned_count
  FROM products
  WHERE images IS NULL
    AND gallery_images IS NOT NULL
    AND jsonb_typeof(gallery_images) = 'array'
    AND jsonb_array_length(gallery_images) > 0
    AND brand IN ('TOMMY HILFIGER', 'BOSS', 'Moschino', 'Love Moschino');
  
  RAISE NOTICE '✅ Migração concluída!';
  RAISE NOTICE '   - Produtos com gallery_images: %', with_gallery;
  RAISE NOTICE '   - Produtos com image_variants: %', with_variants;
  RAISE NOTICE '   - Produtos com images limpo: %', cleaned_count;
END $$;

COMMIT;

-- ============================================================
-- VERIFICAÇÃO PÓS-MIGRAÇÃO
-- ============================================================

-- Execute separadamente para verificar:

/*
-- 1. Comparar ANTES vs DEPOIS
SELECT 
  b.reference_code,
  b.brand,
  CASE WHEN jsonb_typeof(b.images_before) = 'array' THEN jsonb_array_length(b.images_before) ELSE 0 END as antes_images,
  CASE WHEN jsonb_typeof(b.gallery_before) = 'array' THEN jsonb_array_length(b.gallery_before) ELSE 0 END as antes_gallery,
  CASE WHEN jsonb_typeof(p.images) = 'array' THEN jsonb_array_length(p.images) ELSE 0 END as depois_images,
  CASE WHEN jsonb_typeof(p.gallery_images) = 'array' THEN jsonb_array_length(p.gallery_images) ELSE 0 END as depois_gallery,
  CASE WHEN jsonb_typeof(p.image_variants) = 'array' THEN jsonb_array_length(p.image_variants) ELSE 0 END as depois_variants
FROM _backup_images_to_gallery_20260207 b
JOIN products p ON p.id = b.id
LIMIT 10;

-- 2. Ver estrutura migrada
SELECT 
  reference_code,
  brand,
  CASE WHEN jsonb_typeof(gallery_images) = 'array' THEN jsonb_array_length(gallery_images) ELSE 0 END as qtd_gallery,
  CASE WHEN jsonb_typeof(image_variants) = 'array' THEN jsonb_array_length(image_variants) ELSE 0 END as qtd_variants,
  CASE WHEN images IS NULL THEN 'NULL' ELSE 'AINDA POPULADO' END as status_images
FROM products
WHERE brand IN ('TOMMY HILFIGER', 'BOSS', 'Moschino', 'Love Moschino')
  AND gallery_images IS NOT NULL
ORDER BY reference_code
LIMIT 20;

-- 3. Verificar se master e clone agora têm mesma estrutura
SELECT 
  p1.reference_code,
  
  -- MASTER
  
  -- CLONE
  CASE WHEN jsonb_typeof(p1.gallery_images) = 'array' THEN jsonb_array_length(p1.gallery_images) ELSE 0 END as master_gallery,
  CASE WHEN jsonb_typeof(p1.image_variants) = 'array' THEN jsonb_array_length(p1.image_variants) ELSE 0 END as master_variants,
  CASE WHEN p1.images IS NULL THEN 'NULL' ELSE 'POPULADO' END as master_images,

  CASE WHEN jsonb_typeof(p2.gallery_images) = 'array' THEN jsonb_array_length(p2.gallery_images) ELSE 0 END as clone_gallery,
  CASE WHEN jsonb_typeof(p2.image_variants) = 'array' THEN jsonb_array_length(p2.image_variants) ELSE 0 END as clone_variants,
  CASE WHEN p2.images IS NULL THEN 'NULL' ELSE 'POPULADO' END as clone_images
FROM products p1
INNER JOIN products p2 ON p1.reference_code = p2.reference_code AND p1.user_id != p2.user_id
WHERE p1.image_is_shared = true
  AND p1.brand = 'TOMMY HILFIGER'
LIMIT 10;
*/
