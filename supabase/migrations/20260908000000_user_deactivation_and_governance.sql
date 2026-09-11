-- Migration: Governança de Usuários V1 - Desativação Reversível, Reativação e Restrictive RLS
-- Data: 2026-09-08
-- Projeto: aawghxjbipcqefmikwby

BEGIN;

-- 1. ADICIONAR SOMENTE AS COLUNAS DE DESATIVAÇÃO EM PUBLIC.PROFILES (REPRODUTIBILIDADE EM BANCO NOVO)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS disabled_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS disabled_reason TEXT NULL;

-- Índices otimizados para status ativo e papéis
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles (is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_role_active ON public.profiles (role, is_active);

-- 2. FUNÇÃO AUXILIAR CANÔNICA `is_current_user_active`
-- Requisitos: sem parâmetros, usa auth.uid(), retorna false se sem perfil, SECURITY DEFINER, STABLE, search_path fixo public, pg_temp.
CREATE OR REPLACE FUNCTION public.is_current_user_active()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_active BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT is_active INTO v_is_active
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN COALESCE(v_is_active, FALSE);
END;
$$;

REVOKE ALL ON FUNCTION public.is_current_user_active() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_active() TO authenticated, service_role;

-- 3. RPC TRANSACIONAL COM LOCK DE MASTER `deactivate_user_safe`
-- Exclusiva do service_role, previne auto-desativação e preserva o último administrador global ('master').
CREATE OR REPLACE FUNCTION public.deactivate_user_safe(
  p_target_user_id UUID,
  p_disabled_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_role TEXT;
  v_target_is_active BOOLEAN;
  v_active_master_count INT;
  v_rows_updated INT;
BEGIN
  -- Impedir auto-desativação
  IF p_target_user_id = p_disabled_by THEN
    RAISE EXCEPTION 'Operação negada: não é permitido desativar a própria conta.';
  END IF;

  -- 1. Adquirir lock exclusivo de linha nos perfis de Administradores Master ativos
  PERFORM id FROM public.profiles WHERE role::text = 'master' AND is_active = true FOR UPDATE;

  -- 2. Re-ler estado do usuário alvo após lock
  SELECT role::text, is_active
  INTO v_target_role, v_target_is_active
  FROM public.profiles
  WHERE id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil de usuário não encontrado.';
  END IF;

  IF v_target_is_active = FALSE THEN
    RETURN jsonb_build_object('success', true, 'already_disabled', true, 'message', 'Usuário já está desativado.');
  END IF;

  -- 3. Impedir a desativação do único usuário Master ativo
  IF v_target_role = 'master' THEN
    SELECT COUNT(*) INTO v_active_master_count
    FROM public.profiles
    WHERE role::text = 'master' AND is_active = true;

    IF v_active_master_count <= 1 THEN
      RAISE EXCEPTION 'Operação bloqueada: não é possível desativar o único usuário Master ativo do sistema.';
    END IF;
  END IF;

  -- 4. Executar desativação atômica sem excluir nenhum registro e sem alterar Auth
  UPDATE public.profiles
  SET
    is_active = false,
    disabled_at = now(),
    disabled_by = p_disabled_by,
    disabled_reason = p_reason
  WHERE id = p_target_user_id AND is_active = true;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    RETURN jsonb_build_object('success', true, 'already_disabled', true, 'message', 'Usuário já estava desativado.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'target_user_id', p_target_user_id,
    'disabled_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.deactivate_user_safe(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_user_safe(UUID, UUID, TEXT) TO service_role;

-- 4. POLICIES RESTRICTIVE NAS 11 TABELAS PRIVADAS CONFIRMADAS

-- 4.1 PROFILES
-- A. Bloquear UPDATE por usuário inativo
DROP POLICY IF EXISTS "Profiles_Active_User_Restrictive" ON public.profiles;
DROP POLICY IF EXISTS "Profiles_Active_User_Update_Restrictive" ON public.profiles;
CREATE POLICY "Profiles_Active_User_Update_Restrictive"
ON public.profiles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.is_current_user_active())
WITH CHECK (public.is_current_user_active());

-- B. Proibir exclusão direta de perfil por qualquer usuário autenticado
DROP POLICY IF EXISTS "Profiles_No_Delete_Restrictive" ON public.profiles;
CREATE POLICY "Profiles_No_Delete_Restrictive"
ON public.profiles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

-- 4.2 ORDERS
DROP POLICY IF EXISTS "Orders_Active_User_Restrictive" ON public.orders;
CREATE POLICY "Orders_Active_User_Restrictive"
ON public.orders
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.is_current_user_active())
WITH CHECK (public.is_current_user_active());

-- 4.3 ORDER_ITEMS
DROP POLICY IF EXISTS "Order_Items_Active_User_Restrictive" ON public.order_items;
CREATE POLICY "Order_Items_Active_User_Restrictive"
ON public.order_items
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.is_current_user_active())
WITH CHECK (public.is_current_user_active());

