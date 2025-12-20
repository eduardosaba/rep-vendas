-- Criar tabela para carrinhos salvos
-- Permite aos usuários salvarem seus carrinhos e recuperá-los depois

CREATE TABLE IF NOT EXISTS saved_carts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  short_id TEXT UNIQUE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id_owner UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Índice para busca rápida por short_id
CREATE INDEX IF NOT EXISTS idx_saved_carts_short_id ON saved_carts(short_id);

-- Índice para limpeza de carrinhos expirados
CREATE INDEX IF NOT EXISTS idx_saved_carts_expires_at ON saved_carts(expires_at);

-- RLS (Row Level Security)
ALTER TABLE saved_carts ENABLE ROW LEVEL SECURITY;

-- Política para usuários logados poderem ver apenas seus próprios carrinhos
-- Garantir políticas idempotentes: dropar se existirem antes de criar
DROP POLICY IF EXISTS "Users can view own saved carts (owner)" ON saved_carts;
CREATE POLICY "Users can view own saved carts (owner)" ON saved_carts
  FOR SELECT USING (auth.uid() = user_id_owner);

DROP POLICY IF EXISTS "Users can insert own saved carts (owner)" ON saved_carts;
CREATE POLICY "Users can insert own saved carts (owner)" ON saved_carts
  FOR INSERT WITH CHECK (auth.uid() = user_id_owner);

DROP POLICY IF EXISTS "Users can update own saved carts (owner)" ON saved_carts;
CREATE POLICY "Users can update own saved carts (owner)" ON saved_carts
  FOR UPDATE USING (auth.uid() = user_id_owner);

DROP POLICY IF EXISTS "Users can delete own saved carts (owner)" ON saved_carts;
CREATE POLICY "Users can delete own saved carts (owner)" ON saved_carts
  FOR DELETE USING (auth.uid() = user_id_owner);

-- Política especial para carrinhos de convidados (sem user_id_owner)
-- Permite que qualquer pessoa veja carrinhos sem user_id_owner (usando short_id)
DROP POLICY IF EXISTS "Anyone can view guest saved carts by short_id (owner)" ON saved_carts;
CREATE POLICY "Anyone can view guest saved carts by short_id (owner)" ON saved_carts
  FOR SELECT USING (user_id_owner IS NULL);

-- Função para limpar carrinhos expirados (pode ser chamada por um cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_carts()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM saved_carts
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;