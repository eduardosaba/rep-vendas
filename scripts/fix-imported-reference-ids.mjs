import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { extractBaseReferenceFromCode, cleanReferenceId } from '../src/lib/utils/reference-logic.ts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

async function main() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`🔍 Buscando produtos importados hoje (${today})...`);

  const { data: products, error } = await supabase
    .from('products')
    .select('id, reference_code, reference_id, color, name')
    .gte('created_at', `${today}T00:00:00.000Z`);

  if (error) {
    console.error('Erro ao buscar produtos:', error);
    return;
  }

  console.log(`📦 Encontrados ${products.length} produtos importados hoje.`);
  let updatedCount = 0;

  for (const p of products) {
    const refCode = String(p.reference_code || p.name || '').trim();
    const newRefId = extractBaseReferenceFromCode(refCode, p.color);
    if (newRefId && newRefId !== p.reference_id) {
      await supabase
        .from('products')
        .update({ reference_id: newRefId })
        .eq('id', p.id);
      updatedCount++;
    }
  }

  console.log(`✅ ${updatedCount} produtos tiveram suas referências base (reference_id) corrigidas sem hífens!`);
}

main();
