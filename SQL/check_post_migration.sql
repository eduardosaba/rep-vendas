-- Checagens pós-migração
-- Quantos por status
SELECT sync_status, COUNT(*) AS total FROM public.product_images GROUP BY sync_status ORDER BY total DESC;

-- Quantos produtos migrados na última hora
SELECT COUNT(DISTINCT product_id) AS migrated_products_last_hour
FROM public.product_images
WHERE created_at >= (now() - interval '1 hour');

-- Amostra de novos pendings (últimas 200)
SELECT id, product_id, url, is_primary, position, sync_status, created_at
FROM public.product_images
WHERE created_at >= (now() - interval '1 hour')
ORDER BY created_at DESC
LIMIT 200;
