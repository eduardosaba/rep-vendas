-- Policies for 'catalogs' storage bucket
-- Run these statements in the Supabase SQL editor.

-- Note: adjust role names and conditions to match your `profiles` table.

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow INSERT into storage.objects for authenticated users who are company admins
DO $$
BEGIN
  CREATE POLICY allow_insert_catalogs_by_company_admins
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'catalogs'
      AND EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin_company','master')
      )
    );
EXCEPTION WHEN duplicate_object THEN
  -- policy already exists, ignore
  NULL;
END$$;

-- Allow UPDATE/DELETE for the same set (company admins)
DO $$
BEGIN
  CREATE POLICY allow_modify_catalogs_by_company_admins
    ON storage.objects
    FOR UPDATE, DELETE
    USING (
      bucket_id = 'catalogs' AND EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin_company','master')
      )
    );
EXCEPTION WHEN duplicate_object THEN
  NULL;
END$$;

-- Allow SELECT (read) for public bucket objects in 'catalogs'
-- If you plan to keep the bucket public, reads don't need a policy; but keeping a permissive policy is explicit.
DO $$
BEGIN
  CREATE POLICY allow_select_catalogs_public
    ON storage.objects
    FOR SELECT
    USING (
      bucket_id = 'catalogs' AND (
        EXISTS (SELECT 1 FROM storage.buckets b WHERE b.id = 'catalogs' AND b.public = true)
        OR true -- fallback: allow select (adjust to stricter condition if desired)
      )
    );
EXCEPTION WHEN duplicate_object THEN
  NULL;
END$$;

-- IMPORTANT: Review and adapt the `profiles` role checks and the bucket name.
-- If you want read access restricted, remove the OR true above and rely on b.public = true only.
