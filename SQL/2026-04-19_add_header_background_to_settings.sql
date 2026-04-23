-- Migration: add header_background_color to settings table so header color can be persisted

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS header_background_color TEXT DEFAULT '#ffffff';

-- Backfill: if there are existing public_catalogs with header_background_color, copy into settings where possible
-- (requires a join via user_id)

DO $$
BEGIN
  -- Update settings from public_catalogs when settings.header_background_color is null
  UPDATE public.settings s
  SET header_background_color = pc.header_background_color
  FROM public.public_catalogs pc
  WHERE s.user_id = pc.user_id
    AND (s.header_background_color IS NULL OR s.header_background_color = '');
END;
$$ LANGUAGE plpgsql;
