-- Migration: ensure_sales_rep_id_in_orders.sql
-- Description: Adiciona sales_rep_id e organization_id na tabela orders para rastreabilidade comercial B2B.

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS sales_rep_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Criar índices para otimização de relatórios por representante e por organização
CREATE INDEX IF NOT EXISTS idx_orders_sales_rep_id ON public.orders(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_orders_organization_id ON public.orders(organization_id);
