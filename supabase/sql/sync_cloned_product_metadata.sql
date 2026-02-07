-- Script: Sincronizar metadados faltantes em produtos já clonados
-- Data: 2026-02-07
-- Uso: Executar UMA VEZ após aplicar migration 20260207_clone_add_product_metadata.sql
-- Propósito: Atualizar produtos clonados anteriormente que não possuem barcode, technical_specs, color

-- PASSO 1: Diagnóstico - Ver quantos produtos clonados precisam de atualização
SELECT 
  COUNT(*) as produtos_a_atualizar,
  COUNT(DISTINCT cc.target_user_id) as usuarios_afetados
FROM catalog_clones cc
JOIN products src ON src.id = cc.source_product_id
JOIN products tgt ON tgt.id = cc.cloned_product_id
WHERE 
  -- Atualizar apenas onde fonte tem dados E clone não tem
  (
    (src.barcode IS NOT NULL AND tgt.barcode IS NULL)
    OR (src.technical_specs IS NOT NULL AND tgt.technical_specs IS NULL)
    OR (src.color IS NOT NULL AND tgt.color IS NULL)
  );

-- PASSO 2: Ver exemplos de produtos que serão atualizados (opcional)
SELECT 
  src.name as produto_original,
  src.barcode as barcode_original,
  tgt.barcode as barcode_clonado,
  src.technical_specs IS NOT NULL as tem_ficha_tecnica,
  tgt.technical_specs IS NULL as clone_sem_ficha,
  src.color as cor_original,
  tgt.color as cor_clonada,
  cc.target_user_id as usuario_clonado
FROM catalog_clones cc
JOIN products src ON src.id = cc.source_product_id
JOIN products tgt ON tgt.id = cc.cloned_product_id
WHERE 
  (src.barcode IS NOT NULL AND tgt.barcode IS NULL)
  OR (src.technical_specs IS NOT NULL AND tgt.technical_specs IS NULL)
  OR (src.color IS NOT NULL AND tgt.color IS NULL)
LIMIT 20;

-- PASSO 3: Executar atualização (DESCOMENTE APÓS REVISAR PASSOS 1 E 2)
/*
BEGIN;

UPDATE products AS tgt
SET 
  barcode = src.barcode,
  technical_specs = src.technical_specs,
  color = src.color,
  updated_at = now()
FROM catalog_clones cc
JOIN products src ON src.id = cc.source_product_id
WHERE tgt.id = cc.cloned_product_id
  AND (
    (src.barcode IS NOT NULL AND tgt.barcode IS NULL)
    OR (src.technical_specs IS NOT NULL AND tgt.technical_specs IS NULL)
    OR (src.color IS NOT NULL AND tgt.color IS NULL)
  );

-- Ver quantos foram atualizados
SELECT 
  COUNT(*) as produtos_atualizados,
  COUNT(DISTINCT user_id) as usuarios_afetados
FROM products
WHERE updated_at > now() - interval '10 seconds';

COMMIT;
*/

-- PASSO 4 (OPCIONAL): Verificar resultado após atualização
/*
SELECT 
  COUNT(*) as produtos_ainda_faltando
FROM catalog_clones cc
JOIN products src ON src.id = cc.source_product_id
JOIN products tgt ON tgt.id = cc.cloned_product_id
WHERE 
  (src.barcode IS NOT NULL AND tgt.barcode IS NULL)
  OR (src.technical_specs IS NOT NULL AND tgt.technical_specs IS NULL)
  OR (src.color IS NOT NULL AND tgt.color IS NULL);
*/

-- ALTERNATIVA: Se quiser atualizar apenas um usuário específico
/*
UPDATE products AS tgt
SET 
  barcode = src.barcode,
  technical_specs = src.technical_specs,
  color = src.color,
  updated_at = now()
FROM catalog_clones cc
JOIN products src ON src.id = cc.source_product_id
WHERE tgt.id = cc.cloned_product_id
  AND tgt.user_id = 'COLE_AQUI_O_UUID_DO_USUARIO'
  AND (
    (src.barcode IS NOT NULL AND tgt.barcode IS NULL)
    OR (src.technical_specs IS NOT NULL AND tgt.technical_specs IS NULL)
    OR (src.color IS NOT NULL AND tgt.color IS NULL)
  );
*/
