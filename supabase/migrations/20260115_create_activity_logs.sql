-- Migration: create activity_logs table and enable realtime publication
-- Date: 2026-01-15

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  description text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Ensure extension for gen_random_uuid exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add to the realtime publication used by Supabase (if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_publication WHERE pubname = 'supabase_realtime') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs';
  END IF;
EXCEPTION WHEN others THEN
  -- ignore errors (publication may not exist in local dev)
  RAISE NOTICE 'Could not alter publication: %', SQLERRM;
END$$;
