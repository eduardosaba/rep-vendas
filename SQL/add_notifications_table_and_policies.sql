-- Migration: create notifications table and row-level security policies
-- Run this in your Supabase SQL editor or via psql as a superuser

-- Ensure UUID generator (pgcrypto) is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- Create table if missing
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text,
  type text,
  data jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index to speed up queries by user and recent items
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

-- Enable RLS and add restrictive policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: owners only
CREATE POLICY notifications_select_owner ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

-- INSERT: only allowed when user_id equals auth.uid()
CREATE POLICY notifications_insert_owner ON public.notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- UPDATE: owners only (allows marking as read)
CREATE POLICY notifications_update_owner ON public.notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

COMMIT;

-- Notes:
-- - Service role (server) can still bypass RLS; use server-side client for trusted writes if needed.
-- - If your app inserts notifications from server actions, use the service_role key (it bypasses RLS) or ensure inserts include user_id = auth.uid() when executed by the user.
