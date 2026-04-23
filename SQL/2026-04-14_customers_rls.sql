-- Enable RLS on customers and restrict access to company-owned rows
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Empresas veem apenas seus próprios clientes (SELECT/UPDATE/DELETE)
-- Remover policy existente para tornar a migration idempotente
DROP POLICY IF EXISTS "Empresas veem apenas seus próprios clientes" ON public.customers;

CREATE POLICY "Empresas veem apenas seus próprios clientes"
ON public.customers
FOR ALL
USING (
  company_id = (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  company_id = (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

-- Nota: para operações administrativas ou integrações, use o service_role_key com um cliente admin que contorne RLS.
