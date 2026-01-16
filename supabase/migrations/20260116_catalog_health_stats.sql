-- Migration: add catalog health stats function and ensure profiles.state column
-- Date: 2026-01-16

-- 1) Adiciona coluna de estado/UF se não existir
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS state TEXT;

-- 2) Função que calcula a saúde do catálogo por estado
CREATE OR REPLACE FUNCTION public.get_catalog_health_stats()
RETURNS TABLE (
  state TEXT,
  total_reps BIGINT,
  total_products BIGINT,
  out_of_sync_prices BIGINT,
  last_sync_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(p.state, 'Não Definido')::text AS state,
    COUNT(DISTINCT p.id) AS total_reps,
    COUNT(pr.id) AS total_products,
    COUNT(pr.id) FILTER (
      WHERE pr.original_product_id IS NOT NULL
        AND pr.price IS DISTINCT FROM (
          SELECT price FROM public.products WHERE id = pr.original_product_id
        )
    ) AS out_of_sync_prices,
    MAX(pr.updated_at) AS last_sync_date
  FROM public.profiles p
  LEFT JOIN public.products pr
    ON pr.user_id = p.id
    AND (pr.is_active IS DISTINCT FROM FALSE)
  WHERE p.role IN ('representative','rep')
  GROUP BY COALESCE(p.state, 'Não Definido');
END;
$$ LANGUAGE plpgsql;
