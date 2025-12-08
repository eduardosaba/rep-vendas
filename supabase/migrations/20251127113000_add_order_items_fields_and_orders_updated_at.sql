-- Migration: add missing product fields to order_items and add updated_at+trigger to orders
-- Idempotent: uses IF NOT EXISTS checks and safe DO blocks

-- 1) Add product fields to order_items expected by the app
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_reference TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS total_price NUMERIC(10,2);

-- Backfill total_price for existing rows when possible
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='total_price') THEN
    UPDATE order_items SET total_price = (COALESCE(unit_price,0) * COALESCE(quantity,0)) WHERE total_price IS NULL;
  END IF;
END$$;

-- 2) Ensure orders has updated_at column (many triggers/functions rely on it)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3) Ensure a reusable function to keep updated_at in sync exists
-- Create or replace is safe across runs
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4) Create trigger on orders table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_orders_updated_at') THEN
    CREATE TRIGGER update_orders_updated_at
      BEFORE UPDATE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

-- 5) Ensure RLS remains enabled on modified tables (no-op if already enabled)
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- End migration
