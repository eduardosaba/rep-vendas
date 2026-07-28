BEGIN;

-- 1. ADICIONAR COLUNAS DE CONTROLE DE ESTOQUE NA TABELA DE PRODUTOS
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_qty INT DEFAULT 0,          -- Estoque físico total no centro de distribuição
  ADD COLUMN IF NOT EXISTS stock_reserved INT DEFAULT 0;     -- Estoque "preso" em pedidos com status 'Pendente'

-- 2. FUNÇÃO ATÔMICA PARA REALIZAR O SOFT LOCK (RESERVA DE ESTOQUE)
-- Garante isolamento estrito contra race conditions utilizando SELECT FOR UPDATE.
CREATE OR REPLACE FUNCTION public.v3_reserve_stock(
  p_product_id UUID,
  p_quantity INT
)
RETURNS JSONB AS $$
DECLARE
  v_current_stock INT;
  v_current_reserved INT;
BEGIN
  -- 2.1 Adquire lock exclusivo na linha do produto
  SELECT stock_qty, stock_reserved INTO v_current_stock, v_current_reserved
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Produto não localizado na base de dados.');
  END IF;

  -- 2.2 Avalia disponibilidade: Estoque Livre = (Físico - Reservado)
  IF (v_current_stock - v_current_reserved) < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Estoque insuficiente para a quantidade solicitada.',
      'available', (v_current_stock - v_current_reserved)
    );
  END IF;

  -- 2.3 Incrementa a reserva sem tocar no estoque físico ainda
  UPDATE public.products
  SET 
    stock_reserved = stock_reserved + p_quantity,
    updated_at = now()
  WHERE id = p_product_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FUNÇÃO ATÔMICA PARA DEVOLVER/ESTORNAR RESERVA (CASO O PEDIDO SEJA CANCELADO)
CREATE OR REPLACE FUNCTION public.v3_release_stock(
  p_product_id UUID,
  p_quantity INT
)
RETURNS JSONB AS $$
BEGIN
  -- Reduz o contador de reserva com segurança para evitar números negativos
  UPDATE public.products
  SET 
    stock_reserved = GREATEST(0, stock_reserved - p_quantity),
    updated_at = now()
  WHERE id = p_product_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNÇÃO ATÔMICA PARA EFETIVAR A BAIXA DO ESTOQUE (QUANDO O PEDIDO É CONFIRMADO/FATURADO)
CREATE OR REPLACE FUNCTION public.v3_commit_stock(
  p_product_id UUID,
  p_quantity INT
)
RETURNS JSONB AS $$
BEGIN
  -- Deduz fisicamente do estoque geral e remove a reserva feita no soft lock
  UPDATE public.products
  SET 
    stock_qty = GREATEST(0, stock_qty - p_quantity),
    stock_reserved = GREATEST(0, stock_reserved - p_quantity),
    updated_at = now()
  WHERE id = p_product_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
