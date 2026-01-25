-- Migration: create short_links table
CREATE TABLE IF NOT EXISTS short_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL,
  destination_url text NOT NULL,
  catalog_id uuid, -- optional reference to public_catalogs
  user_id uuid REFERENCES auth.users,
  brand_id uuid REFERENCES brands(id),
  clicks_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_short_links_code ON short_links(code);
