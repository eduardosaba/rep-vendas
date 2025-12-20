import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Carregar variáveis de ambiente do .env.local
config({ path: './.env.local' });

// Configurações do Supabase (pegue do .env.local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Variáveis de ambiente do Supabase não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createSavedCartsTable() {
  try {
    // Executar o SQL para criar a tabela
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Criar tabela para carrinhos salvos
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
        CREATE POLICY "Users can view own saved carts (owner)" ON saved_carts
          FOR SELECT USING (auth.uid() = user_id_owner);

        -- Política para usuários logados poderem inserir seus próprios carrinhos
        CREATE POLICY "Users can insert own saved carts (owner)" ON saved_carts
          FOR INSERT WITH CHECK (auth.uid() = user_id_owner);

        -- Política para usuários logados poderem atualizar seus próprios carrinhos
        CREATE POLICY "Users can update own saved carts (owner)" ON saved_carts
          FOR UPDATE USING (auth.uid() = user_id_owner);

        -- Política para usuários logados poderem deletar seus próprios carrinhos
        CREATE POLICY "Users can delete own saved carts (owner)" ON saved_carts
          FOR DELETE USING (auth.uid() = user_id_owner);

        -- Política especial para carrinhos de convidados (sem user_id_owner)
        CREATE POLICY "Anyone can view guest saved carts by short_id (owner)" ON saved_carts
          FOR SELECT USING (user_id_owner IS NULL);

        -- Função para limpar carrinhos expirados
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
      `,
    });

    if (error) {
      console.error('Erro ao criar tabela:', error);
      return false;
    }

    console.log('Tabela saved_carts criada com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao executar migração:', error);
    return false;
  }
}

async function addCatalogSlugColumn() {
  console.log('🔄 Verificando se a coluna catalog_slug existe...');

  try {
    // Tentar fazer uma consulta que inclui catalog_slug
    const { data, error } = await supabase
      .from('settings')
      .select('id, catalog_slug')
      .limit(1);

    if (error) {
      // Se houver erro, provavelmente a coluna não existe
      console.log('❌ Coluna catalog_slug não encontrada.');
      console.log('');
      console.log(
        '📋 Para adicionar a coluna catalog_slug, execute o seguinte SQL no SQL Editor do Supabase:'
      );
      console.log('');
      console.log(
        'ALTER TABLE settings ADD COLUMN IF NOT EXISTS catalog_slug TEXT UNIQUE;'
      );
      console.log(
        'CREATE INDEX IF NOT EXISTS idx_settings_catalog_slug ON settings(catalog_slug);'
      );
      console.log('');
      console.log('Ou execute o arquivo: add_catalog_slug_migration.sql');
      return false;
    }

    console.log('✅ Coluna catalog_slug já existe na tabela settings!');
    return true;
  } catch (error) {
    console.log('❌ Erro ao verificar coluna catalog_slug:', error.message);
    console.log('');
    console.log('📋 Execute manualmente o SQL no Supabase SQL Editor:');
    console.log(
      'ALTER TABLE settings ADD COLUMN IF NOT EXISTS catalog_slug TEXT UNIQUE;'
    );
    return false;
  }
}

// Executar apenas se chamado diretamente
console.log('🚀 Iniciando execução do script create-tables.js...');

Promise.all([createSavedCartsTable(), addCatalogSlugColumn()])
  .then((results) => {
    const allSuccess = results.every((result) => result);
    console.log(
      allSuccess
        ? '✅ Todas as migrações executadas com sucesso!'
        : '❌ Algumas migrações falharam'
    );
    process.exit(allSuccess ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Erro fatal durante execução:', error);
    process.exit(1);
  });

export { createSavedCartsTable, addCatalogSlugColumn };
