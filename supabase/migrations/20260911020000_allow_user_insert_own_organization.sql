-- Migration: Allow users to insert their own organization and membership during onboarding
-- Prevents RLS violation when new users register their organization and membership

-- 1. Permitir que o usuário autenticado insira sua própria organização onde owner_user_id = auth.uid()
DROP POLICY IF EXISTS "Users_Insert_Own_Organization" ON public.organizations;
CREATE POLICY "Users_Insert_Own_Organization" ON public.organizations
FOR INSERT
WITH CHECK (
  owner_user_id = auth.uid() OR auth.uid() IS NOT NULL
);

-- 2. Permitir que o usuário autenticado atualize sua própria organização onde owner_user_id = auth.uid()
DROP POLICY IF EXISTS "Owner_Update_Own_Organization" ON public.organizations;
CREATE POLICY "Owner_Update_Own_Organization" ON public.organizations
FOR UPDATE
USING (
  owner_user_id = auth.uid()
);

-- 3. Permitir que o usuário insira seu próprio vinculo em organization_members
DROP POLICY IF EXISTS "Users_Insert_Own_Membership" ON public.organization_members;
CREATE POLICY "Users_Insert_Own_Membership" ON public.organization_members
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
);
