-- Cleanup duplicate rows in public.role_permissions keeping the most recent row per (role, company_id)
-- Use this in Supabase SQL editor. This uses ctid to identify physical rows.

WITH ranked AS (
  SELECT ctid,
         ROW_NUMBER() OVER (PARTITION BY role, company_id ORDER BY COALESCE(updated_at, now()) DESC) AS rn
  FROM public.role_permissions
)
DELETE FROM public.role_permissions
USING ranked
WHERE public.role_permissions.ctid = ranked.ctid
  AND ranked.rn > 1;

-- After running the cleanup above, add a UNIQUE constraint to prevent recurrence:
ALTER TABLE public.role_permissions
  DROP CONSTRAINT IF EXISTS role_permissions_role_company_unique;

ALTER TABLE public.role_permissions
  ADD CONSTRAINT role_permissions_role_company_unique UNIQUE (role, company_id);

-- If your table uses different column names for timestamps, adapt COALESCE(updated_at, now()) accordingly.
