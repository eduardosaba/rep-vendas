import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Supabase URL ou Service Role Key ausentes no .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('🔄 Atualizando a coluna price_on_request no Supabase...');

  // 1. Atualiza produtos com price > 0 para price_on_request = false
  const { data: updatedFalse, error: errFalse } = await supabase
    .from('products')
    .update({ price_on_request: false })
    .gt('price', 0)
    .eq('price_on_request', true)
    .select('id');

  if (errFalse) {
    console.error('❌ Erro ao zerar price_on_request para preços > 0:', errFalse);
  } else {
    console.log(`✅ ${updatedFalse?.length || 0} produtos com preço > 0 tiveram price_on_request corrigido para false.`);
  }

  // 2. Atualiza produtos com price <= 0 para price_on_request = true
  const { data: updatedTrue, error: errTrue } = await supabase
    .from('products')
    .update({ price_on_request: true })
    .lte('price', 0)
    .or('price_on_request.is.null,price_on_request.eq.false')
    .select('id');

  if (errTrue) {
    console.error('❌ Erro ao marcar price_on_request para preços <= 0:', errTrue);
  } else {
    console.log(`✅ ${updatedTrue?.length || 0} produtos com preço <= 0 tiveram price_on_request definido como true.`);
  }

  console.log('🎉 Atualização de banco de dados concluída!');
}

run();
