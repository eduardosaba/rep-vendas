-- Migration: Create Indexes for Import Performance
-- Purpose: Optimize bulk import and search operations
-- Impact: Dramatically reduces "Buscando produtos..." time from 60s+ to <2s

-- 1. CRITICAL: Index for reference_code lookup during import
-- This is THE most important index - resolves the "Buscando produtos..." hang
CREATE INDEX IF NOT EXISTS idx_products_user_ref 
ON products(user_id, reference_code);

-- 2. Index for slug preservation during upsert
CREATE INDEX IF NOT EXISTS idx_products_user_slug 
ON products(user_id, slug);

-- 3. Index for sync_status monitoring (dashboard queries)
CREATE INDEX IF NOT EXISTS idx_products_sync_status 
ON products(user_id, sync_status);

-- 4. Index for import history tracking and auditing
CREATE INDEX IF NOT EXISTS idx_products_last_import 
ON products(user_id, last_import_id);

-- 5. Index for brand-based queries (common in filters)
CREATE INDEX IF NOT EXISTS idx_products_brand 
ON products(user_id, brand) 
WHERE brand IS NOT NULL;

-- 6. Index for category-based queries
CREATE INDEX IF NOT EXISTS idx_products_category 
ON products(user_id, category) 
WHERE category IS NOT NULL;

-- 7. Index for price range queries (useful for reports)
CREATE INDEX IF NOT EXISTS idx_products_price 
ON products(user_id, price);

-- 8. Index for created_at (used in ORDER BY queries)
CREATE INDEX IF NOT EXISTS idx_products_created_at 
ON products(user_id, created_at DESC);

-- 9. Composite index for gallery images joins
CREATE INDEX IF NOT EXISTS idx_product_images_product_id_order 
ON product_images(product_id, order_index);

-- 10. Index for import_history user lookups
CREATE INDEX IF NOT EXISTS idx_import_history_user_created 
ON import_history(user_id, created_at DESC);

-- Update table statistics for query optimizer
ANALYZE products;
ANALYZE product_images;
ANALYZE import_history;

-- Add comments for documentation
COMMENT ON INDEX idx_products_user_ref IS 
'Critical index for bulk import reference_code lookups. Prevents timeout during "Buscando produtos..." phase.';

COMMENT ON INDEX idx_products_sync_status IS 
'Enables fast filtering by sync_status for monitoring pending/error images.';

COMMENT ON INDEX idx_products_last_import IS 
'Allows quick audit of which products came from which import batch.';
