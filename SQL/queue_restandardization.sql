-- Script para enfileirar imagens antigas para padronização (Tier-2)

-- 1. Identificar e marcar imagens que já estão sincronizadas
-- mas não estão no formato WebP (padrão novo mais leve)
UPDATE public.products
SET 
  sync_status = 'pending',
  sync_error = 'Re-padronização: Otimizando para WebP' -- Flag de Baixa Prioridade
WHERE sync_status = 'synced' 
  AND image_url NOT ILIKE '%.webp%';

-- 2. Diagnóstico da Fila (Para conferência)
SELECT 
  CASE 
    WHEN sync_error IS NULL THEN 'Prioridade 1: Novos'
    WHEN sync_error LIKE 'Re-padroniza%' THEN 'Prioridade 2: Manutenção'
    ELSE 'Falhas Anteriores'
  END as tipo_fila,
  COUNT(*) as quantidade
FROM products
WHERE sync_status = 'pending'
GROUP BY 
  CASE 
    WHEN sync_error IS NULL THEN 'Prioridade 1: Novos'
    WHEN sync_error LIKE 'Re-padroniza%' THEN 'Prioridade 2: Manutenção'
    ELSE 'Falhas Anteriores'
  END;