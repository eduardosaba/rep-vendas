-- 1) Listar entries públicas e banners
SELECT id, user_id, slug, banners, banners_mobile, brands, updated_at
FROM public_catalogs
ORDER BY updated_at DESC
LIMIT 200;

-- 2) Contagem de produtos com/sem marca por usuário
SELECT user_id,
       COUNT(*) AS total_products,
       COUNT(*) FILTER (WHERE COALESCE(NULLIF(TRIM(brand),''), '') <> '') AS has_brand,
       COUNT(*) FILTER (WHERE brand IS NULL OR TRIM(brand) = '') AS no_brand
FROM products
GROUP BY user_id
ORDER BY total_products DESC
LIMIT 100;

-- 3) Produtos com image_url possivelmente concatenado (mais de uma ocorrência de http)
SELECT id, reference_code, name, brand, image_url, external_image_url, sync_status, sync_error, updated_at
FROM products
WHERE image_url ~ '(https?:\\/\\/).*(https?:\\/\\/)'
ORDER BY updated_at DESC
LIMIT 200;
