-- Busca ampla por ocorrências de 'safilo.com' em todas as tabelas/colunas (sem criar função)
-- Este script usa um bloco DO para executar SELECTs dinâmicos e popular uma tabela temporária
-- Execute no SQL Editor do Supabase; ao final ele retorna os resultados ordenados por número de ocorrências.

DO $$
DECLARE
  rec RECORD;
  sql text;
  cnt bigint;
  sample text;
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS tmp_safilo_search (
    table_schema text,
    table_name text,
    column_name text,
    match_count bigint,
    example_value text
  ) ON COMMIT DROP;

  TRUNCATE TABLE tmp_safilo_search;

  FOR rec IN
    SELECT c.table_schema, c.table_name, c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema NOT IN ('pg_catalog','information_schema')
      AND c.data_type IN ('character varying','text','json','jsonb','character')
  LOOP
    sql := format('SELECT COUNT(*) FROM %I.%I WHERE CAST(%I AS text) ILIKE %L', rec.table_schema, rec.table_name, rec.column_name, '%safilo.com%');
    BEGIN
      EXECUTE sql INTO cnt;
    EXCEPTION WHEN OTHERS THEN
      cnt := 0;
    END;

    IF cnt > 0 THEN
      sql := format('SELECT CAST(%I AS text) FROM %I.%I WHERE CAST(%I AS text) ILIKE %L LIMIT 1', rec.column_name, rec.table_schema, rec.table_name, rec.column_name, '%safilo.com%');
      BEGIN
        EXECUTE sql INTO sample;
      EXCEPTION WHEN OTHERS THEN
        sample := NULL;
      END;

      INSERT INTO tmp_safilo_search(table_schema, table_name, column_name, match_count, example_value)
      VALUES (rec.table_schema, rec.table_name, rec.column_name, cnt, sample);
    END IF;
  END LOOP;
END
$$;

-- Retorna os resultados encontrados (ordenado por match_count decrescente)
SELECT * FROM tmp_safilo_search ORDER BY match_count DESC LIMIT 200;

-- Observação:
-- A tabela temporária é criada com ON COMMIT DROP, então desaparecerá após a sessão.
-- Se você usar o SQL Editor do Supabase, a sessão é a execução do script, e o SELECT abaixo irá mostrar os resultados.
