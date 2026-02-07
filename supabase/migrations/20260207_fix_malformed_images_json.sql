-- ============================================================
-- Migration: Corrigir JSON malformado na coluna images
-- Data: 7 de fevereiro de 2026
-- ============================================================
-- PROBLEMA DETECTADO:
-- A coluna images tem objetos onde "url" contém JSON-string em vez de URL:
-- 
-- ❌ ERRADO:
-- {"url": "{\"url\": \"https://...\", \"path\": \"...\"}", "path": null}
-- 
-- ✅ CORRETO:
-- {"url": "https://...", "path": "..."}
-- 
-- CAUSA: Migração anterior que removeu external_image_url fez JSON.stringify() incorreto
-- EFEITO: Galeria mostra "sem imagem", duplicatas, comportamento inconsistente
-- ============================================================

BEGIN;

-- 1️⃣ DIAGNÓSTICO: Identificar produtos afetados
-- ============================================================
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT id)
  INTO affected_count
  FROM products p,
       jsonb_array_elements(p.images) AS elem
  WHERE p.images IS NOT NULL
    AND jsonb_typeof(p.images) = 'array'
    AND elem->>'url' LIKE '{%'  -- URL começa com { (JSON serializado)
    AND p.brand IN ('TOMMY HILFIGER', 'BOSS', 'Moschino', 'Love Moschino');
  
  RAISE NOTICE '🔍 Produtos com JSON malformado: %', affected_count;
END $$;

-- 2️⃣ BACKUP: Salvar dados antes da correção
-- ============================================================
DROP TABLE IF EXISTS _backup_malformed_images_20260207;

CREATE TEMP TABLE _backup_malformed_images_20260207 AS
SELECT 
  id,
  reference_code,
  brand,
  user_id,
  images as images_before
FROM products p
WHERE images IS NOT NULL
  AND jsonb_typeof(images) = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(p.images) AS elem
    WHERE elem->>'url' LIKE '{%'
  );

-- 3️⃣ LIMPEZA: Remover elementos malformados
-- ============================================================
-- Estratégia: Remover elementos onde url começa com '{'
-- Os elementos corretos (com URL normal) serão preservados

UPDATE products
SET 
  images = (
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
    FROM jsonb_array_elements(products.images) AS elem
    WHERE elem->>'url' NOT LIKE '{%'  -- Mantém apenas URLs normais
      AND elem->>'url' IS NOT NULL
      AND length(elem->>'url') > 10
  ),
  updated_at = NOW()
WHERE images IS NOT NULL
  AND jsonb_typeof(images) = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(products.images) AS e
    WHERE e->>'url' LIKE '{%'
  );

-- 4️⃣ LIMPEZA ADICIONAL: Remover arrays vazios resultantes
-- ============================================================
UPDATE products
SET 
  images = NULL,
  updated_at = NOW()
WHERE images IS NOT NULL
  AND jsonb_typeof(images) = 'array'
  AND jsonb_array_length(images) = 0;

-- 5️⃣ RELATÓRIO FINAL
-- ============================================================
DO $$
DECLARE
  cleaned_count INTEGER;
  nullified_count INTEGER;
  remaining_count INTEGER;
BEGIN
  -- Produtos que foram limpos (images ainda populado)
  SELECT COUNT(*)
  INTO cleaned_count
  FROM products
  WHERE images IS NOT NULL
    AND brand IN ('TOMMY HILFIGER', 'BOSS', 'Moschino', 'Love Moschino');
  
  -- Produtos onde images foi anulado (array vazio)
  SELECT COUNT(*)
  INTO nullified_count
  FROM products
  WHERE images IS NULL
    AND (gallery_images IS NOT NULL AND jsonb_array_length(gallery_images) > 0)
    AND brand IN ('TOMMY HILFIGER', 'BOSS', 'Moschino', 'Love Moschino');
  
  -- Verificar se ainda há malformados
  SELECT COUNT(DISTINCT id)
  INTO remaining_count
  FROM products p,
       jsonb_array_elements(p.images) AS elem
  WHERE p.images IS NOT NULL
    AND jsonb_typeof(p.images) = 'array'
    AND elem->>'url' LIKE '{%';
  
  RAISE NOTICE '✅ Limpeza concluída!';
  RAISE NOTICE '   - Produtos com images válido: %', cleaned_count;
  RAISE NOTICE '   - Produtos com images=NULL (gallery OK): %', nullified_count;
  RAISE NOTICE '   - Produtos ainda com JSON malformado: %', remaining_count;
  
  IF remaining_count > 0 THEN
    RAISE WARNING '⚠️  Ainda há % produto(s) com JSON malformado! Execute novamente.', remaining_count;
  END IF;
END $$;

COMMIT;

-- ============================================================
-- VERIFICAÇÃO PÓS-MIGRAÇÃO
-- ============================================================

-- Execute separadamente para verificar:

/*
-- 1. Verificar se ainda há URLs malformadas
SELECT 
  reference_code,
  brand,
  elem->>'url' as url_malformada
FROM products p,
     jsonb_array_elements(p.images) AS elem
WHERE elem->>'url' LIKE '{%'
LIMIT 10;

-- 2. Ver produtos limpos (antes vs depois)
SELECT 
  reference_code,
  brand,
  images_before,
  p.images as images_after
FROM _backup_malformed_images_20260207 b
JOIN products p ON p.id = b.id
LIMIT 5;

-- 3. Contagem final por marca
SELECT 
  brand,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE images IS NOT NULL) as com_images,
  COUNT(*) FILTER (WHERE gallery_images IS NOT NULL AND jsonb_array_length(gallery_images) > 0) as com_gallery
FROM products
WHERE brand IN ('TOMMY HILFIGER', 'BOSS', 'Moschino', 'Love Moschino')
GROUP BY brand;
*/
