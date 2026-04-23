-- Consolidate role_permissions to use `role` as the single canonical key
-- WARNING: This migration is destructive. Run a full DB backup before applying.
-- Steps performed by this script:
-- 1) Keep only the most recent row per role (by updated_at)
-- 2) Drop duplicates and optional company-specific rows
-- 3) Drop `company_id` column
-- 4) Set `role` as PRIMARY KEY
-- 5) Create helpful indexes and analyze

BEGIN;

-- 1) Keep only the most recent row per role
WITH ranked AS (
  SELECT ctid,
         ROW_NUMBER() OVER (PARTITION BY role ORDER BY COALESCE(updated_at, now()) DESC) AS rn
  FROM public.role_permissions
)
DELETE FROM public.role_permissions
USING ranked
WHERE public.role_permissions.ctid = ranked.ctid
  AND ranked.rn > 1;

-- 2) If company_id exists, remove the column (we're moving to role-only)
ALTER TABLE public.role_permissions
  DROP COLUMN IF EXISTS company_id;

-- 3) Ensure role is primary key (drop any conflicting constraints first)
ALTER TABLE public.role_permissions
  DROP CONSTRAINT IF EXISTS role_permissions_pkey;
ALTER TABLE public.role_permissions
  ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role);

-- 4) Optional: create indexes to improve read performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions (role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_updated_at ON public.role_permissions (updated_at);

-- 5) Optional: if you previously stored arrays or jsonb, create GIN indexes where appropriate
-- CREATE INDEX IF NOT EXISTS idx_role_permissions_allowed_sidebar_gin ON public.role_permissions USING GIN (allowed_sidebar_labels);
-- CREATE INDEX IF NOT EXISTS idx_role_permissions_allowed_tabs_gin ON public.role_permissions USING GIN (allowed_tabs);

ANALYZE public.role_permissions;

COMMIT;

-- NOTES:
-- - Run this in a staging environment first.
-- - If you require keeping company-specific exceptions in the future, create new Roles and map companies to roles elsewhere.
-- - This migration assumes `role` is non-null for all rows. If nulls exist, address them before running.
