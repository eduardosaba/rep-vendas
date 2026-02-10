-- Normalize storage paths: remove redundant 'public/' segments inside product-images paths
-- Execute on Supabase SQL editor or via psql. Review before running.

BEGIN;

-- 1) Brands: logo and banner URLs/paths
UPDATE brands
SET logo_url = regexp_replace(logo_url, '/?product-images/public/', 'product-images/', 'gi')
WHERE logo_url IS NOT NULL AND logo_url ~* 'product-images/public';

UPDATE brands
SET banner_url = regexp_replace(banner_url, '/?product-images/public/', 'product-images/', 'gi')
WHERE banner_url IS NOT NULL AND banner_url ~* 'product-images/public';

-- 2) Products: image_path (legacy paths)
UPDATE products
SET image_path = regexp_replace(image_path, '/?product-images/public/', 'product-images/', 'gi')
WHERE image_path IS NOT NULL AND image_path ~* 'product-images/public';

-- 3) product_images: storage_path
UPDATE product_images
SET storage_path = regexp_replace(storage_path, '/?product-images/public/', 'product-images/', 'gi')
WHERE storage_path IS NOT NULL AND storage_path ~* 'product-images/public';

-- 4) public_catalogs: logo fields and array elements (banners)
UPDATE public_catalogs
SET logo_url = regexp_replace(logo_url, '/?product-images/public/', 'product-images/', 'gi')
WHERE logo_url IS NOT NULL AND logo_url ~* 'product-images/public';

UPDATE public_catalogs
SET single_brand_logo_url = regexp_replace(single_brand_logo_url, '/?product-images/public/', 'product-images/', 'gi')
WHERE single_brand_logo_url IS NOT NULL AND single_brand_logo_url ~* 'product-images/public';

-- Normalize array elements for banners
UPDATE public_catalogs
SET banners = (
  SELECT array_agg(regexp_replace(b, '/?product-images/public/', 'product-images/', 'gi'))
  FROM unnest(banners) b
)
WHERE banners IS NOT NULL AND EXISTS (SELECT 1 FROM unnest(banners) b WHERE b ~* 'product-images/public');

UPDATE public_catalogs
SET banners_mobile = (
  SELECT array_agg(regexp_replace(b, '/?product-images/public/', 'product-images/', 'gi'))
  FROM unnest(banners_mobile) b
)
WHERE banners_mobile IS NOT NULL AND EXISTS (SELECT 1 FROM unnest(banners_mobile) b WHERE b ~* 'product-images/public');

COMMIT;

-- Verification queries (run after):
-- SELECT id, logo_url, single_brand_logo_url, banners, banners_mobile FROM public_catalogs WHERE slug='template';
-- SELECT id, name, logo_url FROM brands WHERE logo_url ~* 'product-images/public';
-- SELECT id, image_path FROM products WHERE image_path ~* 'product-images/public' LIMIT 20;
