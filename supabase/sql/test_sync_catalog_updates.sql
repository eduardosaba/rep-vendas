-- Test script: Sync Catalog Updates
-- Purpose: Validate sync_catalog_updates functions work correctly
-- Date: 2026-02-07

-- Prerequisites: You need at least one source user with products and one target user with clones

-- =====================================================
-- STEP 1: Setup test data (optional if you have real data)
-- =====================================================

-- Get your master user ID (replace with real user)
-- Example: SELECT id FROM auth.users WHERE email = 'master@example.com';

DO $$
DECLARE
  v_master_id uuid := 'fe7ea2fc-afd4-4310-a080-266fca8186a7'; -- REPLACE WITH YOUR MASTER USER ID
  v_target_id uuid; -- Will be populated if exists
BEGIN
  -- Find a target user who already has clones
  SELECT DISTINCT target_user_id INTO v_target_id
  FROM catalog_clones
  WHERE source_user_id = v_master_id
  LIMIT 1;

  IF v_target_id IS NULL THEN
    RAISE NOTICE 'No clone targets found for master user %', v_master_id;
    RAISE NOTICE 'Create a clone first using clone_catalog_smart before testing sync.';
    RETURN;
  END IF;

  RAISE NOTICE 'Master user: %', v_master_id;
  RAISE NOTICE 'Target user: %', v_target_id;
  
  -- Show current clone summary
  RAISE NOTICE '=== Current Clone Summary ===';
  FOR rec IN 
    SELECT 
      target_user_id, 
      target_email, 
      total_cloned_products, 
      brands, 
      last_clone_date
    FROM get_clone_summary(v_master_id)
  LOOP
    RAISE NOTICE 'Target: % | Email: % | Products: % | Brands: % | Last: %',
      rec.target_user_id, rec.target_email, rec.total_cloned_products, 
      rec.brands, rec.last_clone_date;
  END LOOP;

  -- Add a test product to master catalog (only if it doesn't exist)
  IF NOT EXISTS (
    SELECT 1 FROM products
    WHERE user_id = v_master_id AND reference_code = 'SYNC-TEST-001'
  ) THEN
    INSERT INTO products (
      user_id, name, reference_code, brand, category, price, sale_price,
      is_active, created_at, updated_at
    ) VALUES (
      v_master_id, 'TEST Sync Product', 'SYNC-TEST-001', 'Nike', 'Footwear',
      100.00, 80.00, true, now(), now()
    );
    RAISE NOTICE 'Created test product SYNC-TEST-001 in master catalog';
  ELSE
    RAISE NOTICE 'Test product SYNC-TEST-001 already exists, skipping creation';
  END IF;

  -- Show product count before sync
  RAISE NOTICE '=== Product Count BEFORE Sync ===';
  RAISE NOTICE 'Master has % products', (SELECT COUNT(*) FROM products WHERE user_id = v_master_id);
  RAISE NOTICE 'Target has % products', (SELECT COUNT(*) FROM products WHERE user_id = v_target_id);

END $$;

-- =====================================================
-- STEP 2: Test sync_catalog_updates_to_all_clones
-- =====================================================

-- Replace with your master user ID
SELECT * FROM sync_catalog_updates_to_all_clones(
  'fe7ea2fc-afd4-4310-a080-266fca8186a7'::uuid
);

-- Expected output:
-- target_user_id | target_email | products_added
-- Shows how many new products were added to each target

-- =====================================================
-- STEP 3: Test sync_catalog_updates_by_brand
-- =====================================================

-- Sync only Nike products
SELECT * FROM sync_catalog_updates_by_brand(
  'fe7ea2fc-afd4-4310-a080-266fca8186a7'::uuid,
  ARRAY['Nike']
);

-- Expected output:
-- target_user_id | target_email | products_added | brands_synced
-- Shows sync results filtered by brand

-- =====================================================
-- STEP 4: Verify sync worked
-- =====================================================

DO $$
DECLARE
  v_master_id uuid := 'fe7ea2fc-afd4-4310-a080-266fca8186a7';
  v_target_id uuid;
BEGIN
  SELECT DISTINCT target_user_id INTO v_target_id
  FROM catalog_clones
  WHERE source_user_id = v_master_id
  LIMIT 1;

  RAISE NOTICE '=== Product Count AFTER Sync ===';
  RAISE NOTICE 'Master has % products', (SELECT COUNT(*) FROM products WHERE user_id = v_master_id);
  RAISE NOTICE 'Target has % products', (SELECT COUNT(*) FROM products WHERE user_id = v_target_id);

  -- Check if test product was cloned
  IF EXISTS (
    SELECT 1 FROM products
    WHERE user_id = v_target_id AND reference_code = 'SYNC-TEST-001'
  ) THEN
    RAISE NOTICE '✓ Test product SYNC-TEST-001 was successfully synced to target';
  ELSE
    RAISE NOTICE '✗ Test product was NOT synced (may have been skipped if already existed)';
  END IF;

  -- Show recent clones
  RAISE NOTICE '=== Recent Clones (last 5) ===';
  FOR rec IN
    SELECT 
      p.reference_code, 
      p.name, 
      p.brand,
      cc.created_at AS cloned_at
    FROM catalog_clones cc
    JOIN products p ON p.id = cc.cloned_product_id
    WHERE cc.target_user_id = v_target_id
    ORDER BY cc.created_at DESC
    LIMIT 5
  LOOP
    RAISE NOTICE '- % | % | % | Cloned: %', 
      rec.reference_code, rec.name, rec.brand, rec.cloned_at;
  END LOOP;
END $$;

-- =====================================================
-- STEP 5: Cleanup (optional)
-- =====================================================

-- Remove test product from master
-- DELETE FROM products WHERE reference_code = 'SYNC-TEST-001';

-- Remove test product from targets (via clones table)
-- DELETE FROM products
-- WHERE id IN (
--   SELECT cloned_product_id FROM catalog_clones
--   WHERE source_user_id = 'fe7ea2fc-afd4-4310-a080-266fca8186a7'
--     AND cloned_product_id IN (
--       SELECT id FROM products WHERE reference_code = 'SYNC-TEST-001'
--     )
-- );

-- =====================================================
-- UTILITY QUERIES
-- =====================================================

-- See all clones from a master user
-- SELECT * FROM get_clone_summary('MASTER_USER_ID'::uuid);

-- See detailed clone history
-- SELECT 
--   cc.created_at,
--   p.reference_code,
--   p.name,
--   p.brand,
--   prof.email AS target_email
-- FROM catalog_clones cc
-- JOIN products p ON p.id = cc.cloned_product_id
-- LEFT JOIN profiles prof ON prof.id = cc.target_user_id
-- WHERE cc.source_user_id = 'MASTER_USER_ID'::uuid
-- ORDER BY cc.created_at DESC
-- LIMIT 50;

-- Count products by brand for a user
-- SELECT brand, COUNT(*) AS product_count
-- FROM products
-- WHERE user_id = 'USER_ID'::uuid
-- GROUP BY brand
-- ORDER BY product_count DESC;
