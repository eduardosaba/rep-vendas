-- Migration: enable RLS & policies for user_status and cleanup job
-- Run this in Supabase SQL editor or psql connected to your DB.

-- 1) Enable RLS on user_status (if not already enabled)
ALTER TABLE IF EXISTS public.user_status ENABLE ROW LEVEL SECURITY;

-- 2) Allow authenticated users to INSERT/UPDATE/DELETE only their own row
-- This policy allows operations when the current authenticated uid matches user_id
CREATE POLICY user_upsert_own_status ON public.user_status
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3) Allow admins to SELECT all rows.
-- Option A: if you have an `admin_users` table listing admin user_ids
-- CREATE POLICY admin_select_user_status ON public.user_status
--   FOR SELECT
--   USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- Option B: if you store a custom claim `is_admin` in the JWT, you can use current_setting
-- Note: This requires setting the claim as a role-claim in Supabase.
-- CREATE POLICY admin_select_user_status ON public.user_status
--   FOR SELECT
--   USING (current_setting('request.jwt.claims', true)::json ->> 'is_admin' = 'true');

-- 4) Example function to mark stale rows offline (to be executed by a scheduler)
CREATE OR REPLACE FUNCTION public.mark_stale_user_status_offline()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.user_status
  SET is_online = false, updated_at = now()
  WHERE last_seen < now() - INTERVAL '60 seconds' AND is_online = true;
END;
$$;

-- 5) Optionally schedule it with pg_cron (if extension installed)
-- This creates a job that runs every minute.
-- SELECT cron.schedule('mark-stale-user-status', '*/1 * * * *', $$SELECT public.mark_stale_user_status_offline();$$);

-- If you don't have pg_cron, run a small serverless function / cron job calling this SQL periodically.

-- 6) Notes for Supabase
-- - Ensure that the authenticated role has INSERT/UPDATE rights on `user_status` (policies above control access).
-- - Admin SELECT policy depends on your project's admin model; adapt as needed.

-- 7) Example: create an index to help the cleanup
CREATE INDEX IF NOT EXISTS idx_user_status_last_seen ON public.user_status(last_seen);
