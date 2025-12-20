-- 2025-12-12: Forçar recriação dos wrappers públicos para RPCs guest
-- Remove funções públicas existentes (com assinatura exata) e recria-as idempotentemente.
-- Aplicar em staging primeiro e fazer backup.

BEGIN;

-- Drop functions if they exist with the exact signatures
DROP FUNCTION IF EXISTS public.insert_saved_cart_for_guest(uuid, text, jsonb, timestamptz);
DROP FUNCTION IF EXISTS public.get_saved_cart_for_guest(text, uuid);
DROP FUNCTION IF EXISTS public.delete_saved_cart_for_guest(text, uuid);

-- Recreate insert wrapper
CREATE OR REPLACE FUNCTION public.insert_saved_cart_for_guest(
  p_guest_id uuid,
  p_short_id text,
  p_items jsonb,
  p_expires_at timestamptz DEFAULT NOW() + INTERVAL '30 days'
)
RETURNS TABLE(id uuid, short_id text, items jsonb, created_at timestamptz, user_id_owner uuid, expires_at timestamptz, guest_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
    SELECT id, short_id, items, created_at, user_id_owner, expires_at, guest_id
    FROM api.insert_saved_cart_for_guest(p_guest_id, p_short_id, p_items, p_expires_at);
END;
$$;

-- Recreate get wrapper
CREATE OR REPLACE FUNCTION public.get_saved_cart_for_guest(
  p_short_id text,
  p_guest_id uuid
)
RETURNS TABLE(id uuid, short_id text, items jsonb, created_at timestamptz, user_id_owner uuid, expires_at timestamptz, guest_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
    SELECT id, short_id, items, created_at, user_id_owner, expires_at, guest_id
    FROM api.get_saved_cart_for_guest(p_short_id, p_guest_id);
END;
$$;

-- Recreate delete wrapper
CREATE OR REPLACE FUNCTION public.delete_saved_cart_for_guest(
  p_short_id text,
  p_guest_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected integer;
BEGIN
  PERFORM set_config('app.guest_id', p_guest_id::text, true);
  DELETE FROM saved_carts WHERE short_id = p_short_id AND guest_id = p_guest_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

COMMIT;

-- After applying, rerun the test script:
-- node .\scripts\test-guest-rpc.mjs
