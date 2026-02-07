-- Migration: Cleanup image_url and external_image_url in master products
-- Date: 2026-02-07
-- Purpose: Apply same image field cleanup to master products that's applied to clones
-- This ensures consistent gallery behavior between master and cloned catalogs

-- Clean up image_url and external_image_url when image_path exists
-- (same logic used in clone_catalog_smart function)
UPDATE public.products
SET 
  image_url = NULL,
  external_image_url = NULL,
  updated_at = now()
WHERE 
  image_path IS NOT NULL
  AND (
    image_url IS NOT NULL 
    OR external_image_url IS NOT NULL
  );

-- Notes:
-- - This removes redundant image URLs when a product has internal storage (image_path)
-- - Prevents duplicate images in gallery view
-- - Matches the cleanup logic already applied to cloned products
-- - Products without image_path keep their external URLs as fallback
