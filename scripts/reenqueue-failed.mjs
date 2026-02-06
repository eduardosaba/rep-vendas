#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('brand', { type: 'string', description: 'Filtrar por brand' })
  .option('limit', {
    type: 'number',
    description: 'Limitar número de produtos',
  })
  .option('dry-run', {
    type: 'boolean',
    default: false,
    description: 'Não aplica mudanças, só mostra',
  })
  .help()
  .parseSync();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env'
  );
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log(
    'Buscando produtos com sync_status=failed' +
      (argv.brand ? ` (brand=${argv.brand})` : '') +
      '...'
  );

  let q = supabase
    .from('products')
    .select('id,name,brand,image_url')
    .eq('sync_status', 'failed');
  if (argv.brand) q = q.ilike('brand', `%${argv.brand}%`);
  if (argv.limit) q = q.limit(argv.limit);

  const { data: prods, error } = await q;
  if (error) {
    console.error('Erro ao buscar produtos:', error.message || error);
    process.exit(1);
  }
  if (!prods || prods.length === 0) {
    console.log('Nenhum produto failed encontrado. Saindo.');
    return;
  }

  console.log(`Encontrados ${prods.length} produtos failed.`);

  let requeued = 0;
  let createdImages = 0;

  for (const p of prods) {
    try {
      // Verificar se existem product_images para o produto
      const { data: imgs = [], error: imgErr } = await supabase
        .from('product_images')
        .select('id,url,storage_path,sync_status')
        .eq('product_id', p.id)
        .limit(1000);
      if (imgErr) throw imgErr;

      if (argv['dry-run']) {
        console.log(
          `[dry-run] Produto ${p.id} (${p.name}) tem ${imgs.length} product_images`
        );
      } else {
        if (imgs.length === 0 && p.image_url) {
          // criar uma product_images a partir de image_url
          const { error: insErr } = await supabase
            .from('product_images')
            .insert({
              product_id: p.id,
              url: p.image_url,
              sync_status: 'pending',
              created_at: new Date().toISOString(),
            });
          if (insErr) {
            console.error(
              `Erro ao criar product_images para ${p.id}:`,
              insErr.message || insErr
            );
          } else {
            createdImages += 1;
            console.log(
              `Criada product_images a partir de image_url para ${p.id}`
            );
          }
        } else if (imgs.length > 0) {
          // atualizar todas as product_images não-synced para pending
          const { error: updErr } = await supabase
            .from('product_images')
            .update({ sync_status: 'pending', sync_error: null })
            .eq('product_id', p.id)
            .neq('sync_status', 'synced');
          if (updErr) {
            console.error(
              `Erro ao atualizar product_images para ${p.id}:`,
              updErr.message || updErr
            );
          }
        }

        // marcar produto como pending
        const { error: prodErr } = await supabase
          .from('products')
          .update({ sync_status: 'pending', sync_error: null })
          .eq('id', p.id);
        if (prodErr) {
          console.error(
            `Erro ao atualizar produto ${p.id}:`,
            prodErr.message || prodErr
          );
        } else {
          requeued += 1;
          console.log(`Produto ${p.id} marcado como pending`);
        }
      }
    } catch (e) {
      console.error('Erro no produto', p.id, e.message || e);
    }
  }

  console.log(
    `Resumo: requeued=${requeued} createdImages=${createdImages} (dry-run=${argv['dry-run']})`
  );
}

run().catch((e) => {
  console.error('Falha:', e.message || e);
  process.exit(1);
});
