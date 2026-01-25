-- Migration: add share_banner_url to public_catalogs and settings
ALTER TABLE public_catalogs
ADD COLUMN IF NOT EXISTS share_banner_url TEXT;

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS share_banner_url TEXT;

-- Index for quick lookup by user_id (optional)
CREATE INDEX IF NOT EXISTS idx_public_catalogs_share_banner_url ON public_catalogs(user_id) WHERE share_banner_url IS NOT NULL;
