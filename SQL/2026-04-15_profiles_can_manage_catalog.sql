-- Permission delegation for distributor teams
-- Allows admin_company to grant access to catalog/pro tools.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_manage_catalog BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_company_catalog_perm
  ON public.profiles(company_id, can_manage_catalog);
