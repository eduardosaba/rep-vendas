-- Migration: Renomear colunas da tabela saved_carts
-- Objetivo: padronizar para `items` e `user_id_owner` (substitui `cart_items` e `user_id`)
-- Esta migration tenta ser idempotente: só roda as alterações se as colunas/ políticas existirem.

DO $$
BEGIN
  -- Renomear coluna cart_items -> items se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='saved_carts' AND column_name='cart_items'
  ) THEN
    ALTER TABLE saved_carts RENAME COLUMN cart_items TO items;
  END IF;

  -- Renomear coluna user_id -> user_id_owner se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='saved_carts' AND column_name='user_id'
  ) THEN
    ALTER TABLE saved_carts RENAME COLUMN user_id TO user_id_owner;
  END IF;

  -- Atualizar policies: remover políticas antigas que referenciam user_id
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_carts' AND policyname='Users can view own saved carts') THEN
    DROP POLICY "Users can view own saved carts" ON saved_carts;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_carts' AND policyname='Users can insert own saved carts') THEN
    DROP POLICY "Users can insert own saved carts" ON saved_carts;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_carts' AND policyname='Users can update own saved carts') THEN
    DROP POLICY "Users can update own saved carts" ON saved_carts;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_carts' AND policyname='Users can delete own saved carts') THEN
    DROP POLICY "Users can delete own saved carts" ON saved_carts;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_carts' AND policyname='Anyone can view guest saved carts by short_id') THEN
    DROP POLICY "Anyone can view guest saved carts by short_id" ON saved_carts;
  END IF;

  -- Recriar políticas atualizadas usando user_id_owner
  -- Garantir que não existam políticas com o mesmo nome antes de criar
  PERFORM 1;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_carts' AND policyname='Users can view own saved carts (owner)') THEN
    EXECUTE 'DROP POLICY "Users can view own saved carts (owner)" ON saved_carts';
  END IF;
DROP POLICY IF EXISTS "Users can view own saved carts (owner)" ON saved_carts;
  CREATE POLICY "Users can view own saved carts (owner)" ON saved_carts
    FOR SELECT USING (auth.uid() = user_id_owner);

  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_carts' AND policyname='Users can insert own saved carts (owner)') THEN
    EXECUTE 'DROP POLICY "Users can insert own saved carts (owner)" ON saved_carts';
  END IF;
DROP POLICY IF EXISTS "Users can insert own saved carts (owner)" ON saved_carts;
  CREATE POLICY "Users can insert own saved carts (owner)" ON saved_carts
    FOR INSERT WITH CHECK (auth.uid() = user_id_owner);

  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_carts' AND policyname='Users can update own saved carts (owner)') THEN
    EXECUTE 'DROP POLICY "Users can update own saved carts (owner)" ON saved_carts';
  END IF;
DROP POLICY IF EXISTS "Users can update own saved carts (owner)" ON saved_carts;
  CREATE POLICY "Users can update own saved carts (owner)" ON saved_carts
    FOR UPDATE USING (auth.uid() = user_id_owner);

  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_carts' AND policyname='Users can delete own saved carts (owner)') THEN
    EXECUTE 'DROP POLICY "Users can delete own saved carts (owner)" ON saved_carts';
  END IF;
DROP POLICY IF EXISTS "Users can delete own saved carts (owner)" ON saved_carts;
  CREATE POLICY "Users can delete own saved carts (owner)" ON saved_carts
    FOR DELETE USING (auth.uid() = user_id_owner);

  -- Política para carrinhos de convidados (sem owner)
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saved_carts' AND policyname='Anyone can view guest saved carts by short_id (owner)') THEN
    EXECUTE 'DROP POLICY "Anyone can view guest saved carts by short_id (owner)" ON saved_carts';
  END IF;
DROP POLICY IF EXISTS "Anyone can view guest saved carts by short_id (owner)" ON saved_carts;
  CREATE POLICY "Anyone can view guest saved carts by short_id (owner)" ON saved_carts
    FOR SELECT USING (user_id_owner IS NULL);

  -- Se desejar, atualizar índices (mantém idx_saved_carts_short_id)
  -- Garantir que a coluna items exista quando nova instalação
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='saved_carts' AND column_name='items'
  ) THEN
    -- Se items não existe, criar com copy de cart_items caso exista (fallback already handled), mas aqui apenas adicionar coluna vazia
    ALTER TABLE saved_carts ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Se user_id_owner não existe, criar (não sobrescreve dados existentes)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='saved_carts' AND column_name='user_id_owner'
  ) THEN
    ALTER TABLE saved_carts ADD COLUMN IF NOT EXISTS user_id_owner UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

END$$;

-- Nota: após rodar esta migration, remova/arquive referências antigas no código.
