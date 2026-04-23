-- Migration: add status, trial_ends_at and plan_type to profiles
BEGIN;

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '14 days'),
  ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free';

CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Add plan_feature_matrix to global_configs to avoid missing column errors
ALTER TABLE public.global_configs 
  ADD COLUMN IF NOT EXISTS plan_feature_matrix JSONB DEFAULT '{}';

COMMIT;
