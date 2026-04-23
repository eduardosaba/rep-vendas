-- Structured migration for role_permissions: add columns and seed defaults

ALTER TABLE public.role_permissions 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS allowed_tabs text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS allowed_sidebar_labels text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS can_manage_catalog boolean DEFAULT false;

-- Allow multiple rows per role (global + per company)
ALTER TABLE public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_pkey;
-- Create unique constraint if it doesn't already exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_role_company_unique'
  ) THEN
    ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_role_company_unique UNIQUE (role, company_id);
  END IF;
END
$$;

-- Ensure `data` column has a default in case it existed without one
ALTER TABLE public.role_permissions ALTER COLUMN data SET DEFAULT '{}'::jsonb;

-- Seed with safe defaults (global entries where company_id IS NULL)
INSERT INTO public.role_permissions (role, company_id, allowed_tabs, allowed_sidebar_labels, can_manage_catalog)
VALUES 
('master', NULL, '{geral, appearance, display, institucional, pages, estoque, perfil}', '{Visão Geral, Pedidos, Distribuidora, Gestão da Distribuidora, Produtos, Marketing, Ferramentas, Clientes, Equipe, Comunicados, Configurações, Ajuda}', true),
('admin_company', NULL, '{geral, appearance, display, institucional, pages, estoque, perfil}', '{Visão Geral, Pedidos, Distribuidora, Gestão da Distribuidora, Produtos, Marketing, Clientes, Equipe, Comunicados, Configurações, Ajuda}', true),
('rep', NULL, '{geral, appearance, display, estoque, perfil}', '{Visão Geral, Pedidos, Produtos, Marketing, Clientes, Configurações, Ajuda}', true),
('representative', NULL, '{geral, perfil}', '{Visão Geral, Pedidos, Distribuidora, Clientes, Configurações, Ajuda}', false)
ON CONFLICT (role, company_id) DO UPDATE SET 
  allowed_tabs = EXCLUDED.allowed_tabs,
  allowed_sidebar_labels = EXCLUDED.allowed_sidebar_labels,
  can_manage_catalog = EXCLUDED.can_manage_catalog;

-- Ensure existing rows have a safe `data` value to avoid NOT NULL violations
UPDATE public.role_permissions SET data = '{}'::jsonb WHERE data IS NULL;

-- Make `data` column NOT NULL now that existing rows are populated
ALTER TABLE public.role_permissions ALTER COLUMN data SET NOT NULL;

-- End of migration
