-- Migration: cria tabela companies e invoices para modelo Multi-tenant (Distribuidoras)
BEGIN;

-- 1) Tabela companies (distribuidoras)
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  website TEXT,
  email TEXT,
  phone TEXT,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  header_background_color TEXT,
  footer_background_color TEXT,
  footer_message TEXT,
  billing_contact JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_slug ON public.companies (slug);

-- 2) Tabela invoices (faturamento/assinaturas)
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  status TEXT DEFAULT 'pending', -- pending, paid, failed, refunded
  due_date TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  provider TEXT,
  provider_invoice_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON public.invoices (company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_provider_id ON public.invoices (provider_invoice_id);

-- 3) Observações e compatibilidade
-- A tabela `profiles` já ganhou `company_id` nullable em migrations anteriores.
-- Os representantes continuam a residir em `profiles` com `company_id` apontando para `companies.id`.

COMMIT;

-- Nota: execute em staging primeiro e faça backup antes de aplicar em produção.
