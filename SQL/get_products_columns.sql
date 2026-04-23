-- Retorna a lista de colunas da tabela public.products na ordem física
CREATE OR REPLACE FUNCTION public.get_products_columns()
RETURNS TABLE(column_name text) AS $$
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'products'
  ORDER BY ordinal_position;
$$ LANGUAGE sql STABLE;
