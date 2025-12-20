-- Migration: remove update_*_updated_at triggers from tables
-- Idempotent: uses DROP TRIGGER IF EXISTS

-- This migration drops common updated_at triggers that may reference
-- columns not present in all environments, causing errors when triggers
-- try to set NEW.updated_at on tables missing that column.

-- Drop triggers on known tables (safe if trigger or table doesn't exist)
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;

-- If other triggers exist with a similar naming convention, you can add them above.
-- Note: this migration only drops triggers; it does not drop the helper function
-- `update_updated_at_column` to keep it available for future migrations if needed.

-- End migration
