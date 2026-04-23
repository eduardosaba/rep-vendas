-- Função dinâmica: atualiza qualquer coluna enviada via JSONB para todos os produtos com o mesmo reference_code
-- Uso: SELECT update_products_dynamic_global('SKU123', '{"price":"99.9","is_active":"true"}'::jsonb);
CREATE OR REPLACE FUNCTION public.update_products_dynamic_global(
    target_sku TEXT,
    update_data JSONB
)
RETURNS VOID AS $$
DECLARE
  rec RECORD;
  v_column TEXT;
  v_value TEXT;
  v_data_type TEXT;
  set_clauses TEXT := '';
  sql TEXT;
BEGIN
  IF update_data IS NULL OR jsonb_typeof(update_data) <> 'object' THEN
    RAISE EXCEPTION 'update_data precisa ser um JSON object';
  END IF;

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

    -- Mapear tipos comuns para cast seguros. Valores são passados como literais corretamente escapados.
    IF v_data_type = 'boolean' THEN
      set_clauses := set_clauses || format('%I = (%L)::boolean', v_column, v_value);
    ELSIF v_data_type IN ('integer','bigint','smallint') THEN
      set_clauses := set_clauses || format('%I = (%L)::bigint', v_column, v_value);
    ELSIF v_data_type IN ('numeric','double precision','real','decimal') THEN
      set_clauses := set_clauses || format('%I = (%L)::numeric', v_column, v_value);
    ELSIF v_data_type IN ('json','jsonb') THEN
      set_clauses := set_clauses || format('%I = (%L)::jsonb', v_column, v_value);
    ELSE
      -- Text-like fallback (character varying, text, etc.)
      set_clauses := set_clauses || format('%I = %L', v_column, v_value);
    END IF;
  END LOOP;

  IF set_clauses = '' THEN
    RETURN;
  END IF;

  sql := format('UPDATE public.products SET %s, updated_at = now() WHERE reference_code = %L', set_clauses, target_sku);
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
