-- 1. Resetar todos os produtos que FALHARAM anteriormente
-- Limpamos o erro para que o novo Worker tente do zero
UPDATE public.products 
SET 
  sync_status = 'pending', 
  sync_error = NULL
WHERE sync_status = 'failed';

-- 2. (IMPORTANTE) Identificar produtos que têm URL externa
-- mas que por algum motivo não estão marcados como 'pending'
-- Adapte o '%safilo.com%' se houver outros domínios externos que deseja processar
UPDATE public.products
SET 
  sync_status = 'pending',
  sync_error = NULL
WHERE (image_url ILIKE 'http%' AND image_url NOT ILIKE '%supabase.co%') -- Busca qualquer URL externa que não seja o próprio Supabase
  AND (sync_status IS NULL OR sync_status = 'synced');

-- 3. Verificar o tamanho da fila
SELECT sync_status, COUNT(*) as total
FROM public.products 
GROUP BY sync_status;