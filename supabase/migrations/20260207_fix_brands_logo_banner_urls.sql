-- Migration: Fix malformed brands.logo_url and brands.banner_url
-- Purpose: backup affected rows, provide dry-run diagnostics, and normalize stored values
-- NOTES:
-- 1) This script is defensive: it only updates when it can extract a valid http(s) URL.
-- 2) Run the SELECT sections first (dry-run) in Supabase SQL Editor to review candidates.
-- 3) After review, run the UPDATE sections inside a transaction.

-- === DRY-RUN: Show candidates and extracted URLs ===
SELECT
  id,
  logo_url,
  banner_url,
  trim(both '"' from logo_url) AS trimmed_logo,
  CASE
    WHEN logo_url ~ '"publicUrl"' THEN regexp_replace(logo_url, '.*?"publicUrl"\s*:\s*"(https?://[^"]+)".*', '\1')
    WHEN logo_url ~ '"secureUrl"' THEN regexp_replace(logo_url, '.*?"secureUrl"\s*:\s*"(https?://[^"]+)".*', '\1')
    WHEN logo_url ~ '"url"' THEN regexp_replace(logo_url, '.*?"url"\s*:\s*"(https?://[^"]+)".*', '\1')
    WHEN logo_url ~ '^\["https?://' THEN regexp_replace(logo_url, '.*?\["(https?://[^"]+)"\].*', '\1')
    WHEN logo_url ~ '^"https?://' THEN trim(both '"' from logo_url)
    ELSE NULL
  END AS extracted_logo,
  trim(both '"' from banner_url) AS trimmed_banner,
  CASE
    WHEN banner_url ~ '"publicUrl"' THEN regexp_replace(banner_url, '.*?"publicUrl"\s*:\s*"(https?://[^"]+)".*', '\1')
    WHEN banner_url ~ '"secureUrl"' THEN regexp_replace(banner_url, '.*?"secureUrl"\s*:\s*"(https?://[^"]+)".*', '\1')
    WHEN banner_url ~ '"url"' THEN regexp_replace(banner_url, '.*?"url"\s*:\s*"(https?://[^"]+)".*', '\1')
    WHEN banner_url ~ '^\["https?://' THEN regexp_replace(banner_url, '.*?\["(https?://[^"]+)"\].*', '\1')
    WHEN banner_url ~ '^"https?://' THEN trim(both '"' from banner_url)
    ELSE NULL
  END AS extracted_banner
FROM brands
WHERE (
  logo_url IS NOT NULL AND logo_url !~ '^https?://'
) OR (
  banner_url IS NOT NULL AND banner_url !~ '^https?://'
)
ORDER BY id
LIMIT 1000;

-- Create a backup table matching `brands.id` type to avoid bigint/uuid mismatches.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'brands_logo_banner_url_backup') THEN
    CREATE TABLE brands_logo_banner_url_backup AS
    SELECT id, logo_url, banner_url, now()::timestamptz AS backed_at
    FROM brands
    WHERE false;
    ALTER TABLE brands_logo_banner_url_backup
      ADD PRIMARY KEY (id);
  END IF;
END$$;

INSERT INTO brands_logo_banner_url_backup(id, logo_url, banner_url, backed_at)
SELECT id, logo_url, banner_url, now()
FROM brands
WHERE (
  logo_url IS NOT NULL AND logo_url !~ '^https?://'
) OR (
  banner_url IS NOT NULL AND banner_url !~ '^https?://'
)
ON CONFLICT (id) DO NOTHING;

-- === UPDATE: Normalize logo_url (only when a valid URL can be extracted) ===
BEGIN;

-- Update logo_url
WITH extracted AS (
  SELECT id,
    CASE
      WHEN logo_url ~ '"publicUrl"' THEN regexp_replace(logo_url, '.*?"publicUrl"\s*:\s*"(https?://[^"]+)".*', '\1')
      WHEN logo_url ~ '"secureUrl"' THEN regexp_replace(logo_url, '.*?"secureUrl"\s*:\s*"(https?://[^"]+)".*', '\1')
      WHEN logo_url ~ '"url"' THEN regexp_replace(logo_url, '.*?"url"\s*:\s*"(https?://[^"]+)".*', '\1')
      WHEN logo_url ~ '^\["https?://' THEN regexp_replace(logo_url, '.*?\["(https?://[^"]+)"\].*', '\1')
      WHEN logo_url ~ '^"https?://' THEN trim(both '"' from logo_url)
      ELSE NULL
    END AS new_logo
  FROM brands
)
UPDATE brands
SET logo_url = extracted.new_logo
FROM extracted
WHERE brands.id = extracted.id
  AND extracted.new_logo IS NOT NULL
  AND extracted.new_logo ~ '^https?://';

-- Update banner_url
WITH extracted_banner AS (
  SELECT id,
    CASE
      WHEN banner_url ~ '"publicUrl"' THEN regexp_replace(banner_url, '.*?"publicUrl"\s*:\s*"(https?://[^"]+)".*', '\1')
      WHEN banner_url ~ '"secureUrl"' THEN regexp_replace(banner_url, '.*?"secureUrl"\s*:\s*"(https?://[^"]+)".*', '\1')
      WHEN banner_url ~ '"url"' THEN regexp_replace(banner_url, '.*?"url"\s*:\s*"(https?://[^"]+)".*', '\1')
      WHEN banner_url ~ '^\["https?://' THEN regexp_replace(banner_url, '.*?\["(https?://[^"]+)"\].*', '\1')
      WHEN banner_url ~ '^"https?://' THEN trim(both '"' from banner_url)
      ELSE NULL
    END AS new_banner
  FROM brands
)
UPDATE brands
SET banner_url = extracted_banner.new_banner
FROM extracted_banner
WHERE brands.id = extracted_banner.id
  AND extracted_banner.new_banner IS NOT NULL
  AND extracted_banner.new_banner ~ '^https?://';

COMMIT;

-- === POST-CHECK: Review remaining problematic rows ===
SELECT id, logo_url, banner_url
FROM brands
WHERE (
  logo_url IS NOT NULL AND logo_url !~ '^https?://'
) OR (
  banner_url IS NOT NULL AND banner_url !~ '^https?://'
)
ORDER BY id
LIMIT 200;

-- === ROLLBACK PLAN ===
-- If something looks wrong, you can restore values from the backup table with:
-- UPDATE brands b
-- SET logo_url = bb.logo_url, banner_url = bb.banner_url
-- FROM brands_logo_banner_url_backup bb
-- WHERE b.id = bb.id;

-- End of migration
