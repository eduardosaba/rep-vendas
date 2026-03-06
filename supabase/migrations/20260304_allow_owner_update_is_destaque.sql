-- Migration: allow product owners to update is_destaque via RLS
-- Date: 2026-03-04
-- This policy ensures authenticated users can update rows they own (user_id = auth.uid()).
-- Apply this in Supabase SQL editor or via psql/supabase CLI.

BEGIN;

-- Ensure RLS is enabled (no-op if already enabled)
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;

-- Create policy allowing owners to update their rows
-- This is additive to existing policies; adjust or remove if redundant.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'allow_owner_update_is_destaque'
  ) THEN
    CREATE POLICY allow_owner_update_is_destaque
      ON public.products
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

COMMIT;
