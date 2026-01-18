-- ========================================
-- RESET DE QUALIDADE: Múltiplas Versões WebP
-- ========================================
-- Este script NÃO apaga produtos. Apenas marca todos os produtos com imagens
-- externas como "pending" para que o novo Worker de 3 versões (small, medium, large)
-- reprocesse as fotos automaticamente.
--
-- VANTAGENS:
-- ✅ Mantém integridade de pedidos ativos
-- ✅ Preserva IDs de produtos (não quebra favoritos/carrinhos)
-- ✅ Permite rollback (o Worker sobrescreve com "upsert", não apaga)
-- ========================================

-- 1. Marcar TODOS os produtos com imagens externas como pendentes
-- (Isso força o reprocessamento para gerar small, medium e large)
UPDATE public.products
SET 
  sync_status = 'pending',
  sync_error = 'Upgrade: Gerando múltiplas resoluções WebP (small, medium, large)',
  updated_at = now()
WHERE 
  image_url IS NOT NULL 
  AND image_url != ''
  AND (
    -- Marca apenas URLs externas (não processadas ainda)
    image_url LIKE 'http%' 
    AND NOT image_url LIKE '%supabase%'
  );

-- 2. Marcar imagens da tabela product_images (galeria) como pendentes
-- (Isso garante que a galeria de produtos também seja reprocessada)
UPDATE public.product_images
SET 
  sync_status = 'pending',
  sync_error = 'Upgrade: Gerando múltiplas resoluções WebP (small, medium, large)'
WHERE 
  url IS NOT NULL 
  AND url != ''
  AND (
    -- Marca apenas URLs externas
    url LIKE 'http%' 
    AND NOT url LIKE '%supabase%'
  );

-- ========================================
-- OPCIONAL: Marcar TODAS as imagens (mesmo as já processadas) para re-padronização
-- ========================================
-- Se você quiser reprocessar ATÉ as imagens que já foram otimizadas anteriormente
-- (útil para migrar do padrão antigo de 1000px para o novo de 3 versões),
-- descomente os comandos abaixo:

-- UPDATE public.products
-- SET 
--   sync_status = 'pending',
--   sync_error = 'Re-padronização: Gerando múltiplas resoluções (small, medium, large)',
--   updated_at = now()
-- WHERE 
--   image_url IS NOT NULL 
--   AND image_url != '';

-- UPDATE public.product_images
-- SET 
--   sync_status = 'pending',
--   sync_error = 'Re-padronização: Gerando múltiplas resoluções (small, medium, large)'
-- WHERE 
--   url IS NOT NULL 
--   AND url != '';

-- ========================================
-- APÓS EXECUTAR ESTE SCRIPT:
-- ========================================
-- 1. O Worker de CRON (Inngest) processará automaticamente as imagens a cada 5 minutos
-- 2. A rota API /api/admin/sync-images pode ser chamada manualmente para processar blocos de 25 produtos
-- 3. Acompanhe o progresso via Dashboard (produtos com sync_status = 'pending' estão na fila)
-- 4. Nenhum dado será perdido: o "upsert" sobrescreve os arquivos antigos sem apagar registros
