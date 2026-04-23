-- Adiciona colunas para multi-tenant e origem do pedido
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id),
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id),
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'catalogo'; -- 'rep' ou 'cliente_direto'

-- Atualiza o constraint de status para incluir 'Aguardando Faturamento'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN ('Pendente', 'Aguardando Faturamento', 'Confirmado', 'Em Preparação', 'Enviado', 'Entregue', 'Cancelado', 'Completo'));
