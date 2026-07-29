CREATE TABLE inventory_movements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id uuid REFERENCES products(id) NOT NULL,
 organization_id uuid REFERENCES organizations(id) NOT NULL,
 performed_by uuid REFERENCES profiles(id) NOT NULL,
 movement_type text NOT NULL CHECK (
   movement_type IN ('ENTRY', 'SALE', 'RESERVE', 'CANCEL', 'ADJUSTMENT')
 ),
 quantity integer NOT NULL,
 previous_stock integer,
 new_stock integer,
 available_stock integer,
 reason text,
 reference_id uuid,
 created_at timestamptz DEFAULT now()
);

-- Índices de performance
CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_org ON inventory_movements(organization_id);
CREATE INDEX idx_inventory_product_created ON inventory_movements(product_id, created_at DESC);

-- Função RPC Transacional
CREATE OR REPLACE FUNCTION register_inventory_movement(
  p_product_id uuid,
  p_organization_id uuid,
  p_performed_by uuid,
  p_movement_type text,
  p_quantity integer,
  p_reason text,
  p_reference_id uuid
) RETURNS void AS $$
DECLARE
  v_current_stock integer;
  v_new_stock integer;
BEGIN
  -- 1. Lock do registro para evitar concorrência (FOR UPDATE)
  SELECT stock_quantity INTO v_current_stock 
  FROM products 
  WHERE id = p_product_id 
    AND (organization_id = p_organization_id OR organization_id IS NULL) -- Ajuste de segurança
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado ou sem permissão.';
  END IF;

  -- 2. Calcula novo saldo
  v_new_stock := COALESCE(v_current_stock, 0) + p_quantity;

  -- 3. Impede estoque negativo para vendas/reservas
  IF v_new_stock < 0 AND p_movement_type IN ('SALE', 'RESERVE') THEN
    RAISE EXCEPTION 'Estoque insuficiente.';
  END IF;

  -- 4. Atualiza o produto
  UPDATE products 
  SET stock_quantity = v_new_stock, updated_at = now()
  WHERE id = p_product_id;

  -- 5. Grava movimento
  INSERT INTO inventory_movements (
    product_id, organization_id, performed_by, movement_type, 
    quantity, previous_stock, new_stock, available_stock, reason, reference_id
  ) VALUES (
    p_product_id, p_organization_id, p_performed_by, p_movement_type,
    p_quantity, COALESCE(v_current_stock, 0), v_new_stock, v_new_stock, p_reason, p_reference_id
  );
END;
$$ LANGUAGE plpgsql;
