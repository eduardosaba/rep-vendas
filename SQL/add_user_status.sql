-- Migration: add_user_status table for presence
-- Run this migration on your Postgres/Supabase database.

CREATE TABLE IF NOT EXISTS public.user_status (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online boolean NOT NULL DEFAULT false,
  last_seen timestamptz NOT NULL DEFAULT now(),
  connection_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_status_last_seen ON public.user_status(last_seen);

-- Optional: enable row level security and add example policies for Supabase
-- ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;
--
-- -- Allow authenticated users to insert/update their own status
-- CREATE POLICY "user_upsert_own_status" ON public.user_status
--   FOR ALL
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);
--
-- -- Allow admins to select all rows (adjust according to your admin role setup)
-- CREATE POLICY "admin_select_user_status" ON public.user_status
--   FOR SELECT
--   USING (exists (
--     select 1 from public.admin_users au where au.user_id = auth.uid()
--   ));

-- Helpful functions: mark offline for stale rows (example SQL job)
-- UPDATE public.user_status SET is_online = false WHERE last_seen < now() - interval '60 seconds';
