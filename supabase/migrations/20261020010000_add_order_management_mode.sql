-- ============================================================================
-- ESTRUTURA DDL: MODELOS DE GESTÃO DE PEDIDOS (Catálogo Digital vs B2B)
-- ============================================================================
-- 'representative': Catálogo Digital (autonomia do representante para aprovar/confirmar e transmitir externamente)
-- 'distributor': B2B Completo (gestão centralizada com aprovação formal da distribuidora)

-- 1. Coluna e Constraint em companies (padrão seguro: 'representative')
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS order_management_mode TEXT NOT NULL DEFAULT 'representative';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'companies_order_management_mode_chk'
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_order_management_mode_chk
      CHECK (order_management_mode IN ('representative', 'distributor'));
  END IF;
END;
$$;

-- 2. Coluna e Constraint em orders (preservação do histórico imutável do pedido)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS order_management_mode TEXT DEFAULT 'representative';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_order_management_mode_chk'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_order_management_mode_chk
      CHECK (order_management_mode IN ('representative', 'distributor'));
  END IF;
END;
$$;

-- 3. Índice para performance de consultas multi-tenant por modelo de gestão
CREATE INDEX IF NOT EXISTS idx_orders_company_order_mode
ON public.orders (company_id, order_management_mode)
WHERE company_id IS NOT NULL;
