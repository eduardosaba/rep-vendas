import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Carregar variáveis de ambiente do .env.local
config({ path: './.env.local' });

// Configurações do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Variáveis de ambiente do Supabase não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCatalogSlugColumn() {
  try {
    // Tentar fazer uma consulta simples para ver se a coluna existe
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Erro ao consultar tabela settings:', error.message);
      return false;
    }

    if (data && data.length > 0) {
      const firstRow = data[0];
      const hasCatalogSlug = 'catalog_slug' in firstRow;

      if (hasCatalogSlug) {
        console.log('✅ Coluna catalog_slug existe na tabela settings!');
        console.log('Valor atual:', firstRow.catalog_slug);
        return true;
      } else {
        console.log('❌ Coluna catalog_slug NÃO existe na tabela settings');
        console.log('Colunas disponíveis:', Object.keys(firstRow));
        return false;
      }
    } else {
      console.log('Tabela settings está vazia');
      return false;
    }
  } catch (error) {
    console.error('Erro ao executar verificação:', error);
    return false;
  }
}

// Executar apenas se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  checkCatalogSlugColumn()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch(() => process.exit(1));
}
