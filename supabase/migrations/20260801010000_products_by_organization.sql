-- ========================================================================================
-- SUPABASE MIGRATION: 20260801010000_products_by_organization.sql
-- DESCRIPTION: Products, Brands, Categories scoped by organization_id with RLS híbrida
-- ========================================================================================

BEGIN;

-- ========================================================================================
-- 1. PRODUCTS - Garantir colunas de clonagem e organization_id (já existem, mas garantir constraints)
-- ========================================================================================

-- Adicionar colunas de traceabilidade de clonagem se não existirem
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS source_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cloned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cloned_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_products_organization_id ON public.products(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON public.products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_source_product_id ON public.products(source_product_id);
CREATE INDEX IF NOT EXISTS idx_products_source_organization_id ON public.products(source_organization_id);
CREATE INDEX IF NOT EXISTS idx_products_org_active ON public.products(organization_id, is_active) WHERE is_active = true;

-- ========================================================================================
-- 2. BRANDS - Garantir organization_id e RLS
-- ========================================================================================

-- Adicionar colunas se não existirem (já existem mas garantir)
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_brands_organization_id ON public.brands(organization_id);
CREATE INDEX IF NOT EXISTS idx_brands_company_id ON public.brands(company_id);

-- ========================================================================================
-- 3. CATEGORIES - Garantir organization_id e RLS
-- ========================================================================================

-- Adicionar colunas se não existirem (já existem mas garantir)
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_categories_organization_id ON public.categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_categories_company_id ON public.categories(company_id);

-- ========================================================================================
-- 4. RLS HÍBRIDA PARA PRODUCTS
-- ========================================================================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas
DROP POLICY IF EXISTS "Products are public for viewing" ON public.products;
DROP POLICY IF EXISTS "Users can insert own products" ON public.products;
DROP POLICY IF EXISTS "Users can update own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete own products" ON public.products;
DROP POLICY IF EXISTS "Tenant_Hybrid_Access_Products" ON public.products;
DROP POLICY IF EXISTS "Master_Full_Access_Products" ON public.products;
DROP POLICY IF EXISTS "Public_Read_Active_Products" ON public.products;

-- Policy híbrida para LEITURA: membership ativa OU user_id legacy OU master OU catálogo público (is_active)
CREATE POLICY "Tenant_Hybrid_Access_Products" ON public.products
FOR SELECT USING (
  -- 1. Organização ativa via membership
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR
  -- 2. Master tem acesso total
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  OR
  -- 3. Fallback legacy: user_id do produto = usuário autenticado
  user_id = auth.uid()
  OR
  -- 4. Fallback legacy: company_id do produto = company_id do perfil
  (company_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND company_id = products.company_id
  ))
  OR
  -- 5. Catálogo público: produtos ativos de organizações públicas
  (is_active = true AND organization_id IN (
    SELECT id FROM public.organizations WHERE is_public = true AND status = 'active'
  ))
);

-- Policy para INSERÇÃO: membership ativa (owner/admin) OU master OU fallback legacy user_id
CREATE POLICY "Tenant_Hybrid_Insert_Products" ON public.products
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  )
  OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  OR
  user_id = auth.uid()
);

-- Policy para ATUALIZAÇÃO: membership ativa (owner/admin) OU master OU fallback legacy user_id
CREATE POLICY "Tenant_Hybrid_Update_Products" ON public.products
FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  )
  OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  OR
  user_id = auth.uid()
) WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  )
  OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  OR
  user_id = auth.uid()
);

-- Policy para EXCLUSÃO: apenas owner/admin da org OU master
CREATE POLICY "Tenant_Hybrid_Delete_Products" ON public.products
FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  )
  OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
);

-- ========================================================================================
-- 5. RLS HÍBRIDA PARA BRANDS
-- ========================================================================================

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant_Hybrid_Access_Brands" ON public.brands;
DROP POLICY IF EXISTS "Master_Full_Access_Brands" ON public.brands;
DROP POLICY IF EXISTS "Public_Read_Active_Brands" ON public.brands;

CREATE POLICY "Tenant_Hybrid_Access_Brands" ON public.brands
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  OR
  user_id = auth.uid()
  OR
  (company_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND company_id = brands.company_id
  ))
);

CREATE POLICY "Tenant_Hybrid_Insert_Brands" ON public.brands
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  )
  OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  OR
  user_id = auth.uid()
);

CREATE POLICY "Tenant_Hybrid_Update_Brands" ON public.brands
FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  )
  OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  OR
  user_id = auth.uid()
) WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  )
  OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  OR
  user_id = auth.uid()
);

CREATE POLICY "Tenant_Hybrid_Delete_Brands" ON public.brands
FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  )
  OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
);

