-- 2025-12-12: Migração segura que aplica/repõe policies apenas se as tabelas existirem
-- Previna erros como: relation "public.imported_images" does not exist

BEGIN;

DO $$
DECLARE
  tbl text;
  exists_tbl boolean;
BEGIN
  -- Lista de tabelas e policies mínimas a garantir
  FOR tbl IN SELECT unnest(ARRAY[
    'profiles','products','brands','settings','clients','orders','order_items','saved_carts','staging_images','imported_images'
  ]) LOOP
    SELECT EXISTS(SELECT 1 FROM pg_class WHERE relname = tbl AND relnamespace = 'public'::regnamespace) INTO exists_tbl;

    IF exists_tbl THEN
      -- Habilita RLS de forma segura
      EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', tbl);

      -- Aplicar policies específicas por tabela
      IF tbl = 'profiles' THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='profiles' AND p.policyname='Users can select own profile') THEN
DROP POLICY IF EXISTS "Users can select own profile" ON public.profiles;
          EXECUTE 'CREATE POLICY "Users can select own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id) OR is_master())';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='profiles' AND p.policyname='Users can update own profile') THEN
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
          EXECUTE 'CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id) OR is_master()) WITH CHECK ((auth.uid() = id) OR is_master())';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='profiles' AND p.policyname='Master can manage profiles') THEN
DROP POLICY IF EXISTS "Master can manage profiles" ON public.profiles;
          EXECUTE 'CREATE POLICY "Master can manage profiles" ON public.profiles FOR ALL USING (is_master()) WITH CHECK (is_master())';
        END IF;

      ELSIF tbl = 'products' THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='products' AND p.policyname='Public read products') THEN
DROP POLICY IF EXISTS "Public read products" ON public.products;
          EXECUTE 'CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='products' AND p.policyname='Users can insert their own products') THEN
DROP POLICY IF EXISTS "Users can insert their own products" ON public.products;
          EXECUTE 'CREATE POLICY "Users can insert their own products" ON public.products FOR INSERT WITH CHECK (auth.uid() = user_id)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='products' AND p.policyname='Users can update their own products') THEN
DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
          EXECUTE 'CREATE POLICY "Users can update their own products" ON public.products FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='products' AND p.policyname='Users can delete their own products') THEN
DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;
          EXECUTE 'CREATE POLICY "Users can delete their own products" ON public.products FOR DELETE USING (auth.uid() = user_id)';
        END IF;

      ELSIF tbl = 'brands' THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='brands' AND p.policyname='Public read brands') THEN
DROP POLICY IF EXISTS "Public read brands" ON public.brands;
          EXECUTE 'CREATE POLICY "Public read brands" ON public.brands FOR SELECT USING (true)';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='brands' AND p.policyname='Users can insert their own brands') THEN
DROP POLICY IF EXISTS "Users can insert their own brands" ON public.brands;
          EXECUTE 'CREATE POLICY "Users can insert their own brands" ON public.brands FOR INSERT WITH CHECK (auth.uid() = user_id)';
        END IF;

      ELSIF tbl = 'settings' THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='settings' AND p.policyname='Users can view their own settings') THEN
DROP POLICY IF EXISTS "Users can view their own settings" ON public.settings;
          EXECUTE 'CREATE POLICY "Users can view their own settings" ON public.settings FOR SELECT USING (auth.uid() = user_id)';
        END IF;

      ELSIF tbl = 'clients' THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='clients' AND p.policyname='Users can view their own clients') THEN
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
          EXECUTE 'CREATE POLICY "Users can view their own clients" ON public.clients FOR SELECT USING (auth.uid() = user_id)';
        END IF;

      ELSIF tbl = 'orders' THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='orders' AND p.policyname='Users can view their own orders') THEN
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
          EXECUTE 'CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id)';
        END IF;

      ELSIF tbl = 'order_items' THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='order_items' AND p.policyname='Users can view their own order items') THEN
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
          EXECUTE 'CREATE POLICY "Users can view their own order items" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()))';
        END IF;

      ELSIF tbl = 'saved_carts' THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='saved_carts' AND p.policyname='Users can view own saved carts (owner)') THEN
DROP POLICY IF EXISTS "Users can view own saved carts (owner)" ON public.saved_carts;
          EXECUTE 'CREATE POLICY "Users can view own saved carts (owner)" ON public.saved_carts FOR SELECT USING (auth.uid() = user_id_owner OR (guest_id IS NOT NULL AND current_setting(''app.guest_id'', true) = guest_id::text))';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='saved_carts' AND p.policyname='Users can insert own saved carts (owner)') THEN
DROP POLICY IF EXISTS "Users can insert own saved carts (owner)" ON public.saved_carts;
          EXECUTE 'CREATE POLICY "Users can insert own saved carts (owner)" ON public.saved_carts FOR INSERT WITH CHECK (auth.uid() = user_id_owner OR current_setting(''app.guest_id'', true) = COALESCE(guest_id::text, ''''))';
        END IF;

      ELSIF tbl = 'staging_images' THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='staging_images' AND p.policyname='Public read staging_images') THEN
DROP POLICY IF EXISTS "Public read staging_images" ON public.staging_images;
          EXECUTE 'CREATE POLICY "Public read staging_images" ON public.staging_images FOR SELECT USING (true)';
        END IF;

      ELSIF tbl = 'imported_images' THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='imported_images' AND p.policyname='Public read imported_images') THEN
DROP POLICY IF EXISTS "Public read imported_images" ON public.imported_images;
          EXECUTE 'CREATE POLICY "Public read imported_images" ON public.imported_images FOR SELECT USING (true)';
        END IF;

      END IF;
    END IF;
  END LOOP;
END$$;

COMMIT;
