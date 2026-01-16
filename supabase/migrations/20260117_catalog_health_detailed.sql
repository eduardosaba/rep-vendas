-- Migration: add detailed catalog health stats function
-- Date: 2026-01-17

-- Função que retorna métricas detalhadas por estado
CREATE OR REPLACE FUNCTION public.get_catalog_detailed_stats(p_days integer DEFAULT 90)
RETURNS TABLE (
  state TEXT,
  total_reps BIGINT,
  total_products BIGINT,
  out_of_sync_prices BIGINT,
  brands_out_of_sync JSONB,
  reps_missing_collection BIGINT,
  last_sync_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH template_users AS (
    SELECT id FROM public.profiles WHERE role = 'template'
  ), recent_template_products AS (
    SELECT id FROM public.products
    WHERE user_id IN (SELECT id FROM template_users)
      AND created_at >= now() - (p_days || ' days')::interval
  ), reps AS (
    SELECT id, COALESCE(state, 'Não Definido') AS state
    FROM public.profiles
    WHERE role IN ('representative','rep')
  )
  SELECT
    r.state,
    COUNT(DISTINCT r.id) AS total_reps,
    COUNT(pr.id) AS total_products,
    COUNT(pr.id) FILTER (
      WHERE pr.original_product_id IS NOT NULL
        AND pr.price IS DISTINCT FROM (
          SELECT price FROM public.products WHERE id = pr.original_product_id
        )
    ) AS out_of_sync_prices,
    (
      SELECT COALESCE(jsonb_object_agg(t.brand, t.cnt), '{}'::jsonb)
      FROM (
        SELECT pr.brand AS brand, COUNT(*) AS cnt
        FROM public.products pr
        WHERE pr.original_product_id IS NOT NULL
          AND pr.price IS DISTINCT FROM (
            SELECT price FROM public.products WHERE id = pr.original_product_id
          )
          AND pr.user_id IN (
            SELECT id FROM public.profiles WHERE COALESCE(state, 'Não Definido') = r.state AND role IN ('representative','rep')
          )
        GROUP BY pr.brand
      ) t
    ) AS brands_out_of_sync,
    COUNT(DISTINCT r.id) FILTER (
      WHERE NOT EXISTS (
        SELECT 1 FROM public.products rp
        WHERE rp.user_id = r.id
          AND rp.original_product_id IN (SELECT id FROM recent_template_products)
      )
    ) AS reps_missing_collection,
    MAX(pr.updated_at) AS last_sync_date
  FROM reps r
  LEFT JOIN public.products pr ON pr.user_id = r.id AND (pr.is_active IS DISTINCT FROM FALSE)
  GROUP BY r.state;
END;
$$ LANGUAGE plpgsql;
