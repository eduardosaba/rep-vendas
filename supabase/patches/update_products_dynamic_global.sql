-- Atualiza (ou cria) a função RPC que aplica updates dinâmicos por SKU
-- Particularmente, quando a chave 'technical_specs' for enviada, ela será
-- mesclada com o JSONB existente usando o operador || do Postgres.
-- Rode este arquivo no SQL editor do Supabase.

CREATE OR REPLACE FUNCTION update_products_dynamic_global(
    target_sku TEXT,
    update_data JSONB
)
RETURNS VOID AS $$
DECLARE
    v_column TEXT;
    v_value JSONB;
    v_data_type TEXT;
BEGIN
    FOR v_column, v_value IN SELECT * FROM jsonb_each(update_data)
    LOOP
        IF v_column = 'technical_specs' THEN
            UPDATE public.products
            SET technical_specs = COALESCE(technical_specs, '{}'::jsonb) || v_value,
                updated_at = NOW()
            WHERE reference_code = target_sku;
        ELSE
            -- tenta descobrir o tipo de dado da coluna para fazer cast adequado
            SELECT data_type INTO v_data_type
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'products' AND column_name = v_column
            LIMIT 1;

            IF v_data_type IS NULL THEN
                -- se não encontrou a coluna, pula
                RAISE NOTICE 'Coluna % não encontrada em products, ignorando', v_column;
            ELSE
                -- monta e executa update dinâmico; converte o JSONB em texto para o cast
                EXECUTE format(
                    'UPDATE public.products SET %I = ($1)::%s, updated_at = NOW() WHERE reference_code = $2',
                    v_column,
                    v_data_type
                )
                USING (v_value #>> '{}'), target_sku;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Índice recomendado para acelerar buscas por reference_code (execute se necessário):
-- CREATE INDEX IF NOT EXISTS idx_products_reference_code ON public.products (reference_code);
