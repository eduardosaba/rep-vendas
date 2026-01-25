-- Function: log_short_link_click
CREATE OR REPLACE FUNCTION log_short_link_click(p_short_link_id uuid, p_browser_info text DEFAULT NULL, p_region text DEFAULT NULL)
RETURNS void AS $$
BEGIN
  INSERT INTO link_clicks_logs(short_link_id, browser_info, region) VALUES (p_short_link_id, p_browser_info, p_region);
  UPDATE short_links SET clicks_count = COALESCE(clicks_count,0) + 1 WHERE id = p_short_link_id;
END;
$$ LANGUAGE plpgsql;
