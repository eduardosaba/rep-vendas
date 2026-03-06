-- Add is_destaque column to products for editorial featured items
-- Run this on Supabase (psql or SQL editor) to apply

ALTER TABLE IF EXISTS products
ADD COLUMN IF NOT EXISTS is_destaque boolean DEFAULT false;

-- Grant default value for existing rows (already default false)
UPDATE products SET is_destaque = false WHERE is_destaque IS NULL;

-- RLS note: ensure policies allow users to update their own products
-- Example policy (adjust role/conditions to your policies):
-- CREATE POLICY "Users can set is_destaque" ON public.products
-- FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Optional: add index to speed up queries
CREATE INDEX IF NOT EXISTS idx_products_user_id_is_destaque ON products (user_id, is_destaque);
