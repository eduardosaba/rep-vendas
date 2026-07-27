-- ========================================================================================
-- SUPABASE MIGRATION: 20260717_03_b2b_price_tables.sql
-- DESCRIPTION: Estruturação das tabelas de preços customizadas por organização (tenant)
-- ========================================================================================

BEGIN;

-- 1. CRIAR TABELA DE CADASTRO DAS TABELAS DE PREÇO (Multi-tenant)
CREATE TABLE IF NOT EXISTS public.price_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. CRIAR TABELA DE ITENS (Mapeamento de preço por produto dentro de cada tabela)
CREATE TABLE IF NOT EXISTS public.price_table_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_table_id UUID NOT NULL REFERENCES public.price_tables(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price_cents INT NOT NULL, -- Preço customizado em centavos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT price_table_product_unique UNIQUE (price_table_id, product_id)
);

-- 3. ADICIONAR VÍNCULO DE TABELA DE PREÇO NO CADASTRO DE CLIENTES
-- Faz uma checagem dinâmica para garantir compatibilidade se a tabela for 'clients' ou 'customers'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clients') THEN
    ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS price_table_id UUID REFERENCES public.price_tables(id) ON DELETE SET NULL;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS price_table_id UUID REFERENCES public.price_tables(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. ÍNDICES DE ALTA PERFORMANCE PARA O CATÁLOGO
CREATE INDEX IF NOT EXISTS idx_price_table_items_lookup 
  ON public.price_table_items (price_table_id, product_id);

COMMIT;
