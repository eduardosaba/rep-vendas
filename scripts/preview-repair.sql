-- Preview seguro: mostra 50 produtos que seriam atualizados pelo repair
BEGIN;

SELECT id,
       image_url,
       images,
       COALESCE(
         (SELECT img FROM unnest(images) img WHERE img ILIKE '%P00.jpg%' LIMIT 1),
         images[1]
       ) AS candidate
FROM products
WHERE (image_url IS NULL OR image_url NOT ILIKE '%P00.jpg%')
  AND array_length(images,1) > 0
LIMIT 50;

ROLLBACK;
