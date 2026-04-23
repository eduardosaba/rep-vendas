-- Otimizando a busca por data para as exportações
-- Rode no SQL Editor do Supabase

CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON public.pedidos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products (created_at DESC);
