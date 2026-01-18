-- 1. DIAGNÓSTICO: Listar os 20 produtos com erro de imagem mais recentes
-- Use esta query para entender POR QUE as imagens estão falhando (403 Forbidden, 404, Timeout, etc)
SELECT name, image_url, sync_error, sync_status
FROM public.products
WHERE sync_status = 'failed'
ORDER BY updated_at DESC
LIMIT 20;

-- 2. CORREÇÃO: Resetar produtos com erro para tentar novamente
-- Se o erro foi temporário (timeout) ou se você já corrigiu o código do Worker/Links
-- execute isso e depois clique em "Otimizar" na Torre de Controle.
UPDATE public.products
SET 
  sync_status = 'pending',
  sync_error = NULL
WHERE sync_status = 'failed';

-- 3. FORÇAR RE-SIMCRONIZAÇÃO TOTAL (Cuidado: Demorado)
-- Use apenas se quiser refazer TODAS as imagens do sistema
-- UPDATE public.products SET sync_status = 'pending', sync_error = NULL WHERE image_url IS NOT NULL;
