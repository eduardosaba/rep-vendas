-- SQL de verificação para `product_images.optimized_variants`
-- Mostra contagens e amostras para validar variantes 480w e 1200w

-- Total de product_images com optimized_variants
SELECT count(*) AS total_with_variants
FROM product_images
WHERE optimized_variants IS NOT NULL;

-- Quantas têm variante 480
SELECT count(*) AS have_480
FROM product_images
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(optimized_variants) elem
  WHERE (elem->>'size')::int = 480
);

-- Quantas têm variante 1200
SELECT count(*) AS have_1200
FROM product_images
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(optimized_variants) elem
  WHERE (elem->>'size')::int = 1200
);

-- Quantas têm ambas (480 e 1200)
SELECT count(*) AS have_both_480_1200
FROM product_images
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(optimized_variants) elem
  WHERE (elem->>'size')::int = 480
) AND EXISTS (
  SELECT 1 FROM jsonb_array_elements(optimized_variants) elem
  WHERE (elem->>'size')::int = 1200
);

-- Amostra: imagens que NÃO possuem 1200 (limite 20)
SELECT id, product_id, optimized_variants
FROM product_images
WHERE NOT EXISTS (
  SELECT 1 FROM jsonb_array_elements(optimized_variants) elem
  WHERE (elem->>'size')::int = 1200
)
LIMIT 20;

-- Amostra: primeiras 20 linhas com optimized_variants (para inspeção)
SELECT id, product_id, optimized_variants
FROM product_images
WHERE optimized_variants IS NOT NULL
LIMIT 20;
