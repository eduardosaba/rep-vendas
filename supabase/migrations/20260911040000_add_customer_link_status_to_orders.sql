-- Migration: add_customer_link_status_to_orders.sql
-- Description: Adiciona customer_link_status e client_id para suporte a checkout simples sem login e vinculo posterior pela distribuidora.

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_link_status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Criar índices de performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_link_status ON public.orders(customer_link_status);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON public.orders(client_id);
