-- Migration A: Additive changes only (Safe for immediate deployment)
-- Description: Add support_email and support_phone to public.settings, and full_name and phone to public.profiles.

ALTER TABLE public.settings 
  ADD COLUMN IF NOT EXISTS support_email text,
  ADD COLUMN IF NOT EXISTS support_phone text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text;
