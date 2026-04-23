-- Função inteligente: compara nome e atualiza dinamicamente colunas passadas no JSONB
-- Retorna linhas de status (warning / success / error) para cada chamada
CREATE OR REPLACE FUNCTION public.master_sync_products_v2(
  target_sku TEXT,
  excel_name TEXT,
  update_data JSONB
)
RETURNS TABLE(status TEXT, message TEXT) AS $$
DECLARE
  rec RECORD;
  v_column TEXT;
  v_value TEXT;
  v_data_type TEXT;
  set_clauses TEXT := '';
  current_name TEXT;
  sql TEXT;
BEGIN
  SELECT name INTO current_name FROM public.products WHERE reference_code = target_sku LIMIT 1;
  IF current_name IS NULL THEN
    RETURN QUERY SELECT 'error', format('SKU %s não encontrado', target_sku);
    RETURN;
  END IF;

  IF lower(trim(current_name)) <> lower(trim(coalesce(excel_name, ''))) THEN
    status := 'warning';
    message := format('Divergência de nome: Banco(%s) vs Excel(%s)', current_name, coalesce(excel_name, ''));
    RETURN NEXT;
  ELSE
    status := 'success';
    message := 'Nome OK';
    RETURN NEXT;
  END IF;

  -- Construir cláusulas SET dinâmicas
  FOR rec IN SELECT * FROM jsonb_each_text(update_data)
  LOOP
    v_column := rec.key;
    v_value := rec.value;

    SELECT data_type INTO v_data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = v_column
    LIMIT 1;

    IF v_data_type IS NULL THEN
      RAISE EXCEPTION 'Coluna % não existe em public.products', v_column;
    END IF;

    IF set_clauses <> '' THEN
      set_clauses := set_clauses || ', ';
    END IF;

    IF v_data_type = 'boolean' THEN
      set_clauses := set_clauses || format('%I = (%L)::boolean', v_column, v_value);
    ELSIF v_data_type IN ('integer','bigint','smallint') THEN
      set_clauses := set_clauses || format('%I = (%L)::bigint', v_column, v_value);
    ELSIF v_data_type IN ('numeric','double precision','real','decimal') THEN
      set_clauses := set_clauses || format('%I = (%L)::numeric', v_column, v_value);
    ELSIF v_data_type IN ('json','jsonb') THEN
      set_clauses := set_clauses || format('%I = (%L)::jsonb', v_column, v_value);
    ELSE
      set_clauses := set_clauses || format('%I = %L', v_column, v_value);
    END IF;
  END LOOP;

  IF set_clauses <> '' THEN
    sql := format('UPDATE public.products SET %s, updated_at = now() WHERE reference_code = %L', set_clauses, target_sku);
    EXECUTE sql;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
