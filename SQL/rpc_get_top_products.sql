-- RPC: get_top_products
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
