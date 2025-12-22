-- Migration: add phone and email to settings and public_catalogs
-- Adds contact fields to public_catalogs so frontend can read representative contact info

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS phone varchar(32);

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS email varchar(255);

ALTER TABLE public.public_catalogs
ADD COLUMN IF NOT EXISTS phone varchar(32);

ALTER TABLE public.public_catalogs
ADD COLUMN IF NOT EXISTS email varchar(255);

-- Optional: populate public_catalogs with existing values from settings
-- (runs safely, will only overwrite NULL/empty values)
UPDATE public.public_catalogs pc
SET phone = s.phone
FROM public.settings s
WHERE pc.user_id = s.user_id
  AND (pc.phone IS NULL OR pc.phone = '');

UPDATE public.public_catalogs pc
SET email = s.email
FROM public.settings s
WHERE pc.user_id = s.user_id
  AND (pc.email IS NULL OR pc.email = '');
