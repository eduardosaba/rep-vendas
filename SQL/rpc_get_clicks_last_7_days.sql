-- RPC: get_clicks_last_7_days
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
