import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

async function main() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`🔍 Buscando produtos importados hoje (${today})...`);

  const { data: products, error } = await supabase
    .from('products')
    .select('id, reference_code, reference_id, name')
    .gte('created_at', `${today}T00:00:00.000Z`);

  if (error) {
    console.error('Erro ao buscar produtos:', error);
    return;
  }

  console.log(`📦 Encontrados ${products.length} produtos importados hoje.`);
  let updatedCount = 0;

  for (const p of products) {
    const refCode = String(p.reference_code || p.name || '').trim();
    const parts = refCode.split(/\s+/);
    if (parts.length > 1) {
      const baseModel = parts.slice(0, -1).join(' '); // Ex: "P.C. 8550/C 807" -> "P.C. 8550/C"
      const newRefId = slugify(baseModel);
      if (newRefId && newRefId !== p.reference_id) {
        await supabase
          .from('products')
          .update({ reference_id: newRefId })
          .eq('id', p.id);
        updatedCount++;
      }
    }
  }

  console.log(`✅ ${updatedCount} produtos tiveram suas cores agrupadas por modelo!`);
}

main();
