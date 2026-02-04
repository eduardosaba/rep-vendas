-- ========================================
-- DEBUG: Por que product_images não sincroniza?
-- ========================================

-- 1. Ver estado atual de product_images para 1 produto
SELECT 
  id,
  product_id,
  url,
  optimized_url,
  storage_path,
  sync_status,
  created_at,
  updated_at
FROM product_images
WHERE product_id = '21cd1637-a8d3-4622-82ca-9c15ff32ac2e'
ORDER BY position, created_at;

-- 2. Verificar se optimized_url foi populado mas sync_status não
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE optimized_url IS NOT NULL) as com_optimized_url,
  COUNT(*) FILTER (WHERE sync_status = 'synced') as marcados_synced,
  COUNT(*) FILTER (WHERE optimized_url IS NOT NULL AND sync_status != 'synced') as PROBLEMA
FROM product_images
WHERE product_id = '21cd1637-a8d3-4622-82ca-9c15ff32ac2e';

-- 3. Ver products.images JSONB (deve ter objetos {url, path})
SELECT 
  id,
  reference_code,
  sync_status,
  jsonb_typeof(images) as images_type,
  jsonb_array_length(images) as images_count,
  images
FROM products
WHERE id = '21cd1637-a8d3-4622-82ca-9c15ff32ac2e';

-- 4. Verificar se há triggers ou políticas RLS bloqueando updates
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'product_images';

-- ========================================
-- CORREÇÃO MANUAL (se necessário)
-- ========================================

-- Se descobrir que optimized_url está populado mas sync_status não:
-- UPDATE product_images
-- SET sync_status = 'synced'
-- WHERE product_id = '21cd1637-a8d3-4622-82ca-9c15ff32ac2e'
-- AND optimized_url IS NOT NULL
-- AND storage_path IS NOT NULL
-- AND sync_status != 'synced';

-- ========================================
-- RE-SYNC FORÇADO (resetar para pending)
-- ========================================

-- Para forçar re-processamento de 1 produto específico:
-- UPDATE products
-- SET sync_status = 'pending', sync_error = NULL
-- WHERE id = '21cd1637-a8d3-4622-82ca-9c15ff32ac2e';

-- UPDATE product_images
-- SET sync_status = 'pending', optimized_url = NULL, storage_path = NULL
-- WHERE product_id = '21cd1637-a8d3-4622-82ca-9c15ff32ac2e';
