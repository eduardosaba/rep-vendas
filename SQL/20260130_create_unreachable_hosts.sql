-- Create table to track unreachable external image hosts
-- Safe to run multiple times.
CREATE TABLE IF NOT EXISTS unreachable_hosts (
  id SERIAL PRIMARY KEY,
  host TEXT NOT NULL,
  status_code INT,
  resource_url TEXT,
  product_id UUID,
  product_image_id UUID,
  occurrences INT DEFAULT 1,
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  last_error TEXT
);

-- Ensure we can upsert by resource_url when present
CREATE UNIQUE INDEX IF NOT EXISTS unreachable_hosts_resource_url_uindex
  ON unreachable_hosts(resource_url);

-- FIM
