-- Single migration: short links, logs, interactions, RPCs and helpers
-- Run this file in your database (Supabase SQL editor or psql)

-- Ensure extension for gen_random_uuid is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) short_links
CREATE TABLE IF NOT EXISTS short_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL,
  destination_url text NOT NULL,
  catalog_id uuid,
  user_id uuid REFERENCES auth.users,
  brand_id uuid REFERENCES brands(id),
  clicks_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_short_links_code ON short_links(code);

-- 2) link_clicks_logs
CREATE TABLE IF NOT EXISTS link_clicks_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  short_link_id uuid REFERENCES short_links(id) ON DELETE CASCADE,
  clicked_at timestamptz DEFAULT now(),
  browser_info text,
  region text
);
CREATE INDEX IF NOT EXISTS idx_link_clicks_logs_short_link ON link_clicks_logs(short_link_id);

-- 3) product_interactions
CREATE TABLE IF NOT EXISTS product_interactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  catalog_id uuid REFERENCES public_catalogs(id) ON DELETE CASCADE,
  interacted_at timestamptz DEFAULT now(),
  type text DEFAULT 'view'
);
CREATE INDEX IF NOT EXISTS idx_product_interactions_product ON product_interactions(product_id);

-- 4) RPC: get_clicks_last_7_days
CREATE OR REPLACE FUNCTION get_clicks_last_7_days(p_user_id uuid)
RETURNS TABLE (date text, clicks bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_char(d, 'DD/MM') as date,
    count(lcl.id) as clicks
  FROM generate_series(current_date - interval '6 days', current_date, '1 day') d
  LEFT JOIN short_links sl ON sl.user_id = p_user_id
  LEFT JOIN link_clicks_logs lcl ON lcl.short_link_id = sl.id AND lcl.clicked_at::date = d::date
  GROUP BY d
  ORDER BY d;
END;
$$ LANGUAGE plpgsql;

-- 5) RPC: get_top_products
CREATE OR REPLACE FUNCTION get_top_products(p_user_id uuid, p_limit int DEFAULT 5)
RETURNS TABLE (
  id uuid,
  name text,
  reference_code text,
  image_url text,
  views bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.reference_code,
    p.image_url,
    count(pi.id) as views
  FROM products p
  JOIN product_interactions pi ON pi.product_id = p.id
  WHERE p.user_id = p_user_id
  GROUP BY p.id
  ORDER BY views DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 6) Function: log_short_link_click (atomic insert + increment)
CREATE OR REPLACE FUNCTION log_short_link_click(p_short_link_id uuid, p_browser_info text DEFAULT NULL, p_region text DEFAULT NULL)
RETURNS void AS $$
BEGIN
  INSERT INTO link_clicks_logs(short_link_id, browser_info, region) VALUES (p_short_link_id, p_browser_info, p_region);
  UPDATE short_links SET clicks_count = COALESCE(clicks_count,0) + 1 WHERE id = p_short_link_id;
END;
$$ LANGUAGE plpgsql;

-- End of migration
