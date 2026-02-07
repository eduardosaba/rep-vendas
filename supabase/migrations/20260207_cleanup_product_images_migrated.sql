-- ============================================================
-- Migration: Cleanup product.images em produtos migrados
-- Data: 7 de fevereiro de 2026
-- ============================================================
-- Propósito: Remover entradas antigas/quebradas da coluna `images`
-- em produtos que já foram migrados para gallery_images ou image_path.
-- 
-- PROBLEMA RESOLVIDO:
-- - Galeria mostrando imagens duplicadas ou quebradas
-- - URLs antigas de Safilo/CDN que foram deletadas
-- - Comportamento inconsistente entre catálogos (migrados vs legados)
-- ============================================================

BEGIN;

-- 1️⃣ DIAGNÓSTICO: Contar produtos afetados
-- ============================================================

DO $$
DECLARE
  total_migrated INTEGER;
  total_with_images INTEGER;
  total_to_clean INTEGER;
BEGIN
  -- Produtos migrados (tem gallery_images ou image_path)
  SELECT COUNT(*)
  INTO total_migrated
  FROM products
  WHERE image_path IS NOT NULL
     OR (gallery_images IS NOT NULL AND jsonb_array_length(gallery_images) > 0);

  -- Produtos migrados QUE AINDA TÊM images populado
  SELECT COUNT(*)
  INTO total_to_clean
  FROM products
  WHERE (image_path IS NOT NULL OR (gallery_images IS NOT NULL AND jsonb_array_length(gallery_images) > 0))
    AND images IS NOT NULL;

  RAISE NOTICE '📊 Diagnóstico:';
  RAISE NOTICE '   - Produtos migrados: %', total_migrated;
  RAISE NOTICE '   - Produtos a limpar: %', total_to_clean;
END $$;

-- 2️⃣ BACKUP: Criar tabela temporária para segurança
-- ============================================================

DROP TABLE IF EXISTS _backup_product_images_20260207;

CREATE TEMP TABLE _backup_product_images_20260207 AS
SELECT 
  id,
  reference_code,
  name,
  brand,
  images,
  image_path,
  gallery_images,
  user_id
FROM products
WHERE (image_path IS NOT NULL OR (gallery_images IS NOT NULL AND jsonb_array_length(gallery_images) > 0))
  AND images IS NOT NULL;

-- 3️⃣ LIMPEZA: Remover coluna images onde já temos gallery_images
-- ============================================================

UPDATE products
SET 
  images = NULL,
  updated_at = NOW()
WHERE 
  -- Produto migrado (tem gallery_images populado)
  (gallery_images IS NOT NULL AND jsonb_array_length(gallery_images) > 0)
  -- E ainda tem images populado
  AND images IS NOT NULL;

-- 4️⃣ LIMPEZA ADICIONAL: Produtos com image_path mas sem gallery_images
-- ============================================================
-- Esses produtos têm apenas CAPA internalizada, mas images pode ter galeria antiga.
-- Limpamos APENAS se images parecer ser uma duplicata da capa (1 item = capa).

UPDATE products
SET 
  images = NULL,
  updated_at = NOW()
WHERE 
  -- Tem image_path (capa internalizada)
  image_path IS NOT NULL
  -- NÃO tem gallery_images ainda (só capa, sem galeria)
  AND (gallery_images IS NULL OR jsonb_array_length(gallery_images) = 0)
  -- Mas tem images populado
  AND images IS NOT NULL
  -- E images tem apenas 1 elemento (provavelmente a capa duplicada)
  AND (
    (jsonb_typeof(images) = 'array' AND jsonb_array_length(images) <= 1)
    OR jsonb_typeof(images) != 'array'  -- Limpa também scalars/strings
  );

-- 5️⃣ RELATÓRIO FINAL
-- ============================================================

DO $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO cleaned_count
  FROM products
  WHERE (image_path IS NOT NULL OR (gallery_images IS NOT NULL AND jsonb_array_length(gallery_images) > 0))
    AND images IS NULL;

  RAISE NOTICE '✅ Limpeza concluída!';
  RAISE NOTICE '   - Produtos com images=NULL: %', cleaned_count;
  RAISE NOTICE '   - Backup salvo em: _backup_product_images_20260207 (sessão temporária)';
END $$;

COMMIT;

-- ============================================================
-- VERIFICAÇÃO PÓS-MIGRAÇÃO
-- ============================================================

-- Execute separadamente para verificar:

/*
-- 1. Ver quantos produtos ainda têm images populado
SELECT 
  COUNT(*) FILTER (WHERE images IS NOT NULL) as com_images,
  COUNT(*) FILTER (WHERE images IS NULL) as sem_images,
  COUNT(*) FILTER (WHERE gallery_images IS NOT NULL AND jsonb_array_length(gallery_images) > 0) as com_gallery
FROM products
WHERE image_path IS NOT NULL OR (gallery_images IS NOT NULL AND jsonb_array_length(gallery_images) > 0);

-- 2. Ver amostra de produtos migrados
SELECT 
  reference_code,
  name,
  brand,
  CASE WHEN image_path IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_image_path,
  CASE WHEN gallery_images IS NOT NULL AND jsonb_array_length(gallery_images) > 0 THEN jsonb_array_length(gallery_images) ELSE 0 END as qtd_gallery,
  CASE WHEN images IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_images_antigo
FROM products
WHERE gallery_images IS NOT NULL AND jsonb_array_length(gallery_images) > 0
ORDER BY created_at DESC
LIMIT 20;
*/
