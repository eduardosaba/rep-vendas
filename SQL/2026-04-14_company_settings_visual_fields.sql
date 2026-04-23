-- Migration: add visual/theme fields to company_settings
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#0F172A',
  ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#F8FAFC',
  ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#E11D48',
  ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'font-sans',
  ADD COLUMN IF NOT EXISTS border_radius TEXT DEFAULT '1.5rem';

-- Ensure indexes if needed (none required for colors)
