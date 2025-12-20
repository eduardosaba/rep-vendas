-- 2025-12-12: Criar wrappers públicos para RPCs guest -> chamam funções no schema api
-- Garante compatibilidade com PostgREST/Supabase RPC naming (public.*)

BEGIN;

-- Wrapper para inserir/atualizar saved_cart via guest
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
  -- delega para api.insert_saved_cart_for_guest
  RETURN QUERY
    SELECT id, short_id, items, created_at, user_id_owner, expires_at, guest_id
    FROM api.insert_saved_cart_for_guest(p_guest_id, p_short_id, p_items, p_expires_at);
END;
$$;

-- Wrapper para buscar saved_cart do guest
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

-- Wrapper para deletar saved_cart do guest
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

-- Instruções:
-- Após aplicar, execute novamente o script de teste:
-- node .\scripts\test-guest-rpc.mjs
