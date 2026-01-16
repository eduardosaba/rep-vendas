-- Migration: add can_be_clone_source and user_category to profiles
-- Date: 2026-01-15

ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS can_be_clone_source boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS user_category text DEFAULT 'representative';

-- Backfill nulls (idempotent)
UPDATE public.profiles SET can_be_clone_source = false WHERE can_be_clone_source IS NULL;
UPDATE public.profiles SET user_category = 'representative' WHERE user_category IS NULL;

-- Indexes to support queries
CREATE INDEX IF NOT EXISTS idx_profiles_can_be_clone_source ON public.profiles (can_be_clone_source);
CREATE INDEX IF NOT EXISTS idx_profiles_user_category ON public.profiles (user_category);
