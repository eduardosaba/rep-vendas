-- Migration: create staging_images table used for image uploads processing
-- Idempotent: uses CREATE TABLE IF NOT EXISTS

CREATE TABLE IF NOT EXISTS staging_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  file_name TEXT,
  url TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for consistency with other tables (no-op if already enabled)
ALTER TABLE staging_images ENABLE ROW LEVEL SECURITY;

-- Optional: basic policy allowing owners to manage their staging images
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'staging_images' AND policyname = 'Users can manage own staging images') THEN
DROP POLICY IF EXISTS "Users can manage own staging images" ON staging_images;
    CREATE POLICY "Users can manage own staging images" ON staging_images
      FOR ALL
      USING (user_id IS NULL OR auth.uid() = user_id)
      WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
  END IF;
END$$;
