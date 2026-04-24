-- Dedupe existing duplicates in product_genders and categories
-- 1) Run the SELECT blocks to preview duplicates
-- 2) If OK, run the DELETE blocks to remove duplicates (keeps one row per user+name)
-- 3) Then run sync_product_metadata_safe.sql to create indexes and RPC

-- Preview duplicate product_genders
SELECT user_id,
       lower(trim(name)) AS normalized,
       count(*) AS cnt,
       array_agg(json_build_object('id', id, 'name', name, 'image_url', image_url) ORDER BY (CASE WHEN image_url IS NOT NULL AND image_url <> '' THEN 0 ELSE 1 END), id) AS rows
FROM product_genders
GROUP BY user_id, lower(trim(name))
HAVING count(*) > 1
ORDER BY user_id, normalized;

-- Preview duplicate categories
SELECT user_id,
       lower(trim(name)) AS normalized,
       count(*) AS cnt,
       array_agg(json_build_object('id', id, 'name', name, 'image_url', image_url) ORDER BY (CASE WHEN image_url IS NOT NULL AND image_url <> '' THEN 0 ELSE 1 END), id) AS rows
FROM categories
GROUP BY user_id, lower(trim(name))
HAVING count(*) > 1
ORDER BY user_id, normalized;

-- DELETE duplicates in product_genders (keeps one per user + normalized name)
WITH ranked AS (
  SELECT id,
         user_id,
         name,
         image_url,
         row_number() OVER (PARTITION BY user_id, lower(trim(name))
                            ORDER BY (CASE WHEN image_url IS NOT NULL AND image_url <> '' THEN 0 ELSE 1 END), id) AS rn
  FROM product_genders
)
DELETE FROM product_genders
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- DELETE duplicates in categories (keeps one per user + normalized name)
WITH ranked AS (
  SELECT id,
         user_id,
         name,
         image_url,
         row_number() OVER (PARTITION BY user_id, lower(trim(name))
                            ORDER BY (CASE WHEN image_url IS NOT NULL AND image_url <> '' THEN 0 ELSE 1 END), id) AS rn
  FROM categories
)
DELETE FROM categories
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- After running this file, run sync_product_metadata_safe.sql to create indexes and the RPC.
