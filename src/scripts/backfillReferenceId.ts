import { createClient } from '@/lib/supabase/client';

async function run() {
  const supabase = createClient();

  // Buscar produtos sem reference_id
  const { data: products, error } = await supabase
    .from('products')
    .select('id, reference_id, reference_code, name')
    .is('reference_id', null)
    .limit(1000);

  if (error) {
    console.error('Erro ao buscar produtos:', error);
    process.exit(1);
  }

  const productsList = (products as any[]) || [];
  if (!productsList || productsList.length === 0) {
    console.log('Nenhum produto para atualizar.');
    return;
  }

  // Preencher reference_id baseado em reference_code ou slug do name
  const toUpdate: any[] = productsList.map((p: any) => {
    const ref = p.reference_code || slugify(p.name || p.id || '') || p.id;
    return { id: p.id, reference_id: ref };
  });

  // Atualizar em batch usando upsert
  const { data: upsertRes, error: upsertErr } = await supabase
    .from('products')
    .upsert(toUpdate, { onConflict: 'id' });

  if (upsertErr) {
    console.error('Erro ao atualizar reference_id:', upsertErr);
    process.exit(1);
  }

  const upsertResAny: any = upsertRes;
  const upsertCount = Array.isArray(upsertResAny) ? upsertResAny.length : toUpdate.length;
  console.log('Atualizados', upsertCount, 'produtos');
}

function slugify(str: string) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

if (require.main === module) {
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
