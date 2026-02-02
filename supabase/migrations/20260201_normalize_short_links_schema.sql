-- Migration: normalize short_links schema
-- Copies legacy columns to the normalized names and ensures indexes
-- Safe and idempotent: can be applied multiple times

BEGIN;

-- Ensure normalized columns exist
ALTER TABLE public.short_links
  ADD COLUMN IF NOT EXISTS code TEXT;

ALTER TABLE public.short_links
  ADD COLUMN IF NOT EXISTS destination_url TEXT;

-- If legacy columns exist, copy their values into the normalized columns when missing
DO $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'short_links' AND column_name = 'original_url'
  ) THEN
    UPDATE public.short_links
    SET destination_url = COALESCE(destination_url, original_url)
    WHERE original_url IS NOT NULL AND (destination_url IS NULL OR destination_url = '');
  END IF;

  IF EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'short_links' AND column_name = 'short_slug'
  ) THEN
    UPDATE public.short_links
    SET code = COALESCE(code, short_slug)
    WHERE short_slug IS NOT NULL AND (code IS NULL OR code = '');
  END IF;
END
$$;

-- Ensure unique index on code and index on destination_url
CREATE UNIQUE INDEX IF NOT EXISTS idx_short_links_code_unique ON public.short_links(code);
CREATE INDEX IF NOT EXISTS idx_short_links_destination_url ON public.short_links(destination_url);

COMMENT ON COLUMN public.short_links.code IS 'Normalized short code for short link (e.g. VOUCHER1)';
COMMENT ON COLUMN public.short_links.destination_url IS 'Normalized destination URL for the short link';

COMMIT;
