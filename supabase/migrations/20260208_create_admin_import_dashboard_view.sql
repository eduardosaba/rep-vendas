-- Migration: Create Admin Import Dashboard View
-- Purpose: Provide a consolidated view of import status across all users
-- Usage: SELECT * FROM v_admin_import_dashboard ORDER BY last_import DESC;

-- Drop existing view if exists
DROP VIEW IF EXISTS v_admin_import_dashboard;

-- Create the dashboard view
CREATE OR REPLACE VIEW v_admin_import_dashboard AS
SELECT 
    p.id as user_id,
    p.full_name,
    p.email,
    p.role,
    
    -- Product counts
    (SELECT count(*) 
     FROM products 
     WHERE user_id = p.id) as total_products,
    
    -- Image sync status  
    (SELECT count(*) 
     FROM products 
     WHERE user_id = p.id 
     AND sync_status = 'pending') as images_pending,
    
    (SELECT count(*) 
     FROM products 
     WHERE user_id = p.id 
     AND sync_status = 'error') as images_error,
    
    (SELECT count(*) 
     FROM products 
     WHERE user_id = p.id 
     AND sync_status = 'synced') as images_synced,
    
    -- Import activity
    (SELECT max(created_at) 
     FROM import_history 
     WHERE user_id = p.id) as last_import,
    
    (SELECT count(*) 
     FROM import_history 
     WHERE user_id = p.id) as total_imports,
    
    -- Most recent import details
    (SELECT total_items 
     FROM import_history 
     WHERE user_id = p.id 
     ORDER BY created_at DESC 
     LIMIT 1) as last_import_items,
    
    (SELECT brand_summary 
     FROM import_history 
     WHERE user_id = p.id 
     ORDER BY created_at DESC 
     LIMIT 1) as last_import_brands

FROM profiles p
WHERE p.role IS NOT NULL
  -- Exclui apenas contas de sistema/admin se necessário
  -- AND p.role NOT IN ('admin', 'master')
ORDER BY last_import DESC NULLS LAST;

-- Grant SELECT permission to authenticated users with admin/master role
-- (RLS policies on the view will be enforced by the underlying tables)

COMMENT ON VIEW v_admin_import_dashboard IS 
'Dashboard view for monitoring import status and image sync across all users. 
Shows product counts, sync status, and import history.';
