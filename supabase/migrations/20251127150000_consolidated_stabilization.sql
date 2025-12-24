-- Consolidated migration: stabilization fixes
-- Adds missing columns, creates updated_at trigger, creates staging_images,
-- and restricts anonymous INSERTs on orders/order_items.
-- Idempotent - safe to run multiple times.

-- 1) Add product fields to order_items if missing
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_reference TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS total_price NUMERIC(10,2);

-- Backfill total_price for existing rows when possible
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='total_price') THEN
    UPDATE order_items
    SET total_price = COALESCE(unit_price, 0) * COALESCE(quantity, 0)
    WHERE total_price IS NULL;
  END IF;
END$$;

-- 2) Ensure orders has updated_at column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3) Create or replace helper function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4) Create trigger on orders if not exists and column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_orders_updated_at') THEN
    CREATE TRIGGER update_orders_updated_at
      BEFORE UPDATE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

-- 5) Create staging_images table (idempotent)
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

-- Enable RLS on staging_images
ALTER TABLE staging_images ENABLE ROW LEVEL SECURITY;

-- Create basic policy for staging_images (owners can manage)
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

-- 6) Restrict anonymous INSERTs on orders and order_items
-- Drop common public insert policies if present
DO $$
BEGIN
  -- orders
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='Public can insert orders') THEN
    EXECUTE 'DROP POLICY "Public can insert orders" ON orders';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='Public Create Orders') THEN
    EXECUTE 'DROP POLICY "Public Create Orders" ON orders';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='Public Create Orders (legacy)') THEN
    EXECUTE 'DROP POLICY "Public Create Orders (legacy)" ON orders';
  END IF;

  -- order_items
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_items' AND policyname='Public Create Items') THEN
    EXECUTE 'DROP POLICY "Public Create Items" ON order_items';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_items' AND policyname='Public can insert order items') THEN
    EXECUTE 'DROP POLICY "Public can insert order items" ON order_items';
  END IF;
END$$;

-- Create policies that require auth.uid() = user_id for orders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='Users can insert own orders') THEN
DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
    CREATE POLICY "Users can insert own orders" ON orders
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_items' AND policyname='Users can insert own order items') THEN
DROP POLICY IF EXISTS "Users can insert own order items" ON order_items;
    CREATE POLICY "Users can insert own order items" ON order_items
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM orders
          WHERE orders.id = order_items.order_id
            AND orders.user_id = auth.uid()
        )
      );
  END IF;
END$$;

-- Ensure RLS is enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 7) Consolidate saved_carts public policies (optional cleanup)
DO $$
BEGIN
  -- Remove duplicate-named policies (safe if missing)
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_carts' AND policyname='Public insert') THEN
    EXECUTE 'DROP POLICY "Public insert" ON saved_carts';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_carts' AND policyname='Public Insert Carts') THEN
    EXECUTE 'DROP POLICY "Public Insert Carts" ON saved_carts';
  END IF;

  -- Create canonical policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_carts' AND policyname='Public insert carts') THEN
DROP POLICY IF EXISTS "Public insert carts" ON saved_carts;
    CREATE POLICY "Public insert carts" ON saved_carts
      FOR INSERT
      WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_carts' AND policyname='Public select carts') THEN
DROP POLICY IF EXISTS "Public select carts" ON saved_carts;
    CREATE POLICY "Public select carts" ON saved_carts
      FOR SELECT
      USING (true);
  END IF;
END$$;

-- End of consolidated migration
