-- Preview: quantas linhas seriam inseridas a partir de products.images (text[])
WITH expanded AS (
  SELECT p.id AS product_id,
         img.url,
         img.idx
  FROM public.products p
  JOIN LATERAL unnest(p.images) WITH ORDINALITY AS img(url, idx) ON true
  WHERE p.images IS NOT NULL
),
has_p00 AS (
  SELECT product_id, bool_or(url ILIKE '%P00%') AS has_p00
  FROM expanded
  GROUP BY product_id
),
to_insert AS (
  SELECT e.product_id, e.url, e.idx,
    CASE WHEN h.has_p00 THEN (e.url ILIKE '%P00%') ELSE (e.idx = 1) END AS is_primary,
    CASE WHEN h.has_p00 THEN CASE WHEN e.url ILIKE '%P00%' THEN 0 ELSE e.idx END ELSE e.idx END AS position
  FROM expanded e
  JOIN has_p00 h USING (product_id)
)
SELECT COUNT(*) AS would_insert
FROM to_insert
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_images pi WHERE pi.product_id = to_insert.product_id AND pi.url = to_insert.url
);
