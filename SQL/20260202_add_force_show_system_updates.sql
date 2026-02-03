-- Migration: Add force_show flag to system_updates
-- Run this with psql or in Supabase SQL editor

ALTER TABLE public.system_updates
ADD COLUMN IF NOT EXISTS force_show boolean DEFAULT false;

-- Optional: add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_system_updates_force_show ON public.system_updates (force_show);
