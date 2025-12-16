-- Migration: Add storage policies to enforce per-user isolation on storage paths
-- Created: 2025-12-16
-- Buckets covered: product-images, avatars, products

-- NOTE:
-- Paths are expected to follow the pattern: public/<user_id>/... so the
-- actual user id is in the second path segment. Adjust split_part(...) if
-- you use a different layout (e.g. no `public/` prefix).

-- Drop existing policies (safe to re-run)
DROP POLICY IF EXISTS allow_select_product_images ON storage.objects;
DROP POLICY IF EXISTS allow_insert_product_images ON storage.objects;
DROP POLICY IF EXISTS allow_update_product_images ON storage.objects;
DROP POLICY IF EXISTS allow_delete_product_images ON storage.objects;

DROP POLICY IF EXISTS allow_select_avatars ON storage.objects;
DROP POLICY IF EXISTS allow_insert_avatars ON storage.objects;
DROP POLICY IF EXISTS allow_update_avatars ON storage.objects;
DROP POLICY IF EXISTS allow_delete_avatars ON storage.objects;

DROP POLICY IF EXISTS allow_select_products ON storage.objects;
DROP POLICY IF EXISTS allow_insert_products ON storage.objects;
DROP POLICY IF EXISTS allow_update_products ON storage.objects;
DROP POLICY IF EXISTS allow_delete_products ON storage.objects;

-- Helper: checks that the path is public/<user_id>/...
-- We compare split_part(path, '/', 2) to auth.uid().

-- PRODUCT-IMAGES: allow users to manage files under public/<their_id>/...
CREATE POLICY allow_select_product_images ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'product-images' AND (
      auth.role() = 'service_role'
      OR split_part(path, '/', 2) = auth.uid()
    )
  );

CREATE POLICY allow_insert_product_images ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images' AND (
      auth.role() = 'service_role'
      OR split_part(path, '/', 2) = auth.uid()
    )
  );

CREATE POLICY allow_update_product_images ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'product-images' AND (
      auth.role() = 'service_role'
      OR split_part(path, '/', 2) = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'product-images' AND (
      auth.role() = 'service_role'
      OR split_part(path, '/', 2) = auth.uid()
    )
  );

CREATE POLICY allow_delete_product_images ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'product-images' AND (
      auth.role() = 'service_role'
      OR split_part(path, '/', 2) = auth.uid()
    )
  );

-- AVATARS: similar rules (user avatars stored under public/<user_id>/avatars/...)
CREATE POLICY allow_select_avatars ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'avatars' AND (
      auth.role() = 'service_role'
      OR split_part(path, '/', 2) = auth.uid()
    )
  );

CREATE POLICY allow_insert_avatars ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND (
      auth.role() = 'service_role'
      OR split_part(path, '/', 2) = auth.uid()
    )
  );

CREATE POLICY allow_update_avatars ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars' AND (
      auth.role() = 'service_role'
      OR split_part(path, '/', 2) = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'avatars' AND (
      auth.role() = 'service_role'
      OR split_part(path, '/', 2) = auth.uid()
    )
  );

CREATE POLICY allow_delete_avatars ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars' AND (
      auth.role() = 'service_role'
      OR split_part(path, '/', 2) = auth.uid()
    )
  );

-- PRODUCTS: used by server imports / external syncs (we store under public/<user_id>/products/...)
CREATE POLICY allow_select_products ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'products' AND (
      auth.role() = 'service_role'
      OR split_part(path, '/', 2) = auth.uid()
    )
  );

CREATE POLICY allow_insert_products ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'products' AND (
      auth.role() = 'service_role'
      OR split_part(path, '/', 2) = auth.uid()
    )
  );

CREATE POLICY allow_update_products ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'products' AND (
      auth.role() = 'service_role'
      OR split_part(path, '/', 2) = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'products' AND (
      auth.role() = 'service_role'
      OR split_part(path, '/', 2) = auth.uid()
    )
  );

CREATE POLICY allow_delete_products ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'products' AND (
      auth.role() = 'service_role'
      OR split_part(path, '/', 2) = auth.uid()
    )
  );

-- End of migration
