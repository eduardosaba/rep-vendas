-- Migration: Add plan_type to settings and plan_id to profiles
-- Idempotent: safe to run multiple times

BEGIN;

-- 1) Add plan_type to settings
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS plan_type TEXT;

-- 2) Add plan_id to profiles (nullable)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_id UUID;

-- 3) Backfill profiles.plan_id from subscriptions when available
-- This uses the most recent active subscription if multiple exist
UPDATE public.profiles p
SET plan_id = s.plan_id
FROM (
  SELECT DISTINCT ON (user_id) user_id, plan_id
  FROM public.subscriptions
  WHERE plan_id IS NOT NULL
  ORDER BY user_id, created_at DESC
) s
WHERE p.id = s.user_id
  AND (
    p.plan_id IS NULL
    OR (p.plan_id::text <> s.plan_id::text)
  );

-- 4) Create index to speed lookups
CREATE INDEX IF NOT EXISTS idx_profiles_plan_id ON public.profiles(plan_id);

COMMIT;

-- Notes:
-- - This migration is intentionally conservative: it does not add foreign key constraints
--   to avoid failures if `plans` table was not yet created in some environments.
-- - If you want a FK, run an additional migration after ensuring `plans` exists.
