-- Migration: create link_clicks_logs table
CREATE TABLE IF NOT EXISTS link_clicks_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  short_link_id uuid REFERENCES short_links(id) ON DELETE CASCADE,
  clicked_at timestamptz DEFAULT now(),
  browser_info text,
  region text
);

CREATE INDEX IF NOT EXISTS idx_link_clicks_logs_short_link ON link_clicks_logs(short_link_id);
