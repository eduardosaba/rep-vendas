-- RLS policies for products and orders (basic hardening)

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- PRODUCTS: SELECT - allow if product belongs to user's company or is user's own product
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'products_select_policy') THEN
    CREATE POLICY products_select_policy ON public.products
      FOR SELECT
      USING (
        (company_id IS NULL AND user_id = auth.uid())
        OR (company_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = public.products.company_id))
        OR (user_id = auth.uid())
      );
  END IF;
END$$;

-- PRODUCTS: INSERT - allow if inserting product for your company or your personal catalog
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'products_insert_policy') THEN
    CREATE POLICY products_insert_policy ON public.products
      FOR INSERT
      WITH CHECK (
        (company_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = public.products.company_id))
        OR (company_id IS NULL AND user_id = auth.uid())
      );
  END IF;
END$$;

-- PRODUCTS: UPDATE/DELETE - allow if you belong to the same company that owns the product or you are the item owner
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'products_update_policy') THEN
    CREATE POLICY products_update_policy ON public.products
      FOR UPDATE
      USING (
        (company_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = public.products.company_id))
        OR (user_id = auth.uid())
      )
      WITH CHECK (
        (company_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = public.products.company_id))
        OR (user_id = auth.uid())
      );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'products_delete_policy') THEN
    CREATE POLICY products_delete_policy ON public.products
      FOR DELETE
      USING (
        (company_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = public.products.company_id))
        OR (user_id = auth.uid())
      );
  END IF;
END$$;

-- ORDERS: SELECT - allow rep/company users to see orders for their company, and allow owners to see their own orders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'orders_select_policy') THEN
    CREATE POLICY orders_select_policy ON public.orders
      FOR SELECT
      USING (
        (company_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = public.orders.company_id))
        OR (user_id = auth.uid())
      );
  END IF;
END$$;

-- ORDERS: INSERT - allow creation when user_id = auth.uid() or when inserting a company order where the user belongs to that company
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'orders_insert_policy') THEN
    CREATE POLICY orders_insert_policy ON public.orders
      FOR INSERT
      WITH CHECK (
        (user_id = auth.uid())
        OR (company_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = public.orders.company_id))
      );
  END IF;
END$$;

-- ORDERS: UPDATE - allow company users to update their company orders, and owners to update their own
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'orders_update_policy') THEN
    CREATE POLICY orders_update_policy ON public.orders
      FOR UPDATE
      USING (
        (company_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = public.orders.company_id))
        OR (user_id = auth.uid())
      )
      WITH CHECK (
        (company_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.company_id = public.orders.company_id))
        OR (user_id = auth.uid())
      );
  END IF;
END$$;
