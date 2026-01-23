-- Cria a função que promove P00 ou usa a primeira imagem como fallback
CREATE OR REPLACE FUNCTION public.repair_product_covers_logic()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count integer := 0;
BEGIN
  UPDATE products p
  SET image_url = COALESCE(
    (SELECT img FROM unnest(p.images) img WHERE img ILIKE '%P00.jpg%' LIMIT 1),
    p.images[1]
  )
  WHERE (p.image_url IS NULL OR p.image_url NOT ILIKE '%P00.jpg%')
    AND array_length(p.images,1) > 0;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