-- ========================================================================================
-- 6. RLS HÍBRIDA PARA CATEGORIES
-- ========================================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant_Hybrid_Access_Categories" ON public.categories;
DROP POLICY IF EXISTS "Master_Full_Access_Categories" ON public.categories;

CREATE POLICY "Tenant_Hybrid_Access_Categories" ON public.categories
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  OR
  user_id = auth.uid()
  OR
  (company_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND company_id = categories.company_id
  ))
);

CREATE POLICY "Tenant_Hybrid_Insert_Categories" ON public.categories
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  )
  OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  OR
  user_id = auth.uid()
);

CREATE POLICY "Tenant_Hybrid_Update_Categories" ON public.categories
FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  )
  OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  OR
  user_id = auth.uid()
) WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  )
  OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  OR
  user_id = auth.uid()
);

CREATE POLICY "Tenant_Hybrid_Delete_Categories" ON public.categories
FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin')
  )
  OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
);

-- ========================================================================================
-- 7. FUNCTIONS PARA BACKFILL E CONSULTAS
-- ========================================================================================

-- Função para backfill organization_id em products órfãos
CREATE OR REPLACE FUNCTION public.backfill_products_organization_id()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- Atualizar products que têm user_id mas não organization_id
  UPDATE public.products p
  SET organization_id = om.organization_id
  FROM public.organization_members om
  WHERE p.organization_id IS NULL
    AND p.user_id = om.user_id
    AND om.status = 'active'
    AND om.role IN ('owner', 'admin', 'sales_rep');
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Para os que ainda não têm, tentar via profile.organization_id
  UPDATE public.products p
  SET organization_id = pr.organization_id
  FROM public.profiles pr
  WHERE p.organization_id IS NULL
    AND p.user_id = pr.id
    AND pr.organization_id IS NOT NULL;
  
  GET DIAGNOSTICS updated_count = updated_count + ROW_COUNT;
  
  -- Para os que ainda não têm, tentar via profile.company_id (legacy)
  UPDATE public.products p
  SET organization_id = pr.company_id
  FROM public.profiles pr
  WHERE p.organization_id IS NULL
    AND p.user_id = pr.id
    AND pr.company_id IS NOT NULL;
  
  GET DIAGNOSTICS updated_count = updated_count + ROW_COUNT;
  
  RETURN updated_count;
END $$;

-- Função para backfill brands
CREATE OR REPLACE FUNCTION public.backfill_brands_organization_id()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  UPDATE public.brands b
  SET organization_id = om.organization_id
  FROM public.organization_members om
  WHERE b.organization_id IS NULL
    AND b.user_id = om.user_id
    AND om.status = 'active';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  UPDATE public.brands b
  SET organization_id = pr.organization_id
  FROM public.profiles pr
  WHERE b.organization_id IS NULL
    AND b.user_id = pr.id
    AND pr.organization_id IS NOT NULL;
  
  GET DIAGNOSTICS updated_count = updated_count + ROW_COUNT;
  
  UPDATE public.brands b
  SET organization_id = pr.company_id
  FROM public.profiles pr
  WHERE b.organization_id IS NULL
    AND b.user_id = pr.id
    AND pr.company_id IS NOT NULL;
  
  GET DIAGNOSTICS updated_count = updated_count + ROW_COUNT;
  
  RETURN updated_count;
END $$;

-- Função para backfill categories
CREATE OR REPLACE FUNCTION public.backfill_categories_organization_id()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  UPDATE public.categories c
  SET organization_id = om.organization_id
  FROM public.organization_members om
  WHERE c.organization_id IS NULL
    AND c.user_id = om.user_id
    AND om.status = 'active';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  UPDATE public.categories c
  SET organization_id = pr.organization_id
  FROM public.profiles pr
  WHERE c.organization_id IS NULL
    AND c.user_id = pr.id
    AND pr.organization_id IS NOT NULL;
  
  GET DIAGNOSTICS updated_count = updated_count + ROW_COUNT;
  
  UPDATE public.categories c
  SET organization_id = pr.company_id
  FROM public.profiles pr
  WHERE c.organization_id IS NULL
    AND c.user_id = pr.id
    AND pr.company_id IS NOT NULL;
  
  GET DIAGNOSTICS updated_count = updated_count + ROW_COUNT;
  
  RETURN updated_count;
END $$;

-- ========================================================================================
-- 8. SEED FEATURE FLAGS PARA FASE 2
-- ========================================================================================

INSERT INTO public.organization_features (organization_id, feature_key, enabled)
SELECT id, 'organization_products_enabled', false FROM public.organizations
ON CONFLICT (organization_id, feature_key) DO NOTHING;

INSERT INTO public.organization_features (organization_id, feature_key, enabled)
SELECT id, 'catalog_template_clone_enabled', false FROM public.organizations
ON CONFLICT (organization_id, feature_key) DO NOTHING;

COMMIT;