BEGIN;

-- ========================================================================================
-- 1. ATUALIZAÇÃO DA TABELA ORGANIZATIONS & PROFILES
-- ========================================================================================
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  ADD COLUMN IF NOT EXISTS organization_type TEXT DEFAULT 'independent_representative',
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'organizations' AND constraint_name = 'organizations_organization_type_check'
  ) THEN
    ALTER TABLE public.organizations DROP CONSTRAINT organizations_organization_type_check;
  END IF;
END $$;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_organization_type_check
  CHECK (organization_type IN ('independent_representative', 'distributor', 'optical_store', 'catalog_template'));

CREATE INDEX IF NOT EXISTS idx_organizations_type ON public.organizations(organization_type);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);

-- ========================================================================================
-- 2. CRIAÇÃO DA TABELA ORGANIZATION_MEMBERS
-- ========================================================================================
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'sales_rep', 'buyer', 'operator')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_status ON public.organization_members(status);

-- ========================================================================================
-- 3. FUNCTIONS AUXILIARES (SECURITY DEFINER para evitar recursão RLS)
-- ========================================================================================
CREATE OR REPLACE FUNCTION public.get_user_role_in_org(org_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.organization_members 
  WHERE user_id = auth.uid() 
    AND organization_id = org_id
    AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.is_active_member_of(org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE user_id = auth.uid() 
      AND organization_id = org_id
      AND status = 'active'
  );
$$;

-- ========================================================================================
-- 4. SEED AUTO-MIGRAÇÃO DE ORGANIZAÇÕES E MEMBERSHIPS
-- ========================================================================================
INSERT INTO public.organizations (name, slug, organization_type, owner_user_id, status, is_active, created_at, metadata)
SELECT 
  coalesce(p.full_name, 'Representante') || ' Representações',
  'rep-' || lower(regexp_replace(coalesce(p.full_name, 'representante'), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(p.id::text, 1, 8),
  'independent_representative',
  p.id,
  'active',
  true,
  now(),
  jsonb_build_object('auto_migrated', true, 'migrated_at', now())
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_members om WHERE om.user_id = p.id
)
AND p.role IN ('representative', 'rep', 'admin_company')
AND p.id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.organization_members (organization_id, user_id, role, status)
SELECT o.id, o.owner_user_id, 'owner', 'active'
FROM public.organizations o
WHERE o.organization_type = 'independent_representative'
AND (o.metadata->>'auto_migrated')::boolean = true
AND NOT EXISTS (
  SELECT 1 FROM public.organization_members om 
  WHERE om.organization_id = o.id AND om.user_id = o.owner_user_id
);

INSERT INTO public.organization_members (organization_id, user_id, role, status)
SELECT p.organization_id, p.id, 
  CASE 
    WHEN p.role IN ('master', 'admin_company') THEN 'owner'
    ELSE 'sales_rep'
  END,
  'active'
FROM public.profiles p
WHERE p.organization_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.organization_members om 
  WHERE om.organization_id = p.organization_id AND om.user_id = p.id
);

-- ========================================================================================
-- 5. RLS POLICIES
-- ========================================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant_Hybrid_Access_Organizations" ON public.organizations;
DROP POLICY IF EXISTS "Master_Full_Access_Organizations" ON public.organizations;
DROP POLICY IF EXISTS "Public_Read_Active_Organizations" ON public.organizations;

CREATE POLICY "Tenant_Hybrid_Access_Organizations" ON public.organizations
FOR SELECT USING (
  public.is_active_member_of(id)
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND organization_id = organizations.id)
);

CREATE POLICY "Master_Full_Access_Organizations" ON public.organizations
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
);

CREATE POLICY "Public_Read_Active_Organizations" ON public.organizations
FOR SELECT USING (status = 'active' AND is_active = true);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members_Read_Own_Memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Members_Manage_Own_Org" ON public.organization_members;
DROP POLICY IF EXISTS "Master_Full_Access_Members" ON public.organization_members;

CREATE POLICY "Members_Read_Own_Memberships" ON public.organization_members
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Members_Manage_Own_Org" ON public.organization_members
FOR ALL USING (
  public.get_user_role_in_org(organization_id) IN ('owner', 'admin')
);

CREATE POLICY "Master_Full_Access_Members" ON public.organization_members
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'master')
);

-- ========================================================================================
-- 6. CRIAÇÃO E SEED DAS FEATURE FLAGS
-- ========================================================================================
CREATE TABLE IF NOT EXISTS public.organization_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    feature_key TEXT NOT NULL,
    enabled BOOLEAN DEFAULT false NOT NULL,
    activated_at TIMESTAMP WITH TIME ZONE,
    activated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(organization_id, feature_key)
);

ALTER TABLE public.organization_features ENABLE ROW LEVEL SECURITY;

INSERT INTO public.organization_features (organization_id, feature_key, enabled)
SELECT id, 'organization_context_enabled', false FROM public.organizations
ON CONFLICT (organization_id, feature_key) DO NOTHING;

INSERT INTO public.organization_features (organization_id, feature_key, enabled)
SELECT id, 'distributor_portal_enabled', false FROM public.organizations
ON CONFLICT (organization_id, feature_key) DO NOTHING;

INSERT INTO public.organization_features (organization_id, feature_key, enabled)
SELECT id, 'optical_store_enabled', false FROM public.organizations
ON CONFLICT (organization_id, feature_key) DO NOTHING;

INSERT INTO public.organization_features (organization_id, feature_key, enabled)
SELECT id, 'b2b_relationships_enabled', false FROM public.organizations
ON CONFLICT (organization_id, feature_key) DO NOTHING;

INSERT INTO public.organization_features (organization_id, feature_key, enabled)
SELECT id, 'organization_products_enabled', false FROM public.organizations
ON CONFLICT (organization_id, feature_key) DO NOTHING;

INSERT INTO public.organization_features (organization_id, feature_key, enabled)
SELECT id, 'dual_order_status_enabled', false FROM public.organizations
ON CONFLICT (organization_id, feature_key) DO NOTHING;

INSERT INTO public.organization_features (organization_id, feature_key, enabled)
SELECT id, 'catalog_template_clone_enabled', false FROM public.organizations
ON CONFLICT (organization_id, feature_key) DO NOTHING;

COMMIT;
