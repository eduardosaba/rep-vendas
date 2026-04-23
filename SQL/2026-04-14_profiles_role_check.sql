-- Migration: allow department roles in profiles.role
-- Execute in Supabase SQL editor

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('master', 'admin_company', 'financeiro_company', 'logistica_company', 'rep_company', 'individual'));
