-- =====================================================
-- APPLY SYNC CATALOG UPDATES MIGRATION
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- Step 1: Apply the migration (create the functions)
\i supabase/migrations/20260207_sync_catalog_updates.sql

-- Step 2: Verify functions were created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'sync_catalog_updates_to_all_clones',
    'sync_catalog_updates_by_brand',
    'get_clone_summary'
  );

-- Step 3: Test get_clone_summary (replace USER_ID)
-- SELECT * FROM get_clone_summary('YOUR_MASTER_USER_ID'::uuid);

-- Step 4: Ready! Now you can sync updates whenever you add new products:
-- SELECT * FROM sync_catalog_updates_to_all_clones('MASTER_USER_ID'::uuid);
