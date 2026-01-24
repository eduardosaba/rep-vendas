-- Busca ampla por ocorrências de 'safilo.com' em todas as tabelas/colunas
-- Use no SQL Editor do Supabase. A função abaixo retorna: schema, tabela, coluna, quantas ocorrências e um exemplo.
-- Execute e inspecione os resultados; remova a função após a auditoria se desejar.

CREATE OR REPLACE FUNCTION public.search_safilo_all()
RETURNS TABLE(
  table_schema text,
  table_name text,
  column_name text,
  match_count bigint,
  example_value text
) LANGUAGE plpgsql AS $$
DECLARE
  col record;
  sql text;
  cnt bigint;
  sample text;
BEGIN
  FOR col IN
    SELECT c.table_schema AS tbl_schema, c.table_name AS tbl_name, c.column_name AS col_name
    FROM information_schema.columns c
    WHERE c.table_schema NOT IN ('pg_catalog','information_schema')
      AND c.data_type IN ('character varying','text','json','jsonb','character')
  LOOP
    sql := format('SELECT COUNT(*) FROM %I.%I WHERE CAST(%I AS text) ILIKE %L', col.tbl_schema, col.tbl_name, col.col_name, '%safilo.com%');
    BEGIN
      EXECUTE sql INTO cnt;
    EXCEPTION WHEN others THEN
      cnt := 0;
    END;

    IF cnt > 0 THEN
      sql := format('SELECT CAST(%I AS text) FROM %I.%I WHERE CAST(%I AS text) ILIKE %L LIMIT 1', col.col_name, col.tbl_schema, col.tbl_name, col.col_name, '%safilo.com%');
      BEGIN
        EXECUTE sql INTO sample;
      EXCEPTION WHEN others THEN
        sample := NULL;
      END;

      table_schema := col.tbl_schema;
      table_name := col.tbl_name;
      column_name := col.col_name;
      match_count := cnt;
      example_value := sample;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- Execute a função para ver os resultados (ordenado por match_count decrescente):
SELECT * FROM public.search_safilo_all() ORDER BY match_count DESC LIMIT 200;

-- Após a auditoria, você pode remover a função com:
-- DROP FUNCTION public.search_safilo_all();
