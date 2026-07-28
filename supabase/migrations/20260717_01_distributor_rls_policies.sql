BEGIN;

-- 1. Garante que a tabela de perfis de usuário tenha o vínculo com a distribuidora (company_id) e o papel (role)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'rep'; -- 'master', 'admin_company', 'rep'

-- 2. Atualiza ou Cria a Política de Segurança (RLS) para PEDIDOS (orders)
-- Ela deve permitir que:
-- - Usuários leiam pedidos que criaram (user_id = auth.uid())
-- - OU Usuários com papel de administrador de empresa leiam todos os pedidos vinculados à mesma empresa (company_id)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de pedidos por dono ou admin da distribuidora" ON public.orders;

-- Política permissiva (padrão) para adicionar a leitura para administradores
CREATE POLICY "Permitir leitura de pedidos por dono ou admin da distribuidora" ON public.orders
FOR SELECT
USING (
  user_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.company_id = orders.company_id
    AND p.role IN ('admin_company', 'master')
  )
);

COMMIT;
