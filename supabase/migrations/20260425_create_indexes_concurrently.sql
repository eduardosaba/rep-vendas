-- Create indexes concurrently (run manually outside transaction)
-- Date: 2026-04-25
-- NOTE: Must be executed outside a transaction block (psql or Supabase SQL editor run as separate statements)

CREATE INDEX CONCURRENTLY IF NOT EXISTS products_user_reference_brand_idx ON public.products (user_id, reference_code, brand);
CREATE INDEX CONCURRENTLY IF NOT EXISTS products_user_slug_idx ON public.products (user_id, slug);

-- If you use a managed SQL runner that wraps statements in transactions, run the two CREATE INDEX CONCURRENTLY
-- commands manually in psql as shown below:

-- psql -h <host> -p <port> -d <db> -U <user> -c "CREATE INDEX CONCURRENTLY products_user_reference_brand_idx ON public.products (user_id, reference_code, brand);"
-- psql -h <host> -p <port> -d <db> -U <user> -c "CREATE INDEX CONCURRENTLY products_user_slug_idx ON public.products (user_id, slug);"
