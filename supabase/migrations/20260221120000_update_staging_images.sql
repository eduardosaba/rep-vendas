-- Migration: update staging_images with metadata and storage fields
-- Adds columns and RLS policies required by Import-Visual and Matcher flows

ALTER TABLE IF EXISTS staging_images
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS storage_path text,
ADD COLUMN IF NOT EXISTS original_name text,
ADD COLUMN IF NOT EXISTS imported_from_csv boolean DEFAULT false;

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS staging_images ENABLE ROW LEVEL SECURITY;

-- SELECT policy: users can select their own staging images
DROP POLICY IF EXISTS "Users can see their own staging images" ON public.staging_images;
CREATE POLICY "Users can see their own staging images"
  ON public.staging_images FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT policy: users can insert rows with their user_id
DROP POLICY IF EXISTS "Users can insert their own staging images" ON public.staging_images;
CREATE POLICY "Users can insert their own staging images"
  ON public.staging_images FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- DELETE policy: users can delete their own rows
DROP POLICY IF EXISTS "Users can delete their own staging images" ON public.staging_images;
CREATE POLICY "Users can delete their own staging images"
  ON public.staging_images FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
