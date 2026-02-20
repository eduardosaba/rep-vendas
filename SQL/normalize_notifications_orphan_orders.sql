-- Script: normalize_notifications_orphan_orders.sql
-- Objetivo: encontrar notificações que apontam para pedidos inexistentes
-- e normalizá-las para apontar para a listagem de pedidos.
-- Uso: cole este script no editor SQL do Supabase e revise o SELECT antes de executar o UPDATE.

-- 1) PREVIEW — lista notificações órfãs (não há pedido correspondente)
SELECT
  n.id,
  n.user_id,
  n.title,
  n.link,
  n.created_at
FROM public.notifications n
LEFT JOIN public.orders o ON n.link LIKE ('%/' || o.id)
WHERE n.link ILIKE '/dashboard/orders/%' AND o.id IS NULL
ORDER BY n.created_at DESC;

-- 2) ACTION (exemplo) — atualiza essas notificações para apontar para a lista
-- ATENÇÃO: descongele/rode após revisar o SELECT acima.
BEGIN;
UPDATE public.notifications n
SET link = '/dashboard/orders',
    -- supondo que exista a coluna `read`/`read_at`; se não existir remova esta linha
    read = true
FROM (
  SELECT n.id FROM public.notifications n
  LEFT JOIN public.orders o ON n.link LIKE ('%/' || o.id)
  WHERE n.link ILIKE '/dashboard/orders/%' AND o.id IS NULL
) bad
WHERE n.id = bad.id;
COMMIT;

-- 3) DELETE OPTION (alternativa)
-- Se preferir remover as notificações órfãs em vez de atualizá-las, use:
-- BEGIN;
-- DELETE FROM public.notifications
-- WHERE id IN (
--   SELECT n.id FROM public.notifications n
--   LEFT JOIN public.orders o ON n.link LIKE ('%/' || o.id)
--   WHERE n.link ILIKE '/dashboard/orders/%' AND o.id IS NULL
-- );
-- COMMIT;
