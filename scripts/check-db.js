import fetch from 'node-fetch';

const SUPABASE_URL = 'https://aawghxjbipcqefmikwby.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhd2doeGpiaXBjcWVmbWlrd2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NjI3NTgsImV4cCI6MjA3ODUzODc1OH0.Ml1sIc2rpkXAh-DuILaNKwFRmI6-COOeZY-HoBILJUw';

async function checkTable() {
  try {
    // Tentar fazer uma query simples para ver se a tabela existe
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/saved_carts?select=id&limit=1`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
      }
    );

    if (response.ok) {
      console.log('✅ Tabela saved_carts já existe!');
      return true;
    } else if (response.status === 404) {
      console.log('❌ Tabela saved_carts não existe.');
      console.log('');
      console.log('📋 Execute este SQL no SQL Editor do Supabase:');
      console.log('');
      console.log(`
-- Criar tabela para pedidos salvos
CREATE TABLE saved_carts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  short_id TEXT UNIQUE NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id_owner UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Índices para performance
CREATE INDEX idx_saved_carts_short_id ON saved_carts(short_id);
CREATE INDEX idx_saved_carts_expires_at ON saved_carts(expires_at);

-- Habilitar RLS
ALTER TABLE saved_carts ENABLE ROW LEVEL SECURITY;

-- Políticas para pedidos de convidados (sem user_id_owner)
CREATE POLICY "Anyone can view guest saved carts by short_id (owner)" ON saved_carts
  FOR SELECT USING (user_id_owner IS NULL);

CREATE POLICY "Anyone can insert guest saved carts (owner)" ON saved_carts
  FOR INSERT WITH CHECK (user_id_owner IS NULL);

-- Políticas para usuários logados
CREATE POLICY "Users can view own saved carts (owner)" ON saved_carts
  FOR SELECT USING (auth.uid() = user_id_owner);

CREATE POLICY "Users can insert own saved carts (owner)" ON saved_carts
  FOR INSERT WITH CHECK (auth.uid() = user_id_owner);
      `);
      return false;
    } else {
      console.error('Erro inesperado:', response.status, await response.text());
      return false;
    }
  } catch (error) {
    console.error('Erro ao verificar tabela:', error);
    return false;
  }
}

checkTable();
