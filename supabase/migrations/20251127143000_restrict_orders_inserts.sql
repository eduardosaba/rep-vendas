-- Migration: restrict public INSERT on orders and order_items
-- Idempotent: drops known public insert policies and creates authenticated-only policies

-- 1) Drop common public insert policies (safe even if names differ/missing)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='Public can insert orders') THEN
    EXECUTE 'DROP POLICY "Public can insert orders" ON orders';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='Public Create Orders') THEN
    EXECUTE 'DROP POLICY "Public Create Orders" ON orders';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='Public Create Orders (legacy)') THEN
    EXECUTE 'DROP POLICY "Public Create Orders (legacy)" ON orders';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_items' AND policyname='Public Create Items') THEN
    EXECUTE 'DROP POLICY "Public Create Items" ON order_items';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_items' AND policyname='Public can insert order items') THEN
    EXECUTE 'DROP POLICY "Public can insert order items" ON order_items';
  END IF;
END$$;

-- 2) Create policy: only authenticated users may insert orders (they must set user_id = auth.uid())
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='Users can insert own orders') THEN
    CREATE POLICY "Users can insert own orders" ON orders
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- 3) Create policy: only allow inserting order_items when the referenced order belongs to the current user
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_items' AND policyname='Users can insert own order items') THEN
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

-- 4) Optional: keep RLS enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- End migration
