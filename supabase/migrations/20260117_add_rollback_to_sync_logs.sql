-- Migration: add rollback_data and rolled_back to sync_logs and create rollback function
-- Date: 2026-01-17

ALTER TABLE public.sync_logs
  ADD COLUMN IF NOT EXISTS rollback_data JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rolled_back BOOLEAN DEFAULT false;

-- Function to rollback a sync operation by restoring previous values saved in rollback_data
CREATE OR REPLACE FUNCTION public.rollback_sync_operation(p_log_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_item JSONB;
  v_count INTEGER := 0;
  v_target_col TEXT;
BEGIN
  SELECT target_column INTO v_target_col FROM public.sync_logs WHERE id = p_log_id;

  FOR v_item IN SELECT * FROM (SELECT jsonb_array_elements(rollback_data) FROM public.sync_logs WHERE id = p_log_id) AS items LOOP
    IF v_target_col = 'price' THEN
      UPDATE public.products
      SET price = (v_item->>'old_value')::NUMERIC,
          updated_at = NOW()
      WHERE id = (v_item->>'id')::UUID;
    ELSIF v_target_col = 'sale_price' THEN
      UPDATE public.products
      SET sale_price = (v_item->>'old_value')::NUMERIC,
          updated_at = NOW()
      WHERE id = (v_item->>'id')::UUID;
    ELSIF v_target_col = 'stock_quantity' THEN
      UPDATE public.products
      SET stock_quantity = (v_item->>'old_value')::INTEGER,
          updated_at = NOW()
      WHERE id = (v_item->>'id')::UUID;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  UPDATE public.sync_logs SET rolled_back = true WHERE id = p_log_id;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