-- 4.4 CLIENTS
DROP POLICY IF EXISTS "Clients_Active_User_Restrictive" ON public.clients;
CREATE POLICY "Clients_Active_User_Restrictive"
ON public.clients
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.is_current_user_active())
WITH CHECK (public.is_current_user_active());

-- 4.5 SAVED_CARTS
DROP POLICY IF EXISTS "Saved_Carts_Active_User_Restrictive" ON public.saved_carts;
CREATE POLICY "Saved_Carts_Active_User_Restrictive"
ON public.saved_carts
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.is_current_user_active())
WITH CHECK (public.is_current_user_active());

-- 4.6 DRAFT_ORDERS
DROP POLICY IF EXISTS "Draft_Orders_Active_User_Restrictive" ON public.draft_orders;
CREATE POLICY "Draft_Orders_Active_User_Restrictive"
ON public.draft_orders
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.is_current_user_active())
WITH CHECK (public.is_current_user_active());

-- 4.7 DRAFT_ORDER_ITEMS
DROP POLICY IF EXISTS "Draft_Order_Items_Active_User_Restrictive" ON public.draft_order_items;
CREATE POLICY "Draft_Order_Items_Active_User_Restrictive"
ON public.draft_order_items
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.is_current_user_active())
WITH CHECK (public.is_current_user_active());

-- 4.8 SETTINGS
DROP POLICY IF EXISTS "Settings_Active_User_Restrictive" ON public.settings;
CREATE POLICY "Settings_Active_User_Restrictive"
ON public.settings
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.is_current_user_active())
WITH CHECK (public.is_current_user_active());

-- 4.9 USER_PREFERENCES
DROP POLICY IF EXISTS "User_Preferences_Active_User_Restrictive" ON public.user_preferences;
CREATE POLICY "User_Preferences_Active_User_Restrictive"
ON public.user_preferences
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.is_current_user_active())
WITH CHECK (public.is_current_user_active());

-- 4.10 ORGANIZATION_MEMBERS
DROP POLICY IF EXISTS "Organization_Members_Active_User_Restrictive" ON public.organization_members;
CREATE POLICY "Organization_Members_Active_User_Restrictive"
ON public.organization_members
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.is_current_user_active())
WITH CHECK (public.is_current_user_active());

-- 4.11 PAYMENT_GATEWAYS
DROP POLICY IF EXISTS "Payment_Gateways_Active_User_Restrictive" ON public.payment_gateways;
CREATE POLICY "Payment_Gateways_Active_User_Restrictive"
ON public.payment_gateways
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.is_current_user_active())
WITH CHECK (public.is_current_user_active());

-- 4.12 SUBSCRIPTIONS
DROP POLICY IF EXISTS "Subscriptions_Active_User_Restrictive" ON public.subscriptions;
CREATE POLICY "Subscriptions_Active_User_Restrictive"
ON public.subscriptions
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.is_current_user_active())
WITH CHECK (public.is_current_user_active());

COMMIT;
