-- 2025-12-12: Adicionar suporte a guest carts (guest_id) + RLS + RPC helpers
-- Aplicar em staging primeiro. Faça backup do DB antes de aplicar.

BEGIN;

-- 1) Adicionar coluna `guest_id` em saved_carts (se não existir)
ALTER TABLE saved_carts
  ADD COLUMN IF NOT EXISTS guest_id UUID;

-- 2) Índice para consultas por guest_id
CREATE INDEX IF NOT EXISTS idx_saved_carts_guest_id ON saved_carts(guest_id);

-- 3) Atualizar políticas RLS para permitir ações quando o GUC `app.guest_id` corresponder
DROP POLICY IF EXISTS "Users can view own saved carts (owner)" ON saved_carts;
CREATE POLICY "Users can view own saved carts (owner)" ON saved_carts
  FOR SELECT USING (
    auth.uid() = user_id_owner
    OR (guest_id IS NOT NULL AND current_setting('app.guest_id', true) = guest_id::text)
  );

DROP POLICY IF EXISTS "Users can insert own saved carts (owner)" ON saved_carts;
CREATE POLICY "Users can insert own saved carts (owner)" ON saved_carts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id_owner
    OR current_setting('app.guest_id', true) = COALESCE(guest_id::text, '')
  );

DROP POLICY IF EXISTS "Users can update own saved carts (owner)" ON saved_carts;
CREATE POLICY "Users can update own saved carts (owner)" ON saved_carts
  FOR UPDATE USING (
    auth.uid() = user_id_owner
    OR (guest_id IS NOT NULL AND current_setting('app.guest_id', true) = guest_id::text)
  ) WITH CHECK (
    auth.uid() = user_id_owner
    OR current_setting('app.guest_id', true) = COALESCE(guest_id::text, '')
  );

DROP POLICY IF EXISTS "Users can delete own saved carts (owner)" ON saved_carts;
CREATE POLICY "Users can delete own saved carts (owner)" ON saved_carts
  FOR DELETE USING (
    auth.uid() = user_id_owner
    OR (guest_id IS NOT NULL AND current_setting('app.guest_id', true) = guest_id::text)
  );

-- Remover a política pública por user_id_owner IS NULL (se você preferir manter, comente as próximas duas linhas)
DROP POLICY IF EXISTS "Anyone can view guest saved carts by short_id (owner)" ON saved_carts;

-- 4) Criar schema `api` se não existir (para agrupar RPCs)
CREATE SCHEMA IF NOT EXISTS api;

-- 5) Função RPC para inserir/atualizar um saved_cart em nome do guest
CREATE OR REPLACE FUNCTION api.insert_saved_cart_for_guest(
  p_guest_id uuid,
  p_short_id text,
  p_items jsonb,
  p_expires_at timestamptz DEFAULT NOW() + INTERVAL '30 days'
)
RETURNS saved_carts
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  res saved_carts%ROWTYPE;
BEGIN
  -- Define o GUC local para que as policies que leem current_setting() vejam o guest_id
  PERFORM set_config('app.guest_id', p_guest_id::text, true);

  INSERT INTO saved_carts (guest_id, short_id, items, expires_at)
  VALUES (p_guest_id, p_short_id, p_items, p_expires_at)
  ON CONFLICT (short_id) DO UPDATE
    SET items = EXCLUDED.items,
        expires_at = EXCLUDED.expires_at,
        guest_id = EXCLUDED.guest_id
  RETURNING * INTO res;

  RETURN res;
END;
$$;

-- 6) Função RPC para obter um saved_cart do guest
CREATE OR REPLACE FUNCTION api.get_saved_cart_for_guest(
  p_short_id text,
  p_guest_id uuid
)
RETURNS TABLE(id uuid, short_id text, items jsonb, created_at timestamptz, user_id_owner uuid, expires_at timestamptz, guest_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.guest_id', p_guest_id::text, true);
  RETURN QUERY
    SELECT id, short_id, items, created_at, user_id_owner, expires_at, guest_id
    FROM saved_carts
    WHERE short_id = p_short_id AND guest_id = p_guest_id
    LIMIT 1;
END;
$$;

-- 7) Função para deletar cart de guest (opcional)
CREATE OR REPLACE FUNCTION api.delete_saved_cart_for_guest(p_short_id text, p_guest_id uuid)
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

-- Instruções de aplicação (resumo):
-- 1) Fazer backup do banco (pg_dump) antes de aplicar.
-- 2) Aplicar esta migração em staging e validar os fluxos de "Salvar Carrinho" e "Carregar Carrinho" para usuários autenticados e para guests.
-- 3) No frontend: gerar um `guest_id` (UUID) e armazenar em localStorage; usar `supabase.rpc('api.insert_saved_cart_for_guest', { p_guest_id: guestId, p_short_id: shortId, p_items: items })` para salvar; usar `supabase.rpc('api.get_saved_cart_for_guest', { p_short_id: shortId, p_guest_id: guestId })` para carregar.
-- 4) Após validação, aplicar em produção durante janela de manutenção.
