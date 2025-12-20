-- 2025-12-12: Substituir/atualizar políticas RLS em todas as tabelas principais
-- ID: 20251212113000_replace_all_policies.sql
-- Objetivo: garantir RLS habilitado e políticas idempotentes e seguras em todas as tabelas usadas pela aplicação.
-- IMPORTANTE: testar em staging e fazer backup antes de aplicar.

BEGIN;

-- Helpers: garante que a função is_master exista (usada em várias policies)
-- (Se já existir, esta declaração irá sobrescrever com a mesma implementação segura)
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'master'
  );
$$;

-- Listagem de tabelas alvo e políticas a aplicar.

-- === profiles ===
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can select own profile" ON public.profiles;
CREATE POLICY "Users can select own profile" ON public.profiles
  FOR SELECT USING ((auth.uid() = id) OR is_master());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING ((auth.uid() = id) OR is_master()) WITH CHECK ((auth.uid() = id) OR is_master());

-- Allow masters to manage all profiles
DROP POLICY IF EXISTS "Master can manage profiles" ON public.profiles;
CREATE POLICY "Master can manage profiles" ON public.profiles
  FOR ALL USING (is_master()) WITH CHECK (is_master());

-- === products (catálogo público: SELECT público; writes restricted to owner) ===
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read products" ON public.products;
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own products" ON public.products;
CREATE POLICY "Users can insert their own products" ON public.products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
CREATE POLICY "Users can update their own products" ON public.products
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;
CREATE POLICY "Users can delete their own products" ON public.products
  FOR DELETE USING (auth.uid() = user_id);

-- === brands ===
ALTER TABLE IF EXISTS public.brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read brands" ON public.brands;
CREATE POLICY "Public read brands" ON public.brands FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own brands" ON public.brands;
CREATE POLICY "Users can insert their own brands" ON public.brands
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own brands" ON public.brands;
CREATE POLICY "Users can update their own brands" ON public.brands
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own brands" ON public.brands;
CREATE POLICY "Users can delete their own brands" ON public.brands
  FOR DELETE USING (auth.uid() = user_id);

-- === settings ===
ALTER TABLE IF EXISTS public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own settings" ON public.settings;
CREATE POLICY "Users can view their own settings" ON public.settings FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own settings" ON public.settings;
CREATE POLICY "Users can insert their own settings" ON public.settings FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON public.settings;
CREATE POLICY "Users can update their own settings" ON public.settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own settings" ON public.settings;
CREATE POLICY "Users can delete their own settings" ON public.settings FOR DELETE USING (auth.uid() = user_id);

-- === clients ===
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
CREATE POLICY "Users can view their own clients" ON public.clients FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own clients" ON public.clients;
CREATE POLICY "Users can insert their own clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
CREATE POLICY "Users can update their own clients" ON public.clients FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
CREATE POLICY "Users can delete their own clients" ON public.clients FOR DELETE USING (auth.uid() = user_id);

-- === orders ===
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
CREATE POLICY "Users can insert their own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
CREATE POLICY "Users can update their own orders" ON public.orders FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own orders" ON public.orders;
CREATE POLICY "Users can delete their own orders" ON public.orders FOR DELETE USING (auth.uid() = user_id);

-- === order_items ===
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
CREATE POLICY "Users can view their own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own order items" ON public.order_items;
CREATE POLICY "Users can insert their own order items" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own order items" ON public.order_items;
CREATE POLICY "Users can update their own order items" ON public.order_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own order items" ON public.order_items;
CREATE POLICY "Users can delete their own order items" ON public.order_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  );

-- === saved_carts (suporta guest_id e owner) ===
ALTER TABLE IF EXISTS public.saved_carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own saved carts (owner)" ON public.saved_carts;
CREATE POLICY "Users can view own saved carts (owner)" ON public.saved_carts
  FOR SELECT USING (
    auth.uid() = user_id_owner
    OR (guest_id IS NOT NULL AND current_setting('app.guest_id', true) = guest_id::text)
  );

DROP POLICY IF EXISTS "Users can insert own saved carts (owner)" ON public.saved_carts;
CREATE POLICY "Users can insert own saved carts (owner)" ON public.saved_carts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id_owner
    OR current_setting('app.guest_id', true) = COALESCE(guest_id::text, '')
  );

DROP POLICY IF EXISTS "Users can update own saved carts (owner)" ON public.saved_carts;
CREATE POLICY "Users can update own saved carts (owner)" ON public.saved_carts
  FOR UPDATE USING (
    auth.uid() = user_id_owner
    OR (guest_id IS NOT NULL AND current_setting('app.guest_id', true) = guest_id::text)
  ) WITH CHECK (
    auth.uid() = user_id_owner
    OR current_setting('app.guest_id', true) = COALESCE(guest_id::text, '')
  );

DROP POLICY IF EXISTS "Users can delete own saved carts (owner)" ON public.saved_carts;
CREATE POLICY "Users can delete own saved carts (owner)" ON public.saved_carts
  FOR DELETE USING (
    auth.uid() = user_id_owner
    OR (guest_id IS NOT NULL AND current_setting('app.guest_id', true) = guest_id::text)
  );

-- === staging_images / imported_images (se existirem) ===
ALTER TABLE IF EXISTS public.staging_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read staging_images" ON public.staging_images;
CREATE POLICY "Public read staging_images" ON public.staging_images FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.imported_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read imported_images" ON public.imported_images;
CREATE POLICY "Public read imported_images" ON public.imported_images FOR SELECT USING (true);

-- Fallback: listar outras tabelas conhecidas e garantir RLS habilitado (sem criar policies)
-- (Evita que alguma tabela fique sem RLS ativado) -- ajuste conforme necessário
DO $$
DECLARE
  t record;
  known_tables text[] := ARRAY['profiles','products','brands','settings','clients','orders','order_items','saved_carts','staging_images','imported_images'];
BEGIN
  FOR t IN SELECT unnest(known_tables) AS tbl LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', t.tbl);
  END LOOP;
END$$;

COMMIT;

-- Observações:
-- - Esta migração é idempotente e pode ser aplicada múltiplas vezes.
-- - Teste em staging: verifique leitura pública do catálogo, criação/edição de produtos por usuário autenticado,
--   funcionalidade de saved_carts para guests e usuários.
-- - Se precisar de políticas adicionais (ex.: limitar leitura pública por `catalog_user_id`), posso ajustar com GUCs e RPCs.
