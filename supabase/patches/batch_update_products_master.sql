-- Função para processar um array JSONB (onde o argumento é um JSONB contendo um array)
-- Aceita: batch_data JSONB (ex: '[{"target_sku":"SKU1","update_data":{...}}, ...]')
-- Para usar com supabase.rpc('batch_update_products_master', { batch_data: JSON.stringify(batchPayload) })

CREATE OR REPLACE FUNCTION batch_update_products_master(
  batch_data JSONB
)
RETURNS VOID AS $$
DECLARE
  item JSONB;
BEGIN
  IF batch_data IS NULL THEN
    RETURN;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(batch_data)
  LOOP
    PERFORM update_products_dynamic_global(
      item->> 'target_sku',
      item-> 'update_data'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Índice recomendado para performance em buscas por reference_code
-- CREATE INDEX IF NOT EXISTS idx_products_reference_code ON public.products (reference_code);
