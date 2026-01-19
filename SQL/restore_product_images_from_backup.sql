-- Restore product_images from backup_product_images for products that had images
-- WARNING: run this in a safe environment (staging) and ensure you have a DB backup.
-- This script deletes current product_images for products that had `products.images` and reinserts the rows saved in `backup_product_images`.

DO $$
DECLARE
  cols text;
BEGIN
  -- Build column list excluding the backup timestamp
  SELECT string_agg(quote_ident(column_name), ',') INTO cols
  FROM information_schema.columns
  WHERE table_name = 'product_images' AND column_name != 'backup_at'
  ORDER BY ordinal_position;

  IF cols IS NULL THEN
    RAISE EXCEPTION 'Could not determine columns for product_images';
  END IF;

  EXECUTE format(
    $f$
    -- delete current generated rows for affected products
    DELETE FROM public.product_images
    WHERE product_id IN (SELECT id FROM public.products WHERE images IS NOT NULL);

    -- insert backup rows for affected products
    INSERT INTO public.product_images (%s)
    SELECT %s
    FROM public.backup_product_images
    WHERE product_id IN (SELECT id FROM public.products WHERE images IS NOT NULL);
    $f$
  , cols, cols);
END
$$;
