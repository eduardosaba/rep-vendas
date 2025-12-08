-- Migração idempotente: remove policies de INSERT públicas em orders/order_items
-- e cria policies seguras que exigem que auth.uid() = user_id

-- 1) Remove policies de INSERT públicas (procura policies com qual IS NULL ou 'true')
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE tablename IN ('orders','order_items')
      AND cmd = 'INSERT'
      AND (qual IS NULL OR trim(qual) = 'true')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END;
$$;

-- 2) Garante policy para inserir orders apenas quando auth.uid() = user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = 'orders' AND p.policyname = 'Users can insert their own orders'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert their own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);';
  END IF;
END;
$$;

-- 3) Garante policy para inserir order_items apenas quando pertencer a um pedido do usuário
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = 'order_items' AND p.policyname = 'Users can insert their own order items'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert their own order items" ON public.order_items FOR INSERT WITH CHECK ( EXISTS ( SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid() ) );';
  END IF;
END;
$$;

-- Nota: esta migração remove políticas permissivas de INSERT (quando presentes)
-- e cria políticas restritivas que exigem autenticação do usuário dono.
-- Se você precisa manter checkout anônimo, implemente um endpoint server-side
-- que use a Service Role Key para escrever pedidos validados.
